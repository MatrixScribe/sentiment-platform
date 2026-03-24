const cron = require("node-cron");
const fetch = require("node-fetch");
const { runDailyPipeline } = require("./dailyCron");

const BASE_URL = process.env.BASE_URL || "https://sentiment-platform-zgr8.onrender.com";
const CRON_TOKEN = process.env.CRON_TOKEN;

// ---------------- DAILY PIPELINE (02:00 AM) ----------------
cron.schedule("0 2 * * *", () => {
  console.log("⏰ Running scheduled daily pipeline...");
  runDailyPipeline();
});

// ---------------- REDDIT INGESTION (every 2 hours) ----------------
cron.schedule("0 */2 * * *", async () => {
  try {
    console.log("⏰ CRON: Running Reddit ingestion...");

    await fetch(`${BASE_URL}/api/ingest/reddit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_TOKEN}`
      },
      body: JSON.stringify({
        subreddit: "southafrica",
        limit: 10
      })
    });

    console.log("✅ CRON: Reddit ingestion complete.");
  } catch (err) {
    console.error("❌ CRON Reddit error:", err.message);
  }
});

// ---------------- NEWS INGESTION (every 4 hours) ----------------
cron.schedule("0 */4 * * *", async () => {
  try {
    console.log("⏰ CRON: Running News ingestion...");

    await fetch(`${BASE_URL}/api/ingest/news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_TOKEN}`
      },
      body: JSON.stringify({
        query: "south africa",
        limit: 10
      })
    });

    console.log("✅ CRON: News ingestion complete.");
  } catch (err) {
    console.error("❌ CRON News error:", err.message);
  }
});
