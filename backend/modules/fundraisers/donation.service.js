const crypto = require('crypto');
const { pool } = require('../../config/database');
const fundraiserRepository = require('./fundraiser.repository');
const createTransaction = require('../../shared/transactions/createTransaction');
const { sendDonationEmail } = require('../../shared/email/email.service');
const outboxService = require('../../shared/outbox/outbox.service');
const auditService = require('../../shared/audit/audit.service');

/**
 * Donation Service
 * Manages guest and authenticated donation checkout, transactional payments,
 * ledger synchronization, outbox event generation, refunds, and webhooks.
 */
class DonationService {
  /**
   * Validates an email address.
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Initiates a pending donation checkout session.
   * Supports both guest and authenticated donors with idempotency key protection.
   */
  async checkoutDonation(fundraiserId, donationData, userId = null, idempotencyKey = null, req = null) {
    const parsedFundraiserId = parseInt(fundraiserId, 10);
    if (isNaN(parsedFundraiserId)) {
      const err = new Error('Invalid fundraiser ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    // 1. Verify fundraiser campaign
    const fundraiser = await fundraiserRepository.getFundraiserByIdOrSlug(parsedFundraiserId);
    if (!fundraiser) {
      const err = new Error('Fundraiser not found');
      err.code = 'FUNDRAISER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (fundraiser.status !== 'active') {
      const err = new Error(`Cannot donate to a campaign with status: ${fundraiser.status}`);
      err.code = 'FUNDRAISER_INACTIVE';
      err.status = 400;
      throw err;
    }

    if (fundraiser.end_at && new Date(fundraiser.end_at) < new Date()) {
      const err = new Error('This fundraiser campaign has ended and is no longer accepting donations');
      err.code = 'FUNDRAISER_EXPIRED';
      err.status = 400;
      throw err;
    }

    // 2. Validate Amount
    const amount = parseFloat(donationData.amount);
    if (isNaN(amount) || amount <= 0) {
      const err = new Error('Donation amount must be a positive number greater than zero');
      err.code = 'INVALID_AMOUNT';
      err.status = 400;
      throw err;
    }

    if (amount > 1000000) {
      const err = new Error('Donation amount exceeds the maximum single transaction limit (₹1,000,000)');
      err.code = 'AMOUNT_EXCEEDS_LIMIT';
      err.status = 400;
      throw err;
    }

    // 3. Validate Donor Information
    const donorName = donationData.donor_name || donationData.name;
    const donorEmail = donationData.donor_email || donationData.email;
    const donorPhone = donationData.donor_phone || donationData.phone || donationData.mobile;

    if (!donorName || !donorName.trim()) {
      const err = new Error('Donor Full Name is required');
      err.code = 'MISSING_DONOR_NAME';
      err.status = 400;
      throw err;
    }

    if (!donorEmail || !this.isValidEmail(donorEmail)) {
      const err = new Error('A valid donor email address is required for receipt delivery');
      err.code = 'INVALID_DONOR_EMAIL';
      err.status = 400;
      throw err;
    }

    if (!donorPhone || !donorPhone.trim() || donorPhone.trim().length < 7) {
      const err = new Error('A valid donor phone number is required');
      err.code = 'INVALID_DONOR_PHONE';
      err.status = 400;
      throw err;
    }

    // 4. Idempotency Check
    const cleanIdempotencyKey = idempotencyKey || donationData.idempotency_key || null;
    if (cleanIdempotencyKey) {
      const existing = await fundraiserRepository.getDonationByIdempotencyKey(cleanIdempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // 5. Generate Opaque Public ID formatted as DON-<timestamp>-<hex>
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const publicId = `DON-${Date.now()}-${randomHex}`;

    const created = await fundraiserRepository.createDonation({
      public_id: publicId,
      fundraiser_id: parsedFundraiserId,
      user_id: userId || null,
      donor_name: donorName.trim(),
      donor_email: donorEmail.trim().toLowerCase(),
      donor_phone: donorPhone.trim(),
      amount,
      currency: donationData.currency || fundraiser.currency || 'INR',
      status: 'pending',
      anonymous: Boolean(donationData.anonymous),
      message: donationData.message ? donationData.message.trim() : null,
      payment_provider: donationData.payment_provider || 'online',
      payment_reference: null,
      idempotency_key: cleanIdempotencyKey,
    });

    // Audit log
    await auditService.recordLog({
      actorId: userId,
      action: 'DONATION_STARTED',
      entityType: 'donation',
      entityId: created.id,
      newValue: {
        public_id: created.public_id,
        fundraiser_id: created.fundraiser_id,
        amount: created.amount,
        anonymous: created.anonymous,
      },
      metadata: { donor_email: donorEmail.trim().toLowerCase() },
      req,
    });

    return {
      ...created,
      fundraiser_title: fundraiser.title,
    };
  }

  /**
   * Processes a successful payment for a donation atomically.
   * Decrements nothing, marks donation PAID, inserts ledger transaction, and sends receipt.
   */
  async payDonation(donationIdOrPublicId, paymentDetails = {}, userId = null, req = null) {
    const client = await pool.connect();
    let paidDonation = null;
    let paymentRef = null;

    try {
      await client.query('BEGIN');

      // 1. Fetch donation by ID or public_id with FOR UPDATE lock
      const isNum = !isNaN(parseInt(donationIdOrPublicId, 10)) && /^\d+$/.test(String(donationIdOrPublicId));
      let initialDonation = null;

      if (isNum) {
        initialDonation = await fundraiserRepository.getDonationByIdForUpdate(parseInt(donationIdOrPublicId, 10), client);
      } else {
        const lookup = await fundraiserRepository.getDonationById(donationIdOrPublicId, client);
        if (lookup) {
          initialDonation = await fundraiserRepository.getDonationByIdForUpdate(lookup.id, client);
        }
      }

      if (!initialDonation) {
        const err = new Error('Donation record not found');
        err.code = 'DONATION_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (initialDonation.status === 'paid') {
        await client.query('COMMIT');
        return initialDonation;
      }

      if (initialDonation.status === 'cancelled' || initialDonation.status === 'refunded') {
        const err = new Error(`Cannot pay for donation in status: ${initialDonation.status}`);
        err.code = 'INVALID_DONATION_STATE';
        err.status = 400;
        throw err;
      }

      // Generate or reuse payment reference
      paymentRef = paymentDetails.payment_reference ||
                   paymentDetails.razorpay_payment_id ||
                   `PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // 2. Mark donation as PAID
      paidDonation = await fundraiserRepository.markDonationPaid(initialDonation.id, paymentRef, client);

      // 3. Register Ledger Inflow Transaction (strictly 1 immutable ledger entry)
      await createTransaction({
        source_type: 'donation',
        source_id: paidDonation.id,
        user_id: paidDonation.user_id || null,
        amount: paidDonation.amount,
        direction: 'in',
        payment_mode: paymentDetails.payment_mode || 'online',
        status: 'paid',
      }, client);

      // 4. Enqueue Outbox Event for async decoupled handling
      if (paidDonation.user_id) {
        await outboxService.enqueueEvent({
          eventType: 'DONATION_SUCCESSFUL',
          aggregateType: 'donation',
          aggregateId: paidDonation.id,
          payload: {
            userId: paidDonation.user_id,
            title: 'Donation Confirmed!',
            message: `Thank you! Your donation of ₹${paidDonation.amount} to "${initialDonation.fundraiser_title}" was successful.`,
            donationId: paidDonation.id,
            publicId: paidDonation.public_id,
            amount: paidDonation.amount,
          },
        }, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 5. Post-transaction tasks: Audit log & Email Delivery
    // Note: Database state is committed; secondary notification errors do not abort payment
    try {
      await auditService.recordLog({
        actorId: userId || paidDonation.user_id,
        action: 'DONATION_PAYMENT_SUCCEEDED',
        entityType: 'donation',
        entityId: paidDonation.id,
        newValue: {
          status: 'paid',
          amount: paidDonation.amount,
          payment_reference: paymentRef,
        },
        metadata: {
          public_id: paidDonation.public_id,
          fundraiser_id: paidDonation.fundraiser_id,
        },
        req,
      });

      // Dispatch donation receipt email
      const fullDonation = await fundraiserRepository.getDonationById(paidDonation.id);
      await sendDonationEmail({
        recipientEmail: fullDonation.donor_email,
        donorName: fullDonation.donor_name,
        fundraiserTitle: fullDonation.fundraiser_title,
        amount: fullDonation.amount,
        currency: fullDonation.currency,
        donationReference: fullDonation.public_id,
        paymentStatus: 'Paid',
        date: fullDonation.paid_at || new Date(),
        anonymous: fullDonation.anonymous,
      });

      return fullDonation;
    } catch (postErr) {
      console.warn('[POST-PAYMENT WARNING] Secondary notification failure:', postErr.message);
      return await fundraiserRepository.getDonationById(paidDonation.id);
    }
  }

  /**
   * Marks a donation payment as failed.
   */
  async failDonation(donationIdOrPublicId, failureReason = null, req = null) {
    const donation = await fundraiserRepository.getDonationById(donationIdOrPublicId);
    if (!donation) {
      const err = new Error('Donation not found');
      err.code = 'DONATION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (donation.status === 'paid') {
      const err = new Error('Cannot fail an already paid donation');
      err.code = 'INVALID_STATE';
      err.status = 400;
      throw err;
    }

    const updated = await fundraiserRepository.markDonationFailed(donation.id);

    await auditService.recordLog({
      actorId: donation.user_id,
      action: 'DONATION_PAYMENT_FAILED',
      entityType: 'donation',
      entityId: donation.id,
      newValue: { status: 'payment_failed', reason: failureReason },
      metadata: { public_id: donation.public_id },
      req,
    });

    return updated;
  }

  /**
   * Refunds a donation (Admin / Treasurer only).
   */
  async refundDonation(donationId, reason, actorUser, req = null) {
    const client = await pool.connect();
    let refundedDonation = null;

    try {
      await client.query('BEGIN');

      const donation = await fundraiserRepository.getDonationByIdForUpdate(parseInt(donationId, 10), client);
      if (!donation) {
        const err = new Error('Donation not found');
        err.code = 'DONATION_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (donation.status !== 'paid') {
        const err = new Error(`Cannot refund a donation in status: ${donation.status}`);
        err.code = 'INVALID_STATUS_FOR_REFUND';
        err.status = 400;
        throw err;
      }

      // Mark donation as refunded
      refundedDonation = await fundraiserRepository.refundDonation(
        donation.id,
        donation.amount,
        reason || 'Administrative refund requested',
        actorUser?.id || null,
        client
      );

      // Register Ledger Outflow / Refund transaction
      await createTransaction({
        source_type: 'fundraiser_refund',
        source_id: donation.id,
        user_id: donation.user_id || null,
        amount: donation.amount,
        direction: 'out',
        payment_mode: 'online',
        status: 'paid',
      }, client);

      // Enqueue Outbox event if user exists
      if (donation.user_id) {
        await outboxService.enqueueEvent({
          eventType: 'DONATION_REFUNDED',
          aggregateType: 'donation',
          aggregateId: donation.id,
          payload: {
            userId: donation.user_id,
            title: 'Donation Refunded',
            message: `Your donation of ₹${donation.amount} for "${donation.fundraiser_title}" has been refunded.`,
            donationId: donation.id,
            publicId: donation.public_id,
            amount: donation.amount,
          },
        }, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Audit log
    await auditService.recordLog({
      actorId: actorUser?.id,
      action: 'DONATION_REFUNDED',
      entityType: 'donation',
      entityId: refundedDonation.id,
      oldValue: { status: 'paid' },
      newValue: {
        status: 'refunded',
        refund_amount: refundedDonation.refund_amount,
        refund_reason: reason,
      },
      metadata: { public_id: refundedDonation.public_id },
      req,
    });

    return refundedDonation;
  }

  /**
   * Handles payment provider webhook events (e.g. Razorpay / Stripe).
   */
  async handleWebhook(eventPayload, signature = null, req = null) {
    const event = eventPayload.event || eventPayload.type || '';
    const payment = eventPayload.payload?.payment?.entity || eventPayload.data?.object || eventPayload;

    const paymentId = payment.id || payment.payment_id;
    const notes = payment.notes || {};
    const donationPublicId = notes.donation_public_id || payment.description;

    if (!donationPublicId) {
      return { status: 'ignored', reason: 'No donation reference found in webhook payload' };
    }

    const donation = await fundraiserRepository.getDonationById(donationPublicId);
    if (!donation) {
      return { status: 'not_found', reference: donationPublicId };
    }

    if (event === 'payment.captured' || event === 'charge.succeeded' || event === 'payment_intent.succeeded') {
      const result = await this.payDonation(donation.id, {
        payment_reference: paymentId || `WH-${Date.now()}`,
        payment_mode: 'online',
      }, null, req);
      return { status: 'processed', action: 'paid', donation: result };
    }

    if (event === 'payment.failed' || event === 'charge.failed') {
      const result = await this.failDonation(donation.id, payment.error_description || 'Webhook failure', req);
      return { status: 'processed', action: 'failed', donation: result };
    }

    if (event === 'refund.processed' || event === 'charge.refunded') {
      const result = await this.refundDonation(donation.id, 'Provider webhook refund', null, req);
      return { status: 'processed', action: 'refunded', donation: result };
    }

    return { status: 'unhandled_event', event };
  }

  /**
   * Retrieves single donation details for donor receipt / verification.
   */
  async getDonationDetails(idOrPublicId, user = null) {
    const donation = await fundraiserRepository.getDonationById(idOrPublicId);
    if (!donation) {
      const err = new Error('Donation not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Security check: if donation belongs to user and another non-admin user requests it
    if (user && donation.user_id && donation.user_id !== user.id && !['admin', 'treasurer'].includes(user.role)) {
      const err = new Error('Access denied to this donation record');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }

    return donation;
  }

  /**
   * Retrieves user's personal donation history.
   */
  async getUserDonations(userId) {
    return await fundraiserRepository.getDonationsByUserId(userId);
  }

  /**
   * Retrieves administrative paginated donation table.
   */
  async getAdminDonations(filters = {}) {
    return await fundraiserRepository.getAdminDonations(filters);
  }
}

module.exports = new DonationService();
