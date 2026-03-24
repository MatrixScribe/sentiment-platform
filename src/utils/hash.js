// src/utils/hash.js
const crypto = require("crypto");

function hashContent(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = hashContent;
