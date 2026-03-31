const express = require('express');
const router = express.Router();

// TEMPORARY MOCK DATA — replace with DB later
const ENTITY_CORE = {
  sarb: {
    id: "c7e2a4f1-9b3d-4c8e-9d3f-2a1b4e7f9c12",
    slug: "sarb",
    name: "South African Reserve Bank",
    type: "organization",
    sector: "Finance",
    country: "ZA"
  }
};

// GET /api/entity/:slug
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const entity = ENTITY_CORE[slug];

  if (!entity) {
    return res.status(404).json({ error: "Entity not found" });
  }

  // 20‑module contract (empty placeholders for now)
  return res.json({
    entity,
    timeline: [],
    articles: [],
    publishers: [],
    topics: [],
    related: [],
    forecast: [],
    alerts: [],
    events: [],
    risk: {},
    comparison: []
  });
});

module.exports = router;
