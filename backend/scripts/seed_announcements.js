// backend/scripts/seed_announcements.js
const { pool, query } = require('../db/connection');

async function seedAnnouncements() {
  console.log('🌱 Seeding rich demo announcements (categories, priorities, drafts)...');

  // Clear existing announcements for deterministic demo state
  await query('DELETE FROM announcements;');

  const announcementsData = [
    {
      title: 'Welcome to the New Academic Year 2026-2027!',
      body: 'Welcome all LDCE students to the new academic year! Explore clubs, orientation sessions, and leadership programs across campus.',
      priority: 'normal',
      category: 'academic',
      status: 'published',
      published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
    {
      title: 'Spring Gala 2026: Early Bird Passes Now Available',
      body: 'Early bird tickets for Spring Gala 2026 are officially released. Registered members receive an exclusive discount on passes!',
      priority: 'important',
      category: 'event',
      status: 'published',
      published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    },
    {
      title: 'Urgent: Electrical Maintenance & Auditorium Closure',
      body: 'Main campus auditorium will be closed this Wednesday due to emergency electrical maintenance. All sessions relocated to Hall B.',
      priority: 'urgent',
      category: 'urgent',
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      title: 'Annual Student Organization Membership Dues Deadline',
      body: 'Membership dues for this academic semester must be settled by next week to retain voting privileges and access to club resources.',
      priority: 'important',
      category: 'membership',
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      title: 'Q1 Financial Transparency & Budget Utilization Report',
      body: 'The treasurer has published the Q1 financial report. All transaction ledgers and fundraising revenues are accessible for student review.',
      priority: 'normal',
      category: 'finance',
      status: 'published',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      title: 'Volunteer Orientation and Team Sign-Up Camp',
      body: 'Join us this Friday at the Student Union Lounge for an interactive orientation camp. Discover open committee roles and earn service hours.',
      priority: 'normal',
      category: 'general',
      status: 'published',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      title: 'Hackathon Finalists Presentation Schedule (DRAFT)',
      body: 'Internal draft agenda for the upcoming hackathon finalist project showcases. Pending committee sign-off before official publication.',
      priority: 'important',
      category: 'event',
      status: 'draft',
      published_at: null,
    },
  ];

  for (const item of announcementsData) {
    await query(
      `INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, COALESCE($6, NOW()));`,
      [item.title, item.body, item.priority, item.category, item.status, item.published_at]
    );
  }

  console.log(`✅ Seeded ${announcementsData.length} announcements successfully.`);
}

if (require.main === module) {
  seedAnnouncements()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Announcements seeding error:', err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { seedAnnouncements };
