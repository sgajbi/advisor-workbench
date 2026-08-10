import { NextResponse } from "next/server";

import { recordAnalyticsUiExternalMetricEvent } from "@/features/analytics-observability/metrics";

const MAX_METRIC_EVENT_BYTES = 16_384;
const RESPONSE_HEADERS = { "cache-control": "no-store" } as const;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_METRIC_EVENT_BYTES) {
    return rejectedPayloadTooLarge();
  }

  let payload: unknown;
  try {
    const body = await readBoundedBody(request);
    payload = JSON.parse(body);
  } catch (error) {
    if (error instanceof MetricEventPayloadTooLargeError) {
      return rejectedPayloadTooLarge();
    }
    return NextResponse.json(
      { status: "rejected" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  try {
    recordAnalyticsUiExternalMetricEvent(payload);
  } catch {
    return NextResponse.json(
      { status: "rejected" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  return NextResponse.json(
    { status: "accepted" },
    { status: 202, headers: RESPONSE_HEADERS },
  );
}

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) {
    return "";
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return body + decoder.decode();
    }
    bytesRead += value.byteLength;
    if (bytesRead > MAX_METRIC_EVENT_BYTES) {
      await reader.cancel();
      throw new MetricEventPayloadTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }
}

function rejectedPayloadTooLarge() {
  return NextResponse.json(
    { code: "metric_payload_too_large", status: "rejected" },
    { status: 413, headers: RESPONSE_HEADERS },
  );
}

class MetricEventPayloadTooLargeError extends Error {}
