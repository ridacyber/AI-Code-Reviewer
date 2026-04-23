const { getGroqKey, sendJson } = require("../lib/groq");

module.exports = (req, res) => {
  sendJson(res, 200, {
    ok: true,
    hasGroqKey: Boolean(getGroqKey())
  });
};
