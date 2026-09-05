const HOP_BY_HOP_RESPONSE_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
] as const;

export type GatewayBffResponse = {
  body: ArrayBuffer | null;
  headers: Headers;
};

export async function readGatewayBffResponse(
  response: Response,
  requestMethod: string,
): Promise<GatewayBffResponse> {
  const headers = responseHeadersWithoutHopByHopFields(response.headers);

  if (responseMustBeBodyless(requestMethod, response.status)) {
    if (response.status === 204 || response.status === 205) {
      headers.delete("content-encoding");
      headers.delete("content-length");
    }
    return { body: null, headers };
  }

  const body = await response.arrayBuffer();

  // Fetch exposes decoded bytes. Re-emitting them with an upstream coding or
  // compressed length would make the response metadata contradict its body.
  headers.delete("content-encoding");
  headers.set("content-length", String(body.byteLength));

  return { body, headers };
}

function responseMustBeBodyless(requestMethod: string, status: number): boolean {
  return (
    requestMethod === "HEAD" || status === 204 || status === 205 || status === 304
  );
}

function responseHeadersWithoutHopByHopFields(
  upstreamHeaders: Headers,
): Headers {
  const headers = new Headers(upstreamHeaders);
  const connectionFields = headers
    .get("connection")
    ?.split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  for (const headerName of connectionFields ?? []) {
    headers.delete(headerName);
  }
  for (const headerName of HOP_BY_HOP_RESPONSE_HEADERS) {
    headers.delete(headerName);
  }

  return headers;
}
