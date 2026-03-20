// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { getCoreTopics } = require('../services/topicConfigService');

router.get('/topics', (req, res) => {
  res.json({ topics: getCoreTopics() });
});

module.exports = router;
