// src/routes/guardianIngestRoute.js
const express = require("express");
const router = express.Router();
const Parser = require("rss-parser");
const parser = new Parser();
const { ingestPost } = require("../services/ingestPipeline");

router.post("/guardian", async (req, res) => {
  try {
    const FEED_URL = "https://www.theguardian.com/world/rss";
    const tenantId = "global"; // or req.user.tenant_id

    const feed = await parser.parseURL(FEED_URL);
    const results = [];

    for (const item of feed.items) {
      const content = `${item.title}\n\n${item.contentSnippet || ""}`;
      const externalId = item.link;

      const result = await ingestPost({
        sourceKey: "Guardian",
        sourceCode: "guardian",
        tenantId,
        externalId,
        content,
        allowHashDedupe: true,
        hashConstraint: "unique_post_source",
        applySourceWeight: true
      });

      if (result) results.push(result);
    }

    res.json({ ok: true, ingested: results.length, posts: results });
  } catch (err) {
    console.error("Guardian ingest error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
