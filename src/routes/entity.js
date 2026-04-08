const express = require("express");
const router = express.Router();

const {
  findEntityBySlug,
  findEntityByExactName,
  findEntityByNormalizedName
} = require("../lib/entities/entityRepo");

const { normalizeString } = require("../lib/entities/normalize");

// OPTIONAL: if you have timeline, articles, publishers, etc.
// Replace these with your real data sources.
async function getTimelineForEntity(slug) {
  return [];
}

async function getArticlesForEntity(slug) {
  return [];
}

async function getPublishersForEntity(slug) {
  return {};
}

async function getRelatedEntities(slug) {
  return [];
}

async function getTopicsForEntity(slug) {
  return [];
}

async function getRiskForEntity(slug) {
  return {};
}

async function getAlertsForEntity(slug) {
  return [];
}

async function getForecastForEntity(slug) {
  return {};
}

async function getComparisonForEntity(slug) {
  return {};
}

async function getInsightsForEntity(slug) {
  return {};
}

// ---------------------------------------------------------
// GET /entity/:slug
// ---------------------------------------------------------
router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();

    // 1. Try slug lookup
    let entity = await findEntityBySlug(slug);

    // 2. Try exact name match
    if (!entity) {
      entity = await findEntityByExactName(slug);
    }

    // 3. Try normalized name match
    if (!entity) {
      const norm = normalizeString(slug);
      entity = await findEntityByNormalizedName(norm);
    }

    if (!entity) {
      return res.status(404).json({ error: "Entity not found" });
    }

    // 4. Load all supporting datasets
    const [
      timeline,
      articles,
      publishers,
      related,
      topics,
      risk,
      alerts,
      forecast,
      comparison,
      insights
    ] = await Promise.all([
      getTimelineForEntity(entity.slug),
      getArticlesForEntity(entity.slug),
      getPublishersForEntity(entity.slug),
      getRelatedEntities(entity.slug),
      getTopicsForEntity(entity.slug),
      getRiskForEntity(entity.slug),
      getAlertsForEntity(entity.slug),
      getForecastForEntity(entity.slug),
      getComparisonForEntity(entity.slug),
      getInsightsForEntity(entity.slug)
    ]);

    // 5. Return the exact shape your frontend expects
    return res.json({
      entity,
      timeline,
      articles,
      publishers,
      related,
      topics,
      risk,
      alerts,
      forecast,
      comparison,
      insights
    });

  } catch (err) {
    console.error("Entity route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
