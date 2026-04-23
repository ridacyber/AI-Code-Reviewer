const http = require("http");
const fs = require("fs");
const path = require("path");

const { getGroqKey, handleReviewRequest, loadDotEnv, sendJson } = require("./lib/groq");

loadDotEnv();

const PORT = Number(process.env.PORT) || 8000;
const HOST = "127.0.0.1";
const INDEX_PATH = path.join(__dirname, "index.html");
const FAVICON_PATH = path.join(__dirname, "favicon.svg");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = fs.readFileSync(INDEX_PATH, "utf8");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(html);
    return;
  }

  if (req.method === "GET" && url.pathname === "/favicon.svg") {
    const svg = fs.readFileSync(FAVICON_PATH, "utf8");
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    });
    res.end(svg);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      hasGroqKey: Boolean(getGroqKey())
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/review") {
    await handleReviewRequest(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`ReviewAI server running at http://${HOST}:${PORT}`);
});
