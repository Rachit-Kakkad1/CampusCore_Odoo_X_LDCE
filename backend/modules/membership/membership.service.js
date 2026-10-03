// backend/modules/membership/membership.service.js
const membershipRepository = require('./membership.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const { createTransaction } = require('../../shared/transactions/createTransaction');

const membershipService = {
  // Business logic to be implemented in Membership phase
};

module.exports = membershipService;
