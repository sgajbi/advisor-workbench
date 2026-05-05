import { NextRequest, NextResponse } from "next/server";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { prepareAnalyticsUiProxyHeaders } from "@/features/analytics-observability/correlation";
import { applyDefaultCallerContextHeaders } from "@/features/workbench/caller-context";

async function proxy(request: NextRequest, params: { path: string[] }) {
  const upstreamPath = params.path.join("/");
  const search = request.nextUrl.search;
  const url = `${resolveGatewayBaseUrl()}/${upstreamPath}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  applyDefaultCallerContextHeaders(headers);
  const upstreamHeaders = prepareAnalyticsUiProxyHeaders(headers);

  const response = await fetch(url, {
    method: request.method,
    headers: upstreamHeaders,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text(),
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params);
}

