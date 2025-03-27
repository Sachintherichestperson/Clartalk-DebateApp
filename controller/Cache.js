const NodeCache = require("node-cache");

// Create a shared NodeCache instance
const nodeCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

module.exports = nodeCache;
