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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`${description} returned HTTP ${response.status} with an empty body at ${url}`);
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error(
        `${description} returned non-JSON content at ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    summary.apiChecks.push({ description, url, status: response.status, kind: "json" });
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
    summary.apiChecks.push({ description, url, status: response.status, kind: "text" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}
