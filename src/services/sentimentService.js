// src/services/sentimentService.js
const client = require('./aiClient');

async function analyzeSentiment(text) {
  const payload = {
    messages: [
      {
        role: "user",
        content: `Classify the sentiment of the following post. 
Respond ONLY with valid JSON in this format:
{"sentiment":"positive|negative|neutral","score":0.00}

Post: "${text}"`
      }
    ],
    max_tokens: 50
  };

  const response = await client.post('/chat/completions', payload);

  const raw = response.data.choices[0].message.content;

  return safeJson(raw);
}

function safeJson(str) {
  try {
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    const jsonString = str.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Sentiment JSON parse error:", err, "Raw:", str);
    return { sentiment: "neutral", score: 0.0 };
  }
}

module.exports = { analyzeSentiment };
