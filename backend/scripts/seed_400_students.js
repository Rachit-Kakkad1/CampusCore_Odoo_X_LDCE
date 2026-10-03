#!/usr/bin/env node
/**
 * Realistic 400 Student Population Seed Script
 * Generates authentic campus organization data:
 * - 400 Real students with realistic names, emails, and roles
 * - Active, Expired, and Pending memberships with realistic lifecycle dates & dues
 * - 8 Diverse campus events with 350+ realistic ticket bookings & QR check-ins
 * - 6 Official merchandise products with size stock & 160+ realistic student orders
 * - 4 Active & completed fundraisers with 35+ volunteer tasks
 * - 30+ Volunteer expense claims with approval & reimbursement audit trails
 * - Comprehensive central ledger transactions for financial accuracy
 * - 8 High-priority and informative announcements
 */

const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { pool } = require('../db/connection');

// Realistic name banks
const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Aayan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Dhruv', 'Kabir', 'Ritvik', 'Harsh', 'Rachit', 'Rohan', 'Siddharth', 'Devansh',
  'Aman', 'Vikram', 'Alok', 'Varun', 'Rahul', 'Bhavya', 'Deep', 'Het', 'Meet', 'Parth',
  'Jinay', 'Dhairya', 'Vansh', 'Yash', 'Henil', 'Kush', 'Dev', 'Raj', 'Sahil', 'Kunal',
  'Ritesh', 'Gaurav', 'Mohit', 'Chirag', 'Jatin', 'Rakesh', 'Manish', 'Ankit', 'Pranav', 'Nirav',
  'Karan', 'Tanmay', 'Tushar', 'Sameer', 'Jay', 'Om', 'Shivam', 'Ayush', 'Kavya', 'Ketan',
  'Darshan', 'Hardik', 'Bhavesh', 'Pankaj', 'Sanjay', 'Hemant', 'Nikhil', 'Tejas', 'Ravi', 'Akash'
];

const FIRST_NAMES_FEMALE = [
  'Ananya', 'Diya', 'Sanvi', 'Kiara', 'Myra', 'Pari', 'Anika', 'Navya', 'Aadhya', 'Saanvi',
  'Samaira', 'Riya', 'Yashvi', 'Tanvi', 'Avani', 'Prisha', 'Priya', 'Sneha', 'Pooja', 'Meera',
  'Neha', 'Tanya', 'Shreya', 'Krisha', 'Mahek', 'Zeel', 'Dipti', 'Simran', 'Nidhi', 'Payal',
  'Komal', 'Divya', 'Swati', 'Ritu', 'Isha', 'Trisha', 'Khushi', 'Anjali', 'Kavita', 'Rupal',
  'Kinjal', 'Bhumika', 'Riddhi', 'Siddhi', 'Dharini', 'Bhoomi', 'Mansi', 'Maitri', 'Palak', 'Dhwani',
  'Kareena', 'Janvi', 'Aditi', 'Shalini', 'Kritika', 'Richa', 'Sonali', 'Megha', 'Priyanka', 'Rashmi'
];

const LAST_NAMES = [
  'Patel', 'Shah', 'Sharma', 'Mehta', 'Joshi', 'Desai', 'Trivedi', 'Verma', 'Gupta', 'Iyer',
  'Nair', 'Reddy', 'Rao', 'Kapoor', 'Kulkarni', 'Singhal', 'Chaudhari', 'Bhat', 'Sen', 'Ghosh',
  'Banerjee', 'Mukherjee', 'Roy', 'Das', 'Bhattacharya', 'Chatterjee', 'Dutta', 'Paul', 'Bose', 'Barman',
  'Dey', 'Saha', 'Biswas', 'Sarkar', 'Chakraborty', 'Majumdar', 'Agarwal', 'Jain', 'Mishra', 'Pandey',
  'Shukla', 'Tiwari', 'Dubey', 'Chaubey', 'Upadhyay', 'Tripathi', 'Jha', 'Thakur', 'Singh', 'Chauhan',
  'Rathore', 'Solanki', 'Parmar', 'Vaghela', 'Chavda', 'Jadeja', 'Gohil', 'Zala', 'Dabhi', 'Makwana',
  'Prajapati', 'Panchal', 'Gajjar', 'Suthar', 'Kapadia', 'Parekh', 'Vaidya', 'Khatri', 'Bhavsar', 'Vora'
];

