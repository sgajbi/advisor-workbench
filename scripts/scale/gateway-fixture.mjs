import http from "node:http";

const port = 8080;
const maxBodyBytes = 16_384;
let persistedVersion = 0;
let persistedActionId = null;

const server = http.createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json");

  if (request.method === "GET" && request.url === "/health") {
    return writeJson(response, 200, { status: "healthy", service: "scale-proof-gateway" });
  }
  if (request.method === "GET" && request.url === "/api/v1/scale-proof/state") {
    return writeJson(response, 200, {
      source: "scale-proof-gateway-fixture",
      persisted_version: persistedVersion,
      persisted_action_id: persistedActionId,
    });
  }
  if (request.method === "POST" && request.url === "/api/v1/scale-proof/actions") {
    try {
      const payload = JSON.parse(await readBody(request));
      if (!payload || typeof payload.action_id !== "string" || payload.action_id.length > 128) {
        return writeJson(response, 422, { status: "rejected" });
      }
      persistedVersion += 1;
      persistedActionId = payload.action_id;
      return writeJson(response, 201, {
        status: "persisted",
        source: "scale-proof-gateway-fixture",
        persisted_version: persistedVersion,
        persisted_action_id: persistedActionId,
      });
    } catch {
      return writeJson(response, 400, { status: "rejected" });
    }
  }
  return writeJson(response, 404, { status: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Scale-proof Gateway fixture listening on ${port}.`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function writeJson(response, status, body) {
  response.writeHead(status);
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) {
      request.destroy();
      throw new Error("payload too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
