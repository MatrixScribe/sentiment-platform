// src/utils/cleanXml.js

module.exports = function cleanXml(xml) {
  return xml
    // Remove XML declarations
    .replace(/<\?xml[^>]*>/g, "")
    // Remove invalid namespaces
    .replace(/xmlns(:\w+)?="[^"]*"/g, "")
    // Fix unescaped ampersands
    .replace(/&(?!(amp;|lt;|gt;|quot;|apos;))/g, "&amp;")
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
};