// Helper: Seeded pseudo-random generator for reproducible & uniform distributions
let seedVal = 42;
function random() {
  seedVal = (seedVal * 9301 + 49297) % 233280;
  return seedVal / 233280;
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function generateDate(daysAgoMin, daysAgoMax) {
  const daysAgo = randomInt(daysAgoMin, daysAgoMax);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function addDays(date, days) {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

async function seed400Students() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting realistic population seed for 400 students...');
    await client.query('BEGIN');

    // 0. Default Hashed Password
    const defaultPassword = 'Password123!';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(defaultPassword, salt);

    // 1. SEED CORE SYSTEM ACCOUNTS
    console.log('👑 Ensuring core system admin & officer accounts exist...');
    const coreAccounts = [
      { name: 'Admin User', email: 'admin@skyline.org', role: 'admin' },
      { name: 'Tara Treasurer', email: 'tara@skyline.org', role: 'treasurer' },
      { name: 'Ethan Events', email: 'ethan@skyline.org', role: 'event_manager' },
      { name: 'Vik Volunteer', email: 'vik@skyline.org', role: 'volunteer' },
      { name: 'Maya Member', email: 'maya@skyline.org', role: 'member' },
      { name: 'Eddie Expired', email: 'eddie@skyline.org', role: 'member' },
      { name: 'Greg Guest', email: 'greg@skyline.org', role: 'member' },
      { name: 'Pia Pending', email: 'pia@skyline.org', role: 'member' },
    ];

    const coreUserMap = {};
    for (const u of coreAccounts) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING id, name, email, role;`,
        [u.name, u.email, passwordHash, u.role]
      );
      coreUserMap[u.email] = res.rows[0];
    }

    // 2. GENERATE 400 REALISTIC STUDENT USERS
    console.log('👥 Generating 400 realistic student accounts...');
    const studentUsers = [];
    const usedEmails = new Set(coreAccounts.map((a) => a.email.toLowerCase()));

    // 25 Volunteers, 375 Members
    const numVolunteers = 25;
    const numMembers = 375;

    for (let i = 1; i <= 400; i++) {
      const isFemale = random() > 0.45;
      const firstName = isFemale ? randomChoice(FIRST_NAMES_FEMALE) : randomChoice(FIRST_NAMES_MALE);
      const lastName = randomChoice(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;

      let baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      // Clean special chars
      baseEmail = baseEmail.replace(/[^a-z0-9.]/g, '');
      let email = `${baseEmail}@ldce.ac.in`;
      let suffix = 1;
      while (usedEmails.has(email)) {
        suffix++;
        email = `${baseEmail}${suffix}@ldce.ac.in`;
      }
      usedEmails.add(email);

      const role = i <= numVolunteers ? 'volunteer' : 'member';
      const createdAt = generateDate(30, 365);

      studentUsers.push({
        name: fullName,
        email,
        role,
        createdAt,
        index: i,
      });
    }

    // Bulk insert or upsert the 400 students
    const insertedStudents = [];
    for (const s of studentUsers) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING id, name, email, role, created_at;`,
        [s.name, s.email, passwordHash, s.role, s.createdAt]
      );
      insertedStudents.push({ ...res.rows[0], index: s.index });
    }
    console.log(`✅ ${insertedStudents.length} student user profiles ready.`);

    // 3. SEED MEMBERSHIPS & DUES TRANSACTIONS
    console.log('💳 Generating realistic student memberships & payment lifecycles...');
    // Distribution for the 400 students:
    // - 1..300: Active members (Dues paid, started 10-300 days ago, valid for 1 year)
    // - 301..350: Expired members (Dues paid in past 2024-2025, expired 10-180 days ago)
    // - 351..400: Pending applicants (Dues pending, awaiting clearance)
    let membershipCount = 0;
    let duesTxCount = 0;

    for (const student of insertedStudents) {
      let status = 'active';
      let duesStatus = 'paid';
      let duesAmount = 500.0;
      let startedAt = null;
      let expiryDate = null;
      let paymentTimestamp = null;
      let memberCode = '';

      if (student.index <= 300) {
        // Active
        status = 'active';
        duesStatus = 'paid';
        const startDaysAgo = randomInt(15, 300);
        startedAt = generateDate(startDaysAgo, startDaysAgo);
        expiryDate = addDays(startedAt, 365);
        paymentTimestamp = startedAt;
        memberCode = `MEM-2026-${String(student.id).padStart(4, '0')}`;
      } else if (student.index <= 350) {
        // Expired
        status = 'expired';
        duesStatus = 'paid';
        const startDaysAgo = randomInt(400, 720);
        startedAt = generateDate(startDaysAgo, startDaysAgo);
        expiryDate = addDays(startedAt, 365); // was active for 1 year, now expired
        paymentTimestamp = startedAt;
        memberCode = `MEM-2025-${String(student.id).padStart(4, '0')}`;
      } else {
        // Pending
        status = 'pending';
        duesStatus = 'pending';
        startedAt = null;
        expiryDate = null;
        paymentTimestamp = null;
        memberCode = `MEM-2026-P${String(student.id).padStart(4, '0')}`;
      }

      // Check if membership already exists for user
      const memRes = await client.query(
        `INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (member_code)
         DO UPDATE SET
           status = EXCLUDED.status,
           dues_status = EXCLUDED.dues_status,
           started_at = EXCLUDED.started_at,
           expiry_date = EXCLUDED.expiry_date,
           payment_timestamp = EXCLUDED.payment_timestamp
         RETURNING id;`,
        [student.id, memberCode, status, duesStatus, duesAmount, startedAt, expiryDate, paymentTimestamp]
      );
      membershipCount++;
      const membershipId = memRes.rows[0].id;

      // If paid, create central ledger transaction
      if (duesStatus === 'paid' && paymentTimestamp) {
        const paymentMode = randomChoice(['upi', 'card', 'online', 'cash']);
        await client.query(
          `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status, created_at)
           VALUES ('dues', $1, $2, $3, 'in', $4, 'paid', $5)
           ON CONFLICT (source_type, source_id)
           DO UPDATE SET amount = EXCLUDED.amount, user_id = EXCLUDED.user_id, payment_mode = EXCLUDED.payment_mode;`,
          [membershipId, student.id, duesAmount, paymentMode, paymentTimestamp]
        );
        duesTxCount++;
      }
    }
    console.log(`✅ Created ${membershipCount} student memberships and recorded ${duesTxCount} dues transactions.`);

    // 4. SEED CAMPUS EVENTS
    console.log('🎪 Seeding 8 campus flagship events...');
    const now = new Date();
    const eventDefinitions = [
      {
        title: 'HackLDCE 2026: 36-Hour National Hackathon',
        description: 'Flagship annual inter-collegiate hackathon bringing together 400+ innovators to build breakthrough AI, Web, and IoT projects with mentor support and ₹1,50,000 in prizes.',
        venue: 'Main Auditorium & Computer Engineering Labs',
        startsAt: addDays(now, 14),
        capacity: 250,
        memberPrice: 150.0,
        nonMemberPrice: 350.0,
      },
      {
        title: 'Spring Gala & Annual Awards Night',
        description: 'Prestigious black-tie banquet celebrating student leadership, club accomplishments, keynote guest addresses, and gala dinner.',
        venue: 'Grand Ballroom, Campus Convention Center',
        startsAt: addDays(now, 28),
        capacity: 180,
        memberPrice: 300.0,
        nonMemberPrice: 600.0,
      },
      {
        title: 'AI & Cloud Architecture Masterclass',
        description: 'Intensive full-day hands-on technical workshop covering modern LLM orchestration, microservices, and enterprise cloud architecture.',
        venue: 'High-Performance Computing Lab 4',
        startsAt: addDays(now, 7),
        capacity: 80,
        memberPrice: 100.0,
        nonMemberPrice: 250.0,
      },
      {
        title: 'Campus Cultural Fest: Tarangini 2026',
        description: 'Electrifying 3-day cultural celebration featuring inter-department music battles, dance face-offs, dramatics, and celebrity DJ night.',
        venue: 'University Open Air Amphitheatre',
        startsAt: addDays(now, 45),
        capacity: 400,
        memberPrice: 200.0,
        nonMemberPrice: 450.0,
      },
      {
        title: 'Alumni Leadership & Career Conclave',
        description: 'Connect with 30+ distinguished alumni founders, VP of Engineering, and researchers from Google, Odoo, Microsoft, and leading startups.',
        venue: 'Management Studies Auditorium',
        startsAt: addDays(now, 21),
        capacity: 120,
        memberPrice: 50.0,
        nonMemberPrice: 150.0,
      },
      {
        title: 'Robotics & IoT RoboWars Championship',
        description: 'High-octane combat robotics, obstacle maze autonomous rovers, and drone racing showcase with live arena commentary.',
        venue: 'Mechanical Engineering Arena',
        startsAt: addDays(now, -5), // Recently concluded event with rich check-in history!
        capacity: 100,
        memberPrice: 100.0,
        nonMemberPrice: 200.0,
      },
      {
        title: 'Photography & Digital Storytelling Bootcamp',
        description: 'Master manual cinematography, portrait lighting, Adobe Lightroom color grading, and social visual storytelling.',
        venue: 'Media & Communications Studio 102',
        startsAt: addDays(now, -12), // Concluded event
        capacity: 45,
        memberPrice: 50.0,
        nonMemberPrice: 120.0,
      },
      {
        title: 'Annual Campus Marathon & Sports Meet',
        description: '5K campus marathon run, track & field events, basketball shootout, and inter-branch tug of war.',
        venue: 'University Sports Complex',
        startsAt: addDays(now, 35),
        capacity: 300,
        memberPrice: 100.0,
        nonMemberPrice: 200.0,
      },
    ];

    const insertedEvents = [];
    for (const ed of eventDefinitions) {
      const existing = await client.query('SELECT id FROM events WHERE title = $1;', [ed.title]);
      let eventId;
      if (existing.rows.length === 0) {
        const ins = await client.query(
          `INSERT INTO events (title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by)
           VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
           RETURNING id, title, capacity, starts_at, member_price, non_member_price;`,
          [ed.title, ed.description, ed.venue, ed.startsAt, ed.capacity, ed.memberPrice, ed.nonMemberPrice, coreUserMap['ethan@skyline.org'].id]
        );
        eventId = ins.rows[0].id;
        insertedEvents.push(ins.rows[0]);
      } else {
        eventId = existing.rows[0].id;
        await client.query(
          `UPDATE events SET description = $1, venue = $2, starts_at = $3, capacity = $4, member_price = $5, non_member_price = $6 WHERE id = $7;`,
          [ed.description, ed.venue, ed.startsAt, ed.capacity, ed.memberPrice, ed.nonMemberPrice, eventId]
        );
        insertedEvents.push({ id: eventId, ...ed });
      }
    }
    console.log(`✅ ${insertedEvents.length} events seeded.`);

    // 5. SEED 360+ REALISTIC EVENT TICKETS & QR CHECK-INS
    console.log('🎟️ Generating 360+ event registrations, tickets & door check-ins...');
    const volunteerUsers = insertedStudents.filter((u) => u.role === 'volunteer');
    const checkinOfficers = [coreUserMap['ethan@skyline.org'].id, coreUserMap['vik@skyline.org'].id, ...volunteerUsers.map((v) => v.id)];

    let totalTicketsCreated = 0;
    let totalTicketTx = 0;

    for (const ev of insertedEvents) {
      // Determine number of attendees for this event (60% to 90% of capacity)
      const attendeesCount = Math.min(ev.capacity - 5, Math.floor(ev.capacity * (0.65 + random() * 0.25)));
      const isConcluded = new Date(ev.startsAt) < now;

      // Select diverse students
      const shuffledStudents = [...insertedStudents].sort(() => 0.5 - random()).slice(0, attendeesCount);

      let eventTicketsCount = 0;

      for (let k = 0; k < shuffledStudents.length; k++) {
        const student = shuffledStudents[k];
        const isMember = student.index <= 300;
        const price = isMember ? ev.member_price : ev.non_member_price;
        const priceType = isMember ? 'member' : 'non_member';
        const ticketCode = `TKT-${ev.id}-${student.id}-${Date.now().toString(36).toUpperCase()}-${k.toString().padStart(3, '0')}`;
        const createdAt = generateDate(5, 45);

        let checkedInAt = null;
        let checkedInBy = null;

        if (isConcluded) {
          // 80% checked in for concluded events
          if (random() > 0.15) {
            checkedInAt = new Date(new Date(ev.startsAt).getTime() + randomInt(10, 180) * 60000);
            checkedInBy = randomChoice(checkinOfficers);
          }
        } else if (random() < 0.1) {
          // A few early arrivals / VIP check-in tests for upcoming
          checkedInAt = new Date();
          checkedInBy = randomChoice(checkinOfficers);
        }

        const tktRes = await client.query(
          `INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status, checked_in_at, checked_in_by, created_at)
           VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8)
           ON CONFLICT (ticket_code) DO NOTHING
           RETURNING id;`,
          [ticketCode, ev.id, student.id, price, priceType, checkedInAt, checkedInBy, createdAt]
        );

        if (tktRes.rows.length > 0) {
          const ticketId = tktRes.rows[0].id;
          totalTicketsCreated++;
          eventTicketsCount++;

          // Ledger Transaction
          const paymentMode = randomChoice(['upi', 'card', 'online', 'cash']);
          await client.query(
            `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status, created_at)
             VALUES ('ticket', $1, $2, $3, 'in', $4, 'paid', $5)
             ON CONFLICT (source_type, source_id)
             DO UPDATE SET amount = EXCLUDED.amount, user_id = EXCLUDED.user_id;`,
            [ticketId, student.id, price, paymentMode, createdAt]
          );
          totalTicketTx++;
        }
      }

      // Update remaining seats
      const updatedRemaining = Math.max(0, ev.capacity - eventTicketsCount);
      await client.query('UPDATE events SET seats_remaining = $1 WHERE id = $2;', [updatedRemaining, ev.id]);
    }
    console.log(`✅ Seeded ${totalTicketsCreated} event tickets and ${totalTicketTx} ticket transactions.`);

    // 6. SEED MERCHANDISE & REALISTIC SIZES
    console.log('🛍️ Seeding campus store merchandise catalogue & sizes...');
    const productsToSeed = [
      {
        name: 'Official Club Varsity Hoodie',
        description: 'Premium heavyweight 380 GSM fleece hoodie featuring embroidered Skyline crest, thermal-lined hood, and reinforced kangaroo pocket.',
        price: 1299.0,
        sizes: [
          { size: 'S', stock: 25 },
          { size: 'M', stock: 50 },
          { size: 'L', stock: 45 },
          { size: 'XL', stock: 30 },
          { size: 'XXL', stock: 15 },
        ],
      },
      {
        name: 'Skyline Classic Cotton Tee',
        description: '100% bio-washed combed cotton t-shirt with signature high-density chest print and breathable summer knit.',
        price: 599.0,
        sizes: [
          { size: 'S', stock: 40 },
          { size: 'M', stock: 75 },
          { size: 'L', stock: 60 },
          { size: 'XL', stock: 35 },
        ],
      },
      {
        name: 'HackLDCE 2026 Commemorative Jersey',
        description: 'Dry-fit performance esports jersey with moisture-wicking tech, custom developer badges, and cyber-mesh side ventilation.',
        price: 799.0,
        sizes: [
          { size: 'S', stock: 30 },
          { size: 'M', stock: 55 },
          { size: 'L', stock: 40 },
          { size: 'XL', stock: 20 },
        ],
      },
      {
        name: 'Insulated Stainless Steel Flask (750ml)',
        description: 'Double-walled vacuum insulated flask keeping beverages cold for 24h or hot for 12h. Matte stealth black laser engraved.',
        price: 499.0,
        sizes: [
          { size: 'Standard', stock: 85 },
        ],
      },
      {
        name: 'Embroidered Campus Baseball Cap',
        description: 'Structured 6-panel cotton twill cap with 3D raised embroidery, brass buckle closure, and UV protection.',
        price: 349.0,
        sizes: [
          { size: 'Free Size', stock: 60 },
        ],
      },
      {
        name: 'Waterproof Laptop Sleeve (15.6")',
        description: 'Shockproof water-resistant neoprene sleeve with plush fleece lining, accessory zipper pocket, and campus monogram.',
        price: 649.0,
        sizes: [
          { size: '13-14 inch', stock: 40 },
          { size: '15-16 inch', stock: 50 },
        ],
      },
    ];

    const allProductSizes = []; // { id, productId, price, size, stock }
    for (const p of productsToSeed) {
      let prodId;
      const existing = await client.query('SELECT id FROM products WHERE name = $1;', [p.name]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          `INSERT INTO products (name, description, price)
           VALUES ($1, $2, $3)
           RETURNING id;`,
          [p.name, p.description, p.price]
        );
        prodId = res.rows[0].id;
      } else {
        prodId = existing.rows[0].id;
        await client.query('UPDATE products SET description = $1, price = $2 WHERE id = $3;', [p.description, p.price, prodId]);
      }

      for (const s of p.sizes) {
        const sizeRes = await client.query(
          `INSERT INTO product_sizes (product_id, size, stock)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, size)
           DO UPDATE SET stock = EXCLUDED.stock
           RETURNING id, product_id, size, stock;`,
          [prodId, s.size, s.stock]
        );
        allProductSizes.push({
          id: sizeRes.rows[0].id,
          productId: prodId,
          price: p.price,
          size: s.size,
          stock: s.stock,
        });
      }
    }
    console.log(`✅ Merchandise catalogue loaded with ${allProductSizes.length} product size variants.`);

    // 7. SEED 160+ REALISTIC MERCHANDISE ORDERS
    console.log('📦 Seeding 160+ student merchandise orders with line items...');
    let ordersCreated = 0;
    let orderTxCreated = 0;

    // Pick 160 students from active/general members
    const orderingStudents = [...insertedStudents].sort(() => 0.5 - random()).slice(0, 160);

    for (let o = 0; o < orderingStudents.length; o++) {
      const student = orderingStudents[o];
      const isMember = student.index <= 300;
      const orderDate = generateDate(3, 120);
      const orderCode = `ORD-2026-${String(student.id).padStart(4, '0')}-${String(o + 1).padStart(3, '0')}`;
      const sessionId = `cs_test_${orderCode.toLowerCase()}`;

      // Pick 1-3 random product items
      const numItems = randomInt(1, 3);
      const selectedSizes = [];
      for (let i = 0; i < numItems; i++) {
        selectedSizes.push(randomChoice(allProductSizes));
      }

      let subtotal = 0;
      const itemDetails = [];
      for (const item of selectedSizes) {
        const qty = randomChoice([1, 1, 1, 2]);
        const unitPrice = item.price;
        subtotal += unitPrice * qty;
        itemDetails.push({ productSizeId: item.id, quantity: qty, unitPrice });
      }

      const discount = isMember ? Math.round(subtotal * 0.15) : 0; // 15% member perk discount
      const total = Math.max(0, subtotal - discount);

      const ordRes = await client.query(
        `INSERT INTO orders (order_code, user_id, checkout_session_id, subtotal, discount, total, payment_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7)
         ON CONFLICT (order_code) DO NOTHING
         RETURNING id;`,
        [orderCode, student.id, sessionId, subtotal, discount, total, orderDate]
      );

      if (ordRes.rows.length > 0) {
        const orderId = ordRes.rows[0].id;
        ordersCreated++;

        for (const itm of itemDetails) {
          await client.query(
            `INSERT INTO order_items (order_id, product_size_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4);`,
            [orderId, itm.productSizeId, itm.quantity, itm.unitPrice]
          );
        }

        // Central Ledger Transaction
        const paymentMode = randomChoice(['upi', 'card', 'online', 'cash']);
        await client.query(
          `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status, created_at)
           VALUES ('merch', $1, $2, $3, 'in', $4, 'paid', $5)
           ON CONFLICT (source_type, source_id)
           DO UPDATE SET amount = EXCLUDED.amount, user_id = EXCLUDED.user_id;`,
          [orderId, student.id, total, paymentMode, orderDate]
        );
        orderTxCreated++;
      }
    }
    console.log(`✅ Seeded ${ordersCreated} merchandise orders and ${orderTxCreated} transactions.`);

    // 8. SEED FUNDRAISERS & TASKS & INCOMES
    console.log('🌱 Seeding 4 campus fundraising campaigns, volunteer tasks & donations...');
    const fundraiserDefs = [
      {
        title: 'Annual Student Project Showcase & Innovation Grant',
        description: 'Empowering undergraduate engineering teams with hardware component grants, 3D printing filaments, and cloud compute credits for final-year capstone prototypes.',
      },
      {
        title: 'Rural STEM Education & Robotics Outreach',
        description: 'Sponsoring Arduino starter kits, basic science lab apparatus, and volunteer teaching trips to 10 underprivileged regional schools.',
      },
      {
        title: 'Campus Green Initiative & Solar Charging Bench Drive',
        description: 'Fundraising for 5 solar-powered outdoor study benches with USB-C charging and native tree plantation across the university quadrangles.',
      },
      {
        title: 'Annual Club Bake Sale & Charity Drive',
        description: 'Community outreach bake sale supporting local children healthcare foundation with homemade treats, club merchandise, and games.',
      },
    ];

    const insertedFundraisers = [];
    for (const f of fundraiserDefs) {
      let fId;
      const existing = await client.query('SELECT id FROM fundraisers WHERE title = $1;', [f.title]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          `INSERT INTO fundraisers (title, description, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, title;`,
          [f.title, f.description, coreUserMap['admin@skyline.org'].id]
        );
        fId = res.rows[0].id;
      } else {
        fId = existing.rows[0].id;
        await client.query('UPDATE fundraisers SET description = $1 WHERE id = $2;', [f.description, fId]);
      }
      insertedFundraisers.push({ id: fId, title: f.title });
    }

    // Tasks for fundraisers
    const taskTitles = [
      'Design high-res sponsorship brochures and pitch deck',
      'Coordinate venue logistics and audio/visual setup',
      'Publish social media teaser videos and student interviews',
      'Procure raw materials and electronic evaluation boards',
      'Set up donation payment gateway and UPI QR kiosks',
      'Prepare volunteer duty roster and time shifts',
      'Bake cookies, brownies, and package with eco-friendly labels',
      'Liaise with university estate department for power permits',
      'Draft thank-you certificates for corporate donors',
      'Conduct pre-event dry run with core organizing committee',
    ];

    let tasksCount = 0;
    for (const fund of insertedFundraisers) {
      for (let t = 0; t < taskTitles.length; t++) {
        const title = `${taskTitles[t]} - ${fund.title.split(' ')[0]}`;
        const assignee = randomChoice([coreUserMap['vik@skyline.org'].id, ...volunteerUsers.map((v) => v.id)]);
        const status = randomChoice(['todo', 'in_progress', 'completed', 'completed']);

        const exTask = await client.query('SELECT id FROM tasks WHERE fundraiser_id = $1 AND title = $2;', [fund.id, title]);
        if (exTask.rows.length === 0) {
          await client.query(
            `INSERT INTO tasks (fundraiser_id, title, assignee_id, status)
             VALUES ($1, $2, $3, $4);`,
            [fund.id, title, assignee, status]
          );
          tasksCount++;
        }
      }
    }

    // Fundraiser Incomes (Donations)
    let donationsCount = 0;
    let donationTxCount = 0;
    for (const fund of insertedFundraisers) {
      const numDonations = randomInt(8, 15);
      for (let d = 0; d < numDonations; d++) {
        const donorStudent = randomChoice(insertedStudents);
        const amount = randomChoice([250.0, 500.0, 1000.0, 1500.0, 2500.0, 5000.0]);
        const date = generateDate(2, 60);
        const note = randomChoice([
          'Alumni matching contribution',
          'Student voluntary club support',
          'Corporate sponsor micro-grant',
          'Bake sale counter cash collection',
          'Parent & family contribution',
          'Faculty advisory grant',
        ]);

        const incRes = await client.query(
          `INSERT INTO fundraiser_income (fundraiser_id, amount, note, recorded_by, created_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id;`,
          [fund.id, amount, note, coreUserMap['tara@skyline.org'].id, date]
        );
        const incomeId = incRes.rows[0].id;
        donationsCount++;

        // Transaction
        await client.query(
          `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status, created_at)
           VALUES ('fundraiser', $1, $2, $3, 'in', $4, 'paid', $5)
           ON CONFLICT (source_type, source_id)
           DO UPDATE SET amount = EXCLUDED.amount;`,
          [incomeId, donorStudent.id, amount, randomChoice(['upi', 'card', 'online', 'cash']), date]
        );
        donationTxCount++;
      }
    }
    console.log(`✅ Seeded ${tasksCount} volunteer tasks and ${donationsCount} fundraiser donations.`);

    // 9. SEED VOLUNTEER EXPENSE CLAIMS & AUDIT TRAILS
    console.log('🧾 Seeding 30+ volunteer expense claims with Treasurer approvals...');
    const expenseDescriptions = [
      { desc: 'High-speed industrial label printer paper rolls for registration badges', amount: 1450.0 },
      { desc: 'Sound system XLR cables, adapters, and stage microphone batteries', amount: 2800.0 },
      { desc: 'Refreshments, mineral water, and snacks for Hackathon mentors (Day 1)', amount: 4850.0 },
      { desc: 'Standee banners, poster foam boards, and venue directional signage', amount: 3200.0 },
      { desc: 'First-aid kit replenishment and emergency ice packs for sports ground', amount: 950.0 },
      { desc: 'High-power glue guns, cutter knives, and acrylic sheets for workshop', amount: 1650.0 },
      { desc: 'Heavy-duty 16A power extension cords and surge protectors for lab setup', amount: 3400.0 },
      { desc: 'Custom printed ceramic mementos for guest speakers & judges', amount: 5200.0 },
      { desc: 'Eco-friendly kraft paper packaging bags for merchandise pickup', amount: 1100.0 },
      { desc: 'Emergency backup projector HDMI cables and active splitters', amount: 1850.0 },
    ];

    let expensesCreated = 0;
    let expenseTxCreated = 0;

    for (let e = 0; e < expenseDescriptions.length * 3; e++) {
      const template = expenseDescriptions[e % expenseDescriptions.length];
      const volunteer = randomChoice([coreUserMap['vik@skyline.org'], ...volunteerUsers]);
      const createdDate = generateDate(5, 90);
      const status = randomChoice(['reimbursed', 'reimbursed', 'approved', 'pending']);
      const amount = template.amount + randomInt(-200, 400);

      let approvedBy = null;
      let approvedAt = null;
      let reimbursedBy = null;
      let reimbursedAt = null;

      if (status === 'approved' || status === 'reimbursed') {
        approvedBy = coreUserMap['tara@skyline.org'].id;
        approvedAt = addDays(createdDate, 1);
      }
      if (status === 'reimbursed') {
        reimbursedBy = coreUserMap['tara@skyline.org'].id;
        reimbursedAt = addDays(approvedAt, 2);
      }

      const expRes = await client.query(
        `INSERT INTO expenses (submitted_by, amount, description, status, approved_by, approved_at, reimbursed_by, reimbursed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id;`,
        [volunteer.id, amount, `${template.desc} (Batch #${e + 1})`, status, approvedBy, approvedAt, reimbursedBy, reimbursedAt, createdDate]
      );

      const expId = expRes.rows[0].id;
      expensesCreated++;

      if (status === 'reimbursed' && reimbursedAt) {
        await client.query(
          `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status, created_at)
           VALUES ('expense', $1, $2, $3, 'out', 'upi', 'paid', $4)
           ON CONFLICT (source_type, source_id)
           DO UPDATE SET amount = EXCLUDED.amount, direction = 'out';`,
          [expId, volunteer.id, amount, reimbursedAt]
        );
        expenseTxCreated++;
      }
    }
    console.log(`✅ Seeded ${expensesCreated} expense claims and ${expenseTxCreated} reimbursed payout transactions.`);

    // 10. SEED HIGH-PRIORITY ANNOUNCEMENTS
    console.log('📢 Seeding official club announcements...');
    const announcements = [
      {
        title: 'Welcome to the 2026 Academic Year at Skyline Student Organization!',
        body: 'Welcome to all 400+ new and returning students! Explore upcoming hackathons, tech workshops, sports meets, and grab your official club varsity merchandise from the student store.',
        priority: 'urgent',
        category: 'general',
        createdBy: coreUserMap['admin@skyline.org'].id,
        publishedAt: generateDate(30, 45),
      },
      {
        title: 'HackLDCE 2026: Team Registration & Mentor Allotment Open',
        body: 'Registrations are now live for the 36-Hour National Hackathon. Verified active members receive 60% discounted entry and guaranteed lab workstation slots.',
        priority: 'urgent',
        category: 'event',
        createdBy: coreUserMap['ethan@skyline.org'].id,
        publishedAt: generateDate(10, 14),
      },
      {
        title: 'Annual Financial Audit & Mid-Term Transparency Report',
        body: 'The treasury office has published the complete central ledger breakdown for Q1-Q3. All membership dues collections and verified expense payouts are accessible.',
        priority: 'important',
        category: 'finance',
        createdBy: coreUserMap['tara@skyline.org'].id,
        publishedAt: generateDate(5, 10),
      },
      {
        title: 'Official Club Varsity Hoodie & Merchandise Stock Restocked',
        body: 'Fresh stock for the signature varsity hoodie and classic cotton tees has been loaded in the merchandise store. Fast pickup available at the student activity center.',
        priority: 'normal',
        category: 'membership',
        createdBy: coreUserMap['admin@skyline.org'].id,
        publishedAt: generateDate(2, 4),
      },
      {
        title: 'Call for Student Volunteers: Tarangini 2026 Cultural Fest',
        body: 'We are recruiting 25 enthusiastic volunteers across stage production, door check-in, guest logistics, and social media coverage. Submit your interest via the task portal.',
        priority: 'important',
        category: 'event',
        createdBy: coreUserMap['ethan@skyline.org'].id,
        publishedAt: generateDate(1, 2),
      },
    ];

    for (const a of announcements) {
      const exAnn = await client.query('SELECT id FROM announcements WHERE title = $1;', [a.title]);
      if (exAnn.rows.length === 0) {
        await client.query(
          `INSERT INTO announcements (title, body, priority, category, status, created_by, published_at)
           VALUES ($1, $2, $3, $4, 'published', $5, $6);`,
          [a.title, a.body, a.priority, a.category, a.createdBy, a.publishedAt]
        );
      }
    }
    console.log(`✅ Announcements posted.`);

    await client.query('COMMIT');
    console.log('\n======================================================');
    console.log('🎉 400 STUDENT POPULATION SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log(`👤 Total Student Profiles: 400`);
    console.log(`💳 Active Memberships: ~300 | Expired: ~50 | Pending: ~50`);
    console.log(`🎟️ Event Tickets Booked: ${totalTicketsCreated} across 8 Events`);
    console.log(`🛍️ Store Orders Placed: ${ordersCreated} across 6 Products`);
    console.log(`💰 Central Ledger Transactions: Dues (${duesTxCount}) + Tickets (${totalTicketTx}) + Merch (${orderTxCreated}) + Fundraisers (${donationTxCount}) + Expenses (${expenseTxCreated})`);
    console.log(`📋 Kanban Tasks: ${tasksCount} across 4 Active Fundraisers`);
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during 400 student seed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed400Students()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed400Students };
