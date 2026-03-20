// src/services/topicService.js
const client = require('./aiClient');

async function classifyTopics(text) {
  const payload = {
    messages: [
      {
        role: "user",
        content: `Analyze the following text and identify the topics it relates to.

Choose ONLY from this list:
- politics
- economy
- crime
- education
- health
- service delivery
- corruption
- infrastructure
- social issues

If the text is unclear, choose the closest matching topics.
Always return AT LEAST one topic.

Respond ONLY with valid JSON in this format:
{"topics":["topic1","topic2"]}

Text: "${text}"`
      }
    ],
    max_tokens: 100
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
    console.error("Topic JSON parse error:", err, "Raw:", str);
    return { topics: [] };
  }
}

module.exports = { classifyTopics };
