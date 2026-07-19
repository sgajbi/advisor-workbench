import http from "node:http";

const DEFAULT_PORT = 3000;
const REQUEST_TIMEOUT_MS = 4_000;

const configuredPort = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
  console.error("Workbench health check failed: PORT must be a valid TCP port.");
  process.exitCode = 1;
} else {
  const request = http.get(
    {
      host: "127.0.0.1",
      port: configuredPort,
      path: "/",
      headers: { "User-Agent": "lotus-workbench-healthcheck" },
    },
    (response) => {
      const statusCode = response.statusCode ?? 0;
      response.resume();

      if (statusCode < 200 || statusCode >= 400) {
        console.error(`Workbench health check failed: HTTP ${statusCode}.`);
        process.exitCode = 1;
      }
    },
  );

  request.setTimeout(REQUEST_TIMEOUT_MS, () => {
    request.destroy(new Error("Workbench health check timed out."));
  });
  request.on("error", (error) => {
    console.error(`Workbench health check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
