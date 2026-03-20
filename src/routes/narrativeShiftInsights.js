// src/routes/narrativeShiftInsights.js
const express = require("express");
const router = express.Router();
const { runNarrativeShiftDetection } = require("../scrapers/detectNarrativeShifts");

// ---------------- NARRATIVE SHIFT ENDPOINT ----------------
router.get("/shifts", async (req, res) => {
  try {
    const shift = await runNarrativeShiftDetection();

    res.json({
      success: true,
      data: shift
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
