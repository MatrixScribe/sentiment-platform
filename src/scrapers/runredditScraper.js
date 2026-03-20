// scripts/runRedditScraper.js
require("dotenv").config();
const { runRedditScraper } = require("../scrapers/redditScraper");

runRedditScraper().then(() => {
  console.log("Done.");
  process.exit(0);
});
