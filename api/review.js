const { handleReviewRequest, sendJson } = require("../lib/groq");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  await handleReviewRequest(req, res);
};
