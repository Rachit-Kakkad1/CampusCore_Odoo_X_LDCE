const crypto = require('crypto');
const fundraiserRepository = require('./fundraiser.repository');
const auditService = require('../../shared/audit/audit.service');

/**
 * Fundraiser Service
 * Handles campaign management, authorization, business validations, and auditing.
 */
class FundraiserService {
  /**
   * Generates a unique, URL-safe slug from campaign title.
   */
  generateSlug(title) {
    const baseSlug = (title || 'campaign')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex');
    return `${baseSlug}-${randSuffix}`;
  }

  /**
   * Retrieves public fundraisers (only active, completed, paused).
   */
  async getPublicFundraisers(filters = {}) {
    return await fundraiserRepository.getPublicFundraisers(filters);
  }

  /**
   * Retrieves all fundraisers for admin/treasurer view with deep breakdown.
   */
  async getAdminFundraisers(filters = {}) {
    return await fundraiserRepository.getAdminFundraisers(filters);
  }

  /**
   * Retrieves single fundraiser by ID or slug with public safety checks.
   */
  async getFundraiserDetails(idOrSlug, user = null) {
    const fundraiser = await fundraiserRepository.getFundraiserByIdOrSlug(idOrSlug);
    if (!fundraiser) {
      const err = new Error('Fundraiser campaign not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Restrict draft or cancelled fundraisers to admin/treasurer only
    const isAdmin = user && ['admin', 'treasurer'].includes(user.role);
    if (['draft', 'cancelled'].includes(fundraiser.status) && !isAdmin) {
      const err = new Error('Fundraiser is not publicly accessible');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Fetch recent safe donor list (anonymized if donor requested anonymity)
    const recentDonations = await fundraiserRepository.getPublicRecentDonations(fundraiser.id, 10);

    return {
      ...fundraiser,
      recent_donations: recentDonations,
    };
  }

  /**
   * Creates a new fundraiser campaign (Admin/Treasurer only).
   */
  async createFundraiser(data, creatorUser, req = null) {
    if (!creatorUser || creatorUser.role !== 'admin') {
      const err = new Error('Only administrators have authority to create fundraisers');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }

    if (!data.title || !data.title.trim()) {
      const err = new Error('Fundraiser title is required');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const goalAmount = parseFloat(data.goal_amount);
    if (isNaN(goalAmount) || goalAmount <= 0) {
      const err = new Error('Goal amount must be greater than 0');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const publicId = `FND-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const slug = this.generateSlug(data.title);

    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
    const status = validStatuses.includes(data.status) ? data.status : 'active';

    const created = await fundraiserRepository.createFundraiser({
      public_id: publicId,
      slug,
      title: data.title.trim(),
      short_description: data.short_description ? data.short_description.trim() : null,
      description: data.description ? data.description.trim() : null,
      image_url: data.image_url ? data.image_url.trim() : null,
      goal_amount: goalAmount,
      currency: data.currency || 'INR',
      status,
      start_at: data.start_at ? new Date(data.start_at) : new Date(),
      end_at: data.end_at ? new Date(data.end_at) : null,
      created_by: creatorUser?.id || null,
    });

    // Audit log
    await auditService.recordLog({
      actorId: creatorUser?.id,
      action: 'FUNDRAISER_CREATED',
      entityType: 'fundraiser',
      entityId: created.id,
      newValue: created,
      metadata: { title: created.title, goal: created.goal_amount, public_id: created.public_id },
      req,
    });

    return created;
  }

  /**
   * Updates an existing fundraiser campaign.
   */
  async updateFundraiser(id, data, actorUser, req = null) {
    const existing = await fundraiserRepository.getFundraiserByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Fundraiser not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updatePayload = {};

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.short_description !== undefined) updatePayload.short_description = data.short_description?.trim() || null;
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.image_url !== undefined) updatePayload.image_url = data.image_url?.trim() || null;
    
    if (data.goal_amount !== undefined) {
      const parsedGoal = parseFloat(data.goal_amount);
      if (isNaN(parsedGoal) || parsedGoal <= 0) {
        const err = new Error('Goal amount must be a positive number');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        throw err;
      }
      updatePayload.goal_amount = parsedGoal;
    }

    if (data.status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        const err = new Error(`Invalid status: ${data.status}`);
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        throw err;
      }
      updatePayload.status = data.status;
    }

    if (data.start_at !== undefined) updatePayload.start_at = data.start_at ? new Date(data.start_at) : new Date();
    if (data.end_at !== undefined) updatePayload.end_at = data.end_at ? new Date(data.end_at) : null;

    const updated = await fundraiserRepository.updateFundraiser(existing.id, updatePayload);

    // Audit log
    await auditService.recordLog({
      actorId: actorUser?.id,
      action: 'FUNDRAISER_UPDATED',
      entityType: 'fundraiser',
      entityId: existing.id,
      oldValue: existing,
      newValue: updated,
      metadata: { fields_changed: Object.keys(updatePayload) },
      req,
    });

    return updated;
  }

  /**
   * Transitions fundraiser status (publish/pause/complete/cancel).
   */
  async setStatus(id, newStatus, actorUser, req = null) {
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      const err = new Error(`Invalid status: ${newStatus}`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }

    const existing = await fundraiserRepository.getFundraiserByIdOrSlug(id);
    if (!existing) {
      const err = new Error('Fundraiser not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updated = await fundraiserRepository.updateFundraiser(existing.id, { status: newStatus });

    const auditActionMap = {
      active: 'FUNDRAISER_PUBLISHED',
      paused: 'FUNDRAISER_PAUSED',
      completed: 'FUNDRAISER_COMPLETED',
      cancelled: 'FUNDRAISER_CANCELLED',
      draft: 'FUNDRAISER_DRAFTED',
    };

    await auditService.recordLog({
      actorId: actorUser?.id,
      action: auditActionMap[newStatus] || 'FUNDRAISER_STATUS_CHANGED',
      entityType: 'fundraiser',
      entityId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status: newStatus },
      metadata: { previous_status: existing.status, new_status: newStatus },
      req,
    });

    return updated;
  }

  /**
   * Retrieves overall financial analytics across all fundraisers.
   */
  async getGlobalOverview() {
    return await fundraiserRepository.getGlobalFinancialStats();
  }
}

module.exports = new FundraiserService();
