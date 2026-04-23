const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env");
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function loadDotEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const envText = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function getGroqKey() {
  loadDotEnv();
  return process.env.GROQ_API_KEY || "";
}

async function readRequestBody(req) {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(new Error("Invalid JSON request body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleReviewRequest(req, res) {
  const apiKey = getGroqKey();
  if (!apiKey) {
    sendJson(res, 500, { error: "Server is missing GROQ_API_KEY" });
    return;
  }

  try {
    const payload = await readRequestBody(req);
    const upstream = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      sendJson(res, upstream.status, { error: errorText || "Groq request failed" });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Connection", "keep-alive");

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unexpected server error" });
  }
}

module.exports = {
  getGroqKey,
  handleReviewRequest,
  loadDotEnv,
  sendJson
};
