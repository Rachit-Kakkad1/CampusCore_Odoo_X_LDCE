#!/usr/bin/env node
// backend/db/seed_new_features.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const env = require('../config/env');


async function seedNewFeatures() {
  console.log('🌱 Seeding rich data for Ticket Ledger, Volunteer Tasks, Roster, and Profile...');

  const pool = new Pool({
    connectionString: env.DATABASE_URL || undefined,
    host: env.DATABASE_URL ? undefined : env.DB_HOST,
    port: env.DATABASE_URL ? undefined : env.DB_PORT,
    database: env.DATABASE_URL ? undefined : env.DB_NAME,
    user: env.DATABASE_URL ? undefined : env.DB_USER,
    password: env.DATABASE_URL ? undefined : env.DB_PASSWORD,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Seed or Update Users with Phone & Roles
    console.log('👤 Seeding Users & Volunteers...');
    const usersToUpsert = [
      { name: 'Admin User', email: 'admin@odoo-ldce.org', role: 'admin', phone: '+91 98765 00001' },
      { name: 'Tara Treasurer', email: 'tara@odoo-ldce.org', role: 'treasurer', phone: '+91 98765 00002' },
      { name: 'Ethan Events', email: 'ethan@odoo-ldce.org', role: 'event_manager', phone: '+91 98765 22001' },
      { name: 'Vik Volunteer', email: 'vik@odoo-ldce.org', role: 'volunteer', phone: '+91 98765 11001' },
      { name: 'Ananya Sharma', email: 'ananya.volunteer@odoo-ldce.org', role: 'volunteer', phone: '+91 98765 11002' },
      { name: 'Rahul Mehta', email: 'rahul.volunteer@odoo-ldce.org', role: 'volunteer', phone: '+91 98765 11003' },
      { name: 'Priya Patel', email: 'priya.volunteer@odoo-ldce.org', role: 'volunteer', phone: '+91 98765 11004' },
      { name: 'Maya Member', email: 'maya@odoo-ldce.org', role: 'member', phone: '+91 98765 33001' },
      { name: 'Eddie Expired', email: 'eddie@odoo-ldce.org', role: 'member', phone: '+91 98765 33002' },
      { name: 'Rohan Gupta', email: 'rohan.member@odoo-ldce.org', role: 'member', phone: '+91 98765 33003' },
      { name: 'Sneha Joshi', email: 'sneha.member@odoo-ldce.org', role: 'member', phone: '+91 98765 33004' },
    ];

    const userMap = {};
    for (const u of usersToUpsert) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, role = EXCLUDED.role, phone = EXCLUDED.phone
         RETURNING id, email`,
        [u.name, u.email, passwordHash, u.role, u.phone]
      );
      userMap[u.email] = res.rows[0].id;
    }

    // 2. Seed Guest Attendees
    console.log('🎟️ Seeding Guest Attendees...');
    const attendeesToUpsert = [
      { name: 'Kavita Verma', email: 'kavita.guest@gmail.com', mobile: '+91 91234 56789' },
      { name: 'Amit Kumar', email: 'amit.kumar@outlook.com', mobile: '+91 92345 67890' },
      { name: 'Siddharth Rao', email: 'siddharth.rao@yahoo.com', mobile: '+91 93456 78901' },
      { name: 'Neha Sen', email: 'neha.sen@gmail.com', mobile: '+91 94567 89012' },
      { name: 'Deepak Shah', email: 'deepak.shah@techcorp.in', mobile: '+91 95678 90123' },
    ];

    const attendeeMap = {};
    for (const a of attendeesToUpsert) {
      const res = await client.query(
        `INSERT INTO event_attendees (name, email, mobile)
         VALUES ($1, $2, $3)
         RETURNING id, email`,
        [a.name, a.email, a.mobile]
      );
      attendeeMap[a.email] = res.rows[0].id;
    }

    // 3. Seed Events with Assigned Event Manager
    console.log('📅 Seeding Events with Event Managers...');
    const eventsToSeed = [
      {
        title: 'Spring Gala 2026',
        venue: 'Main Auditorium, Campus Center',
        starts_at: '2026-11-15 18:00:00+05:30',
        ends_at: '2026-11-15 22:00:00+05:30',
        capacity: 150,
        seats_remaining: 142,
        member_price: 300.00,
        non_member_price: 500.00,
        volunteers_enabled: true,
        volunteers_required: 8,
        event_manager_id: userMap['ethan@odoo-ldce.org'],
      },
      {
        title: 'Tech Innovators Summit 2026',
        venue: 'LDCE Convention Hall & Innovation Hub',
        starts_at: '2026-12-05 09:00:00+05:30',
        ends_at: '2026-12-05 18:00:00+05:30',
        capacity: 200,
        seats_remaining: 194,
        member_price: 450.00,
        non_member_price: 750.00,
        volunteers_enabled: true,
        volunteers_required: 10,
        event_manager_id: userMap['ethan@odoo-ldce.org'],
      },
      {
        title: 'Campus Cultural Fest 2026',
        venue: 'Open Air Amphitheatre',
        starts_at: '2026-10-28 17:00:00+05:30',
        ends_at: '2026-10-28 23:00:00+05:30',
        capacity: 300,
        seats_remaining: 295,
        member_price: 250.00,
        non_member_price: 400.00,
        volunteers_enabled: true,
        volunteers_required: 12,
        event_manager_id: userMap['ethan@odoo-ldce.org'],
      },
      {
        title: 'Robotics & AI Hands-on Workshop',
        venue: 'Robotics Advanced Lab 402',
        starts_at: '2026-11-02 10:00:00+05:30',
        ends_at: '2026-11-02 16:00:00+05:30',
        capacity: 40,
        seats_remaining: 38,
        member_price: 200.00,
        non_member_price: 350.00,
        volunteers_enabled: true,
        volunteers_required: 4,
        event_manager_id: userMap['admin@odoo-ldce.org'],
      },
    ];

    const eventMap = {};
    for (const ev of eventsToSeed) {
      const res = await client.query(
        `INSERT INTO events (title, venue, starts_at, ends_at, capacity, seats_remaining, member_price, non_member_price, volunteers_enabled, volunteers_required, event_manager_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, title`,
        [ev.title, ev.venue, ev.starts_at, ev.ends_at, ev.capacity, ev.seats_remaining, ev.member_price, ev.non_member_price, ev.volunteers_enabled, ev.volunteers_required, ev.event_manager_id]
      );
      eventMap[ev.title] = res.rows[0].id;
    }

    // 4. Seed Event Volunteer Applications (Roster)
    console.log('🤝 Seeding Event Volunteer Rosters...');
    const rosterEntries = [
      { event: 'Spring Gala 2026', user: 'vik@odoo-ldce.org', status: 'approved' },
      { event: 'Spring Gala 2026', user: 'ananya.volunteer@odoo-ldce.org', status: 'approved' },
      { event: 'Spring Gala 2026', user: 'rahul.volunteer@odoo-ldce.org', status: 'pending' },
      { event: 'Tech Innovators Summit 2026', user: 'vik@odoo-ldce.org', status: 'approved' },
      { event: 'Tech Innovators Summit 2026', user: 'rahul.volunteer@odoo-ldce.org', status: 'approved' },
      { event: 'Campus Cultural Fest 2026', user: 'ananya.volunteer@odoo-ldce.org', status: 'approved' },
      { event: 'Campus Cultural Fest 2026', user: 'priya.volunteer@odoo-ldce.org', status: 'approved' },
      { event: 'Robotics & AI Hands-on Workshop', user: 'priya.volunteer@odoo-ldce.org', status: 'approved' },
    ];

    for (const r of rosterEntries) {
      await client.query(
        `INSERT INTO event_volunteers (event_id, user_id, status, applied_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '2 days')
         ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [eventMap[r.event], userMap[r.user], r.status]
      );
    }

    // 5. Seed Volunteer Tasks
    console.log('📋 Seeding Volunteer Tasks across Events...');
    const tasksToSeed = [
      {
        event: 'Spring Gala 2026',
        assignee: 'vik@odoo-ldce.org',
        title: 'Manage Registration & Check-in Desk',
        description: 'Scan QR tickets, verify attendee credentials, and distribute welcome packs at Main Gate entrance.',
        priority: 'HIGH',
        status: 'COMPLETED',
        due_date: '2026-11-15 09:30:00+05:30',
        completed_at: '2026-11-15 09:20:00+05:30',
        completed_by: userMap['vik@odoo-ldce.org'],
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Spring Gala 2026',
        assignee: 'ananya.volunteer@odoo-ldce.org',
        title: 'Stage Lighting & Audio Gear Setup',
        description: 'Coordinate with AV technician team to test microphones, stage spotlights, and projector feeds.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        due_date: '2026-11-15 16:00:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Spring Gala 2026',
        assignee: 'vik@odoo-ldce.org',
        title: 'VIP Guest Assistance & Hospitality',
        description: 'Escort guest lecturers and dignitaries to reserved front-row seating and provide event programs.',
        priority: 'MEDIUM',
        status: 'PENDING',
        due_date: '2026-11-15 18:00:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Tech Innovators Summit 2026',
        assignee: 'rahul.volunteer@odoo-ldce.org',
        title: 'Keynote Speaker Coordination & Mics',
        description: 'Brief keynote speakers on presentation clickers and manage stage transitions.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        due_date: '2026-12-05 08:45:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Tech Innovators Summit 2026',
        assignee: 'vik@odoo-ldce.org',
        title: 'Distribute Delegate Kits & Badges',
        description: 'Hand out summit badges, tech agendas, and sponsor swag bags to pre-registered delegates.',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        due_date: '2026-12-05 09:00:00+05:30',
        completed_at: '2026-12-05 08:50:00+05:30',
        completed_by: userMap['vik@odoo-ldce.org'],
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Tech Innovators Summit 2026',
        assignee: 'rahul.volunteer@odoo-ldce.org',
        title: 'Technical Demo Booth Support',
        description: 'Provide power strips, HDMI cables, and Wi-Fi credentials for student innovation booths.',
        priority: 'LOW',
        status: 'PENDING',
        due_date: '2026-12-05 11:30:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Campus Cultural Fest 2026',
        assignee: 'priya.volunteer@odoo-ldce.org',
        title: 'Crowd Flow & Security Liaison',
        description: 'Monitor amphitheatre entrance barricades and ensure emergency exit paths remain clear.',
        priority: 'HIGH',
        status: 'PENDING',
        due_date: '2026-10-28 17:00:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Campus Cultural Fest 2026',
        assignee: 'ananya.volunteer@odoo-ldce.org',
        title: 'Backstage Coordination for Dance Troupe',
        description: 'Coordinate lineup of student performance groups and assist with prop placements.',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        due_date: '2026-10-28 19:00:00+05:30',
        completed_at: '2026-10-28 18:45:00+05:30',
        completed_by: userMap['ananya.volunteer@odoo-ldce.org'],
        created_by: userMap['ethan@odoo-ldce.org'],
      },
      {
        event: 'Robotics & AI Hands-on Workshop',
        assignee: 'priya.volunteer@odoo-ldce.org',
        title: 'Hardware Kit Distribution & Testing',
        description: 'Distribute Arduino microcontroller kits, sensors, and cables to lab student teams.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        due_date: '2026-11-02 10:00:00+05:30',
        completed_at: null,
        completed_by: null,
        created_by: userMap['admin@odoo-ldce.org'],
      },
    ];

    for (const t of tasksToSeed) {
      await client.query(
        `INSERT INTO tasks (event_id, assignee_id, title, description, priority, status, due_date, completed_at, completed_by, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          eventMap[t.event],
          userMap[t.assignee],
          t.title,
          t.description,
          t.priority,
          t.status,
          t.due_date,
          t.completed_at,
          t.completed_by,
          t.created_by,
        ]
      );
    }

    // 6. Seed Tickets (Admin Ticket Ledger Data)
    console.log('🎫 Seeding Tickets across Members & Guests...');
    const ticketsToSeed = [
      // Member Tickets
      {
        ticket_code: 'TCK-MEMBER-MAYA-GALA',
        fallback_code: 'GALA01',
        event: 'Spring Gala 2026',
        user: 'maya@odoo-ldce.org',
        attendee: null,
        price: 300.00,
        price_type: 'member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_maya_gala_991',
        is_checked_in: true,
        checked_in_at: '2026-11-15 18:15:00+05:30',
        checked_in_by: userMap['vik@odoo-ldce.org'],
      },
      {
        ticket_code: 'TCK-MEMBER-ROHAN-TECH',
        fallback_code: 'TECH02',
        event: 'Tech Innovators Summit 2026',
        user: 'rohan.member@odoo-ldce.org',
        attendee: null,
        price: 450.00,
        price_type: 'member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_rohan_tech_882',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },
      {
        ticket_code: 'TCK-MEMBER-SNEHA-FEST',
        fallback_code: 'FEST03',
        event: 'Campus Cultural Fest 2026',
        user: 'sneha.member@odoo-ldce.org',
        attendee: null,
        price: 250.00,
        price_type: 'member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_sneha_fest_773',
        is_checked_in: true,
        checked_in_at: '2026-10-28 17:30:00+05:30',
        checked_in_by: userMap['ananya.volunteer@odoo-ldce.org'],
      },
      {
        ticket_code: 'TCK-MEMBER-EDDIE-GALA',
        fallback_code: 'GALA04',
        event: 'Spring Gala 2026',
        user: 'eddie@odoo-ldce.org',
        attendee: null,
        price: 300.00,
        price_type: 'member',
        payment_status: 'paid',
        payment_mode: 'card',
        checkout_session_id: 'cs_live_eddie_gala_664',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },
      {
        ticket_code: 'TCK-MEMBER-MAYA-ROBOTICS',
        fallback_code: 'ROBO05',
        event: 'Robotics & AI Hands-on Workshop',
        user: 'maya@odoo-ldce.org',
        attendee: null,
        price: 200.00,
        price_type: 'member',
        payment_status: 'pending',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_maya_robo_pending',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },

      // Guest Attendee Tickets
      {
        ticket_code: 'TCK-GUEST-KAVITA-GALA',
        fallback_code: 'GUEST01',
        event: 'Spring Gala 2026',
        user: null,
        attendee: 'kavita.guest@gmail.com',
        price: 500.00,
        price_type: 'non_member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_kavita_gala_551',
        is_checked_in: true,
        checked_in_at: '2026-11-15 18:40:00+05:30',
        checked_in_by: userMap['vik@odoo-ldce.org'],
      },
      {
        ticket_code: 'TCK-GUEST-AMIT-TECH',
        fallback_code: 'GUEST02',
        event: 'Tech Innovators Summit 2026',
        user: null,
        attendee: 'amit.kumar@outlook.com',
        price: 750.00,
        price_type: 'non_member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_amit_tech_442',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },
      {
        ticket_code: 'TCK-GUEST-SID-FEST',
        fallback_code: 'GUEST03',
        event: 'Campus Cultural Fest 2026',
        user: null,
        attendee: 'siddharth.rao@yahoo.com',
        price: 400.00,
        price_type: 'non_member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_sid_fest_333',
        is_checked_in: true,
        checked_in_at: '2026-10-28 17:50:00+05:30',
        checked_in_by: userMap['ananya.volunteer@odoo-ldce.org'],
      },
      {
        ticket_code: 'TCK-GUEST-NEHA-GALA',
        fallback_code: 'GUEST04',
        event: 'Spring Gala 2026',
        user: null,
        attendee: 'neha.sen@gmail.com',
        price: 500.00,
        price_type: 'non_member',
        payment_status: 'paid',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_neha_gala_224',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },
      {
        ticket_code: 'TCK-GUEST-DEEPAK-TECH',
        fallback_code: 'GUEST05',
        event: 'Tech Innovators Summit 2026',
        user: null,
        attendee: 'deepak.shah@techcorp.in',
        price: 750.00,
        price_type: 'non_member',
        payment_status: 'pending',
        payment_mode: 'online',
        checkout_session_id: 'cs_live_deepak_pending',
        is_checked_in: false,
        checked_in_at: null,
        checked_in_by: null,
      },
    ];

    for (const tk of ticketsToSeed) {
      const ticketRes = await client.query(
        `INSERT INTO tickets (ticket_code, fallback_code, event_id, user_id, attendee_id, price, price_type, payment_status, checked_in_at, checked_in_by, checkout_session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          tk.ticket_code,
          tk.fallback_code,
          eventMap[tk.event],
          tk.user ? userMap[tk.user] : null,
          tk.attendee ? attendeeMap[tk.attendee] : null,
          tk.price,
          tk.price_type,
          tk.payment_status,
          tk.checked_in_at,
          tk.checked_in_by,
          tk.checkout_session_id,
        ]
      );


      const ticketId = ticketRes.rows[0].id;

      // If paid, create a central financial transaction entry
      if (tk.payment_status === 'paid') {
        await client.query(
          `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'ticket',
            ticketId,
            tk.user ? userMap[tk.user] : null,
            tk.price,
            'in',
            tk.payment_mode || 'online',
            'paid',
          ]
        );
      }


      // Add audit trail for ticket
      await client.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tk.user ? userMap[tk.user] : null,
          'TICKET_PURCHASED',
          'ticket',
          ticketId,
          JSON.stringify({
            ticket_code: tk.ticket_code,
            amount: tk.price,
            status: tk.payment_status,
          }),
        ]
      );

      if (tk.checked_in_at) {
        await client.query(
          `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tk.checked_in_by,
            'TICKET_CHECKED_IN',
            'ticket',
            ticketId,
            JSON.stringify({
              checked_in_at: tk.checked_in_at,
            }),
          ]
        );
      }
    }


    await client.query('COMMIT');
    console.log('✅ Real seed data successfully inserted for Ticket Ledger, Volunteer Tasks, and Profiles!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedNewFeatures()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedNewFeatures };
