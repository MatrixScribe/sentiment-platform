require("dotenv").config();
const { pool } = require("../db");
const { runNarrativeShiftDetection } = require("./detectNarrativeShifts");

// simple thresholds – you can tune these later
const DIVERGENCE_THRESHOLD = 20;   // %
const OVERLAP_DROP_THRESHOLD = 30; // %
const ENTITY_VELOCITY_THRESHOLD = 5;

async function saveNarrativeAlert(shift) {
  const highDivergence = shift.divergenceSpike > DIVERGENCE_THRESHOLD;
  const lowOverlap = shift.overlapDrop < -OVERLAP_DROP_THRESHOLD;
  const asymmetricNarrative =
    (shift.redditNewEntities || []).length > ENTITY_VELOCITY_THRESHOLD ||
    (shift.newsNewEntities || []).length > ENTITY_VELOCITY_THRESHOLD;

  const triggered = highDivergence || lowOverlap || asymmetricNarrative;
  if (!triggered) {
    console.log("No alert triggered for", shift.date);
    return null;
  }

  const res = await pool.query(
    `
    INSERT INTO narrative_alerts (
      date,
      divergence_spike,
      overlap_drop,
      reddit_new_entities,
      reddit_dropped_entities,
      news_new_entities,
      news_dropped_entities,
      high_divergence,
      low_overlap,
      asymmetric_narrative
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      shift.date,
      shift.divergenceSpike,
      shift.overlapDrop,
      JSON.stringify(shift.redditNewEntities || []),
      JSON.stringify(shift.redditDroppedEntities || []),
      JSON.stringify(shift.newsNewEntities || []),
      JSON.stringify(shift.newsDroppedEntities || []),
      highDivergence,
      lowOverlap,
      asymmetricNarrative
    ]
  );

  const alert = res.rows[0];
  console.log("Narrative alert created:", alert.id, alert.date);
  return alert;
}

async function runNarrativeAlertsEngine() {
  console.log("Running Narrative Alerts Engine...");
  const shift = await runNarrativeShiftDetection();
  if (!shift) {
    console.log("No shift data available.");
    return;
  }
  await saveNarrativeAlert(shift);
}

if (require.main === module) {
  runNarrativeAlertsEngine().then(() => process.exit(0));
}

module.exports = { runNarrativeAlertsEngine };
