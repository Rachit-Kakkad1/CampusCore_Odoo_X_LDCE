/**
 * Email Templates Module
 * Generates beautiful HTML and accessible plain-text representations for ticket deliveries.
 */

/**
 * Formats a date into human-readable string.
 */
function formatDate(dateInput) {
  if (!dateInput) return 'TBA';
  try {
    const d = new Date(dateInput);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Builds HTML and text versions of the ticket confirmation email.
 *
 * @param {object} params
 * @param {string} params.attendeeName
 * @param {string} params.eventName
 * @param {string|Date} params.eventDate
 * @param {string} params.venue
 * @param {string} params.ticketCode
 * @param {number|string} params.price
 * @param {string} params.priceType
 * @param {string} params.qrDataUrl
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderTicketEmail({
  attendeeName = 'Attendee',
  eventName = 'Organization Event',
  eventDate = null,
  venue = 'Campus Center',
  ticketCode = 'TCK-0000',
  fallbackCode = null,
  price = '0.00',
  priceType = 'General',
  qrDataUrl = null,
}) {
  const displayFallbackCode = fallbackCode || ticketCode;
  const formattedDate = formatDate(eventDate);
  const subject = `Your Ticket for ${eventName} [${displayFallbackCode}]`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 24px;
      color: #1a202c;
    }
    .ticket-container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .ticket-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
    }
    .ticket-header h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 700;
    }
    .ticket-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .ticket-body {
      padding: 28px 24px;
    }
    .qr-section {
      text-align: center;
      margin: 20px 0;
      padding: 16px;
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }
    .qr-image {
      width: 200px;
      height: 200px;
      display: inline-block;
      border-radius: 8px;
    }
    .fallback-code-box {
      margin-top: 14px;
      padding: 10px 16px;
      background: #edf2f7;
      border-radius: 6px;
      display: inline-block;
      font-size: 14px;
      color: #2d3748;
    }
    .fallback-code {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 1px;
      color: #1e3a8a;
      display: block;
      margin-top: 4px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .details-table td {
      padding: 10px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }
    .details-label {
      color: #718096;
      font-weight: 500;
      width: 35%;
    }
    .details-value {
      color: #1a202c;
      font-weight: 600;
      text-align: right;
    }
    .instructions-card {
      margin-top: 24px;
      padding: 16px;
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.5;
      color: #1e40af;
    }
    .instructions-card h4 {
      margin: 0 0 6px 0;
      font-size: 14px;
      font-weight: 700;
    }
    .instructions-card ol {
      margin: 0;
      padding-left: 18px;
    }
    .ticket-footer {
      background-color: #f8fafc;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #a0aec0;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="ticket-header">
      <h1>${eventName}</h1>
      <p>Official Admission Pass</p>
    </div>

    <div class="ticket-body">
      <p style="margin-top: 0;">Hi <strong>${attendeeName}</strong>,</p>
      <p>Your ticket payment has been confirmed! Please keep this email accessible on your mobile phone or print it out for entry.</p>

      <div class="qr-section">
        ${qrDataUrl ? `<img src="cid:ticket_qr_code" data-qr="${qrDataUrl}" alt="Check-in QR Code" class="qr-image" style="width: 180px; height: 180px; display: block; margin: 0 auto 12px auto;" />` : '<p style="color: #e53e3e;">QR Code generation pending</p>'}
        <div class="fallback-code-box">
          <span>Manual Entry Code:</span>
          <span class="fallback-code">${displayFallbackCode}</span>
          <div style="font-size: 11px; opacity: 0.75; margin-top: 4px;">Ticket Ref: ${ticketCode}</div>
        </div>
      </div>


      <table class="details-table">
        <tr>
          <td class="details-label">Attendee</td>
          <td class="details-value">${attendeeName}</td>
        </tr>
        <tr>
          <td class="details-label">Event</td>
          <td class="details-value">${eventName}</td>
        </tr>
        <tr>
          <td class="details-label">Date & Time</td>
          <td class="details-value">${formattedDate}</td>
        </tr>
        <tr>
          <td class="details-label">Venue</td>
          <td class="details-value">${venue}</td>
        </tr>
        <tr>
          <td class="details-label">Ticket Code</td>
          <td class="details-value">${ticketCode}</td>
        </tr>
        <tr>
          <td class="details-label">Manual Code</td>
          <td class="details-value">${displayFallbackCode}</td>
        </tr>
        <tr>
          <td class="details-label">Ticket Type</td>
          <td class="details-value" style="text-transform: capitalize;">${priceType}</td>
        </tr>
        <tr>
          <td class="details-label">Amount Paid</td>
          <td class="details-value">₹${parseFloat(price).toFixed(2)}</td>
        </tr>
      </table>

      <div class="instructions-card">
        <h4>Door Check-in Instructions</h4>
        <p style="font-weight: 700; margin: 4px 0 8px 0;">Show this QR code at the entrance.</p>
        <ol>
          <li>Have this QR code displayed on your screen at full brightness when approaching the entrance.</li>
          <li>Our staff or volunteers will scan your code to grant admission.</li>
          <li>If your phone battery is low or the scanner fails, show the <strong>Manual Entry Code: ${displayFallbackCode}</strong> above to the gate manager.</li>
        </ol>
      </div>
    </div>

    <div class="ticket-footer">
      Odoo × LDCE Student Organization Management System &bull; Present this pass for admission
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
============================================================
${eventName.toUpperCase()} — OFFICIAL ADMISSION TICKET
============================================================

Hello ${attendeeName},

Your ticket payment has been confirmed. Below are your admission details:

Event:            ${eventName}
Date & Time:      ${formattedDate}
Venue:            ${venue}
Ticket Code:      ${ticketCode}
Ticket Type:      ${priceType}
Amount Paid:      ₹${parseFloat(price).toFixed(2)}

------------------------------------------------------------
INSTRUCTION: Show this QR code at the entrance.
Manual Entry Code: ${displayFallbackCode}
MANUAL FALLBACK CODE: ${displayFallbackCode}
Ticket Ref: ${ticketCode}
------------------------------------------------------------


CHECK-IN INSTRUCTIONS:
1. Present your signed QR code at the door for entry.
2. If your phone screen is damaged or the scanner fails, show the
   Manual Entry Code [${displayFallbackCode}] to the gate staff.
3. Each ticket may only be checked in once.

Odoo x LDCE Student Organization System
============================================================
  `.trim();

  return { subject, html, text };
}

/**
 * Builds HTML and text versions of the donation confirmation/receipt email.
 *
 * @param {object} params
 * @param {string} params.donorName
 * @param {string} params.fundraiserTitle
 * @param {number|string} params.amount
 * @param {string} params.currency
 * @param {string} params.donationReference
 * @param {string} params.paymentStatus
 * @param {string|Date} params.date
 * @param {boolean} params.anonymous
 * @returns {{ subject: string, html: string, text: string }}
 */
function renderDonationEmail({
  donorName = 'Valued Supporter',
  fundraiserTitle = 'Campus Community Initiative',
  amount = '0.00',
  currency = 'INR',
  donationReference = 'DON-0000',
  paymentStatus = 'Paid',
  date = new Date(),
  anonymous = false,
}) {
  const formattedDate = formatDate(date);
  const currencySymbol = currency === 'USD' ? '$' : '₹';
  const displayAmount = `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
  const subject = `Donation Receipt: ${fundraiserTitle} [${donationReference}]`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }
    .receipt-container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .receipt-header {
      background: linear-gradient(135deg, #047857 0%, #10b981 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .receipt-header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
    }
    .receipt-header p {
      margin: 0;
      opacity: 0.95;
      font-size: 14px;
    }
    .receipt-body {
      padding: 28px 24px;
    }
    .amount-box {
      text-align: center;
      margin: 16px 0 24px 0;
      padding: 20px;
      background-color: #ecfdf5;
      border-radius: 8px;
      border: 1px solid #a7f3d0;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 800;
      color: #065f46;
      margin: 0;
    }
    .amount-label {
      font-size: 12px;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      margin-top: 4px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .details-label {
      color: #64748b;
      font-weight: 500;
      width: 40%;
    }
    .details-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      background-color: #d1fae5;
      color: #065f46;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .receipt-footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>Thank You for Your Generosity!</h1>
      <p>Your contribution directly supports our community initiative.</p>
    </div>

    <div class="receipt-body">
      <div class="amount-box">
        <div class="amount-value">${displayAmount}</div>
        <div class="amount-label">Total Donation Processed</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="details-label">Donor Name</td>
          <td class="details-value">${donorName} ${anonymous ? '(Publicly Anonymous)' : ''}</td>
        </tr>
        <tr>
          <td class="details-label">Fundraiser Cause</td>
          <td class="details-value">${fundraiserTitle}</td>
        </tr>
        <tr>
          <td class="details-label">Donation Reference</td>
          <td class="details-value" style="font-family: monospace; font-weight: 700; color: #047857;">${donationReference}</td>
        </tr>
        <tr>
          <td class="details-label">Date & Time</td>
          <td class="details-value">${formattedDate}</td>
        </tr>
        <tr>
          <td class="details-label">Payment Status</td>
          <td class="details-value"><span class="status-badge">${paymentStatus}</span></td>
        </tr>
      </table>
    </div>

    <div class="receipt-footer">
      Odoo × LDCE Student Organization Management System &bull; Official Donation Receipt<br/>
      Keep this reference for your personal tax and financial records.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
============================================================
DONATION RECEIPT — OFFICIAL CONFIRMATION
============================================================

Thank you, ${donorName}!

Your donation of ${displayAmount} has been successfully processed in support of:
${fundraiserTitle}

Donation Reference:  ${donationReference}
Donor Name:          ${donorName} ${anonymous ? '(Anonymous on public board)' : ''}
Date:                ${formattedDate}
Payment Status:      ${paymentStatus}

Thank you for making a real impact in our student organization community.

Odoo x LDCE Student Organization System
============================================================
  `.trim();

  return { subject, html, text };
}

module.exports = {
  renderTicketEmail,
  renderDonationEmail,
};

