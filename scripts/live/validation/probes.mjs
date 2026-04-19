import dns from "node:dns/promises";

export async function checkDns(summary, hostname, { required = true, lookup = dns.lookup } = {}) {
  try {
    const resolution = await lookup(hostname);
    const result = { hostname, ok: true, address: resolution.address, required };
    summary.dns.push(result);
    return result;
  } catch (error) {
    const result = {
      hostname,
      ok: false,
      required,
      warning: `Optional canonical host '${hostname}' is not resolvable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
    summary.dns.push(result);
    if (required) {
      throw new Error(
        `Canonical host '${hostname}' is not resolvable. Update your hosts/DNS mapping before running the live validation again.`
      );
    }
    return result;
  }
}

export async function fetchJson(
  summary,
  url,
  description,
  timeoutMs,
  fetchImpl = globalThis.fetch
) {
  return await sendJson(summary, url, description, timeoutMs, {
    fetchImpl,
  });
}

export async function postJson(
  summary,
  url,
  description,
  timeoutMs,
  body,
  fetchImpl = globalThis.fetch
) {
  return await sendJson(summary, url, description, timeoutMs, {
    method: "POST",
    body,
    fetchImpl,
  });
}

export async function sendJson(
  summary,
  url,
  description,
  timeoutMs,
  { method = "GET", body: requestBody, headers = {}, fetchImpl = globalThis.fetch } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      signal: controller.signal,
      headers:
        requestBody === undefined
          ? headers
          : {
              "Content-Type": "application/json",
              ...headers,
            },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      const detail = errorBody.trim() ? `: ${errorBody.trim()}` : "";
      throw new Error(`${description} failed (${response.status}) at ${url}${detail}`);
    }
    const responseBody = await response.text();
    if (!responseBody.trim()) {
      throw new Error(`${description} returned HTTP ${response.status} with an empty body at ${url}`);
    }
    let payload;
    try {
      payload = JSON.parse(responseBody);
    } catch (error) {
      throw new Error(
        `${description} returned non-JSON content at ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    summary.apiChecks.push({
      description,
      url,
      status: response.status,
      kind: "json",
      method,
    });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(
  summary,
  url,
  description,
  timeoutMs,
  fetchImpl = globalThis.fetch
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const payload = await response.text();
    summary.apiChecks.push({ description, url, status: response.status, kind: "text", method: "GET" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}
