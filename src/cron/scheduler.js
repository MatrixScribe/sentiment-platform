const cron = require("node-cron");
const { runDailyPipeline } = require("./dailyCron");

// Run every day at 02:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("⏰ Running scheduled daily pipeline...");
  runDailyPipeline();
});
