// src/services/topicConfigService.js
const CORE_TOPICS = [
  { id: 'ECONOMY', label: 'Economy' },
  { id: 'CRIME_SAFETY', label: 'Crime & Safety' },
  { id: 'POLITICS_GOVERNANCE', label: 'Politics & Governance' },
  { id: 'PUBLIC_SERVICES', label: 'Public Services' },
  { id: 'SOCIAL_ISSUES', label: 'Social Issues' },
  { id: 'BUSINESS_WORK', label: 'Business & Work' },
  { id: 'INTERNATIONAL', label: 'International & Geopolitics' },
  { id: 'ENVIRONMENT', label: 'Environment & Climate' },
];

function getCoreTopics() {
  return CORE_TOPICS;
}

module.exports = { getCoreTopics };
