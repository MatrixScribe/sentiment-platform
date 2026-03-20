const express = require('express');
const router = express.Router();

const healthRoutes = require('./health');
const ingestRoutes = require('./ingest');
const adminRoutes = require('./admin');

router.use('/health', healthRoutes);
router.use('/ingest', ingestRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
