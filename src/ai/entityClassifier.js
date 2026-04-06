// src/ai/entityClassifier.js
const OpenAI = require("openai");
const db = require("../db");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function detectEntityAI(postText) {
  const entities = await db.getAllEntitiesWithDescriptions();

  if (!entities || entities.length === 0) {
    console.warn("⚠️ No entities found in database.");
    return null;
  }

  const prompt = `
You are an entity classification engine.

Below is a list of entities. Each entity has a name and a description.

Entities:
${entities.map(e => `- ${e.name}: ${e.description || "No description provided."}`).join("\n")}

Task:
Given the following post, determine which entity it refers to.
If none match, return "none".

Post:
"${postText}"

Return ONLY the entity name or "none".
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const entityName = response.choices[0].message.content.trim();
    return entityName === "none" ? null : entityName;

  } catch (err) {
    console.error("❌ GPT‑4o entity detection error:", err);
    return null;
  }
}

module.exports = { detectEntityAI };
