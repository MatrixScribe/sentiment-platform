require("dotenv").config();

// Reddit pipeline
const { runRedditScraper } = require("../scrapers/redditScraper");
const { runRedditProcessor } = require("../scrapers/processRedditPosts");
const { runRedditDailyAggregation } = require("../scrapers/aggregateRedditDaily");

// News pipeline
const { runNewsScraper } = require("../scrapers/newsScraper");
const { runNewsProcessor } = require("../scrapers/processNews");
const { runNewsDailyAggregation } = require("../scrapers/aggregateNewsDaily");

// Cross‑source + narrative intelligence
const { runCrossSourceAggregation } = require("../scrapers/aggregateCrossSource");
const { runNarrativeShiftDetection } = require("../scrapers/detectNarrativeShifts");
const { runNarrativeAlertsEngine } = require("../scrapers/generateNarrativeAlerts");

async function runDailyPipeline() {
  console.log("🚀 Running Daily Intelligence Pipeline...");

  try {
    // 1. Reddit
    console.log("🔹 Reddit: Scraping...");
    await runRedditScraper();

    console.log("🔹 Reddit: Processing...");
    await runRedditProcessor();

    console.log("🔹 Reddit: Daily Aggregation...");
    await runRedditDailyAggregation();

    // 2. News
    console.log("📰 News: Scraping...");
    await runNewsScraper();

    console.log("📰 News: Processing...");
    await runNewsProcessor();

    console.log("📰 News: Daily Aggregation...");
    await runNewsDailyAggregation();

    // 3. Cross‑Source Fusion
    console.log("🌐 Cross‑Source Aggregation...");
    await runCrossSourceAggregation();

    // 4. Narrative Intelligence
    console.log("🧠 Detecting Narrative Shifts...");
    await runNarrativeShiftDetection();

    console.log("⚠️ Generating Narrative Alerts...");
    await runNarrativeAlertsEngine();

    console.log("🎉 Daily Intelligence Pipeline Complete.");
  } catch (err) {
    console.error("❌ Pipeline Error:", err.message);
  }
}

if (require.main === module) {
  runDailyPipeline().then(() => process.exit(0));
}

module.exports = { runDailyPipeline };
