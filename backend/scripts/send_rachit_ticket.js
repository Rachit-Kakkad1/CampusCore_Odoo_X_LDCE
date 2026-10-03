// backend/scripts/send_rachit_ticket.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');
const ticketService = require('../modules/events/ticket.service');
const eventRepository = require('../modules/events/event.repository');
const { SmtpEmailProvider, setEmailProvider } = require('../shared/email/email.provider');

async function sendTicketToRachit() {
  console.log('================================================================');
  console.log('ISSUING TICKET AND SENDING EMAIL VIA SMTP TO kakkadrachit1@gmail.com');
  console.log('================================================================\n');

  try {
    // Explicitly activate live SMTP email provider
    const smtpProvider = new SmtpEmailProvider();
    setEmailProvider(smtpProvider);

    // 1. Fetch available event
    const events = await eventRepository.getAllEvents();
    const event = events.find((e) => e.title.includes('Spring Gala')) || events[0];
    if (!event) {
      throw new Error('No events found in database to issue ticket for.');
    }
    console.log(`[EVENT] Selected Event: "${event.title}" (Venue: ${event.venue}, Starts: ${new Date(event.starts_at).toLocaleString()})`);

    const attendeeInfo = {
      name: 'Rachit Kakkad',
      email: 'kakkadrachit1@gmail.com',
      mobile: '9876543210',
    };

    console.log(`[ATTENDEE] Recipient: ${attendeeInfo.name} <${attendeeInfo.email}>`);

    // 2. Create pending ticket for guest attendee
    const checkoutSessionId = `cs_rachit_${Date.now()}`;
    const pendingTicket = await ticketService.checkoutTicket(
      event.id,
      null,
      checkoutSessionId,
      attendeeInfo
    );

    console.log(`[TICKET CREATED] ID: ${pendingTicket.id}, Code: ${pendingTicket.ticket_code}, Price: ₹${pendingTicket.price}`);

    // 3. Complete payment, generate cryptographically signed QR, and dispatch email via SMTP
    console.log('\n[PROCESSING] Processing payment, signing QR code, and sending confirmation email via Gmail SMTP...');
    const paidTicket = await ticketService.payTicket(pendingTicket.id, null, 'online');


    console.log('\n================================================================');
    console.log('TICKET ISSUED AND EMAIL DISPATCH RESULT');
    console.log('================================================================');
    console.log(`Ticket Code:        ${paidTicket.ticket_code}`);
    console.log(`Payment Status:     ${paidTicket.payment_status}`);
    console.log(`QR Payload:         ${paidTicket.qr_payload}`);
    console.log(`Email Delivery:     ${paidTicket.email_delivery.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    if (paidTicket.email_delivery.messageId) {
      console.log(`SMTP Message ID:    ${paidTicket.email_delivery.messageId}`);
    }
    if (paidTicket.email_delivery.error) {
      console.log(`Delivery Error:     ${paidTicket.email_delivery.error}`);
    }
    console.log('================================================================\n');

    if (!paidTicket.email_delivery.success) {
      throw new Error(`Email delivery failed: ${paidTicket.email_delivery.error}`);
    }

    console.log('✅ Ticket email with signed QR code successfully sent to kakkadrachit1@gmail.com!');
  } catch (error) {
    console.error('❌ Error issuing ticket or sending email:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

sendTicketToRachit();
