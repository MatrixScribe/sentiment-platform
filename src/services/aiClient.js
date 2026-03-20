// src/services/aiClient.js
require('dotenv').config();
const axios = require('axios');

const client = axios.create({
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  headers: {
    'api-key': process.env.AZURE_OPENAI_KEY,
    'Content-Type': 'application/json'
  },
  params: {
    'api-version': process.env.AZURE_OPENAI_API_VERSION
  }
});

module.exports = client;
