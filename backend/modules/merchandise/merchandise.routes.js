const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ module: 'merchandise', status: 'ready' });
});

module.exports = router;
