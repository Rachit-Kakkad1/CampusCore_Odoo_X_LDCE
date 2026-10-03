/**
 * Shared Application Constants
 */
module.exports = {
  // Financial & Inventory Defaults
  MEMBERSHIP_DUES: 500.00,
  MERCH_DISCOUNT: 0.10, // 10% discount for active members
  LOW_STOCK_THRESHOLD: 5,

  // User Roles
  ROLES: {
    ADMIN: 'admin',
    TREASURER: 'treasurer',
    EVENT_MANAGER: 'event_manager',
    VOLUNTEER: 'volunteer',
    MEMBER: 'member',
    GUEST: 'guest',
  },

  // Dues Statuses (State truth in DB: pending / paid; ACTIVE / EXPIRED are derived later)
  DUES_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
  },

  // Ticket Price Types & Payment Statuses
  PRICE_TYPES: {
    MEMBER: 'member',
    NON_MEMBER: 'non_member',
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },

  // Task Statuses
  TASK_STATUS: {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },

  // Expense Statuses
  EXPENSE_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REIMBURSED: 'reimbursed',
  },

  // Financial Transaction Source Types
  TRANSACTION_SOURCE: {
    DUES: 'dues',
    TICKET: 'ticket',
    MERCH: 'merch',
    FUNDRAISER: 'fundraiser', // source_id must be fundraiser_income.id
    EXPENSE: 'expense',
  },

  // Transaction Directions
  TRANSACTION_DIRECTION: {
    IN: 'in',
    OUT: 'out',
  },

  // Payment Modes
  PAYMENT_MODE: {
    CASH: 'cash',
    ONLINE: 'online',
    UPI: 'upi',
    CARD: 'card',
  },

  // Transaction Statuses
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
  },

  // Secrets via environment variable
  get QR_SECRET() {
    return process.env.QR_SECRET || '';
  },
  get JWT_SECRET() {
    return process.env.JWT_SECRET || '';
  },
};
