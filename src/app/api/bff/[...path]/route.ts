import { NextRequest, NextResponse } from "next/server";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { prepareAnalyticsUiProxyHeaders } from "@/features/analytics-observability/correlation";
import {
  applyDefaultCallerContextHeaders,
  applyIdeaRouteCallerContextHeaders,
  applyReportOrderingRouteCallerContextHeaders,
} from "@/features/workbench/caller-context";

async function proxy(request: NextRequest, params: { path: string[] }) {
  const upstreamPath = params.path.join("/");
  const search = request.nextUrl.search;
  const url = `${resolveGatewayBaseUrl()}/${upstreamPath}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  applyDefaultCallerContextHeaders(headers);
  const ideaAuthority = applyIdeaRouteCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
  });
  if (ideaAuthority.status === "rejected") {
    return NextResponse.json(
      {
        code:
          ideaAuthority.reason === "authenticated_principal_required"
            ? "idea_authenticated_principal_required"
            : ideaAuthority.reason === "unsupported_idea_route"
              ? "idea_route_not_supported"
            : "idea_authority_configuration_rejected",
        status: "rejected",
      },
      {
        status:
          ideaAuthority.reason === "authenticated_principal_required"
            ? 401
            : ideaAuthority.reason === "unsupported_idea_route"
              ? 404
              : 500,
        headers: { "cache-control": "no-store" },
      },
    );
  }
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const reportingAuthority = applyReportOrderingRouteCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
    searchParams: request.nextUrl.searchParams,
    bodyText: requestBody,
  });
  if (reportingAuthority.status === "rejected") {
    const status =
      reportingAuthority.reason === "authenticated_principal_required"
        ? 401
        : reportingAuthority.reason === "reporting_scope_not_entitled"
          ? 403
          : reportingAuthority.reason === "invalid_reporting_request"
            ? 422
            : 500;
    return NextResponse.json(
      {
        code: `reporting_${reportingAuthority.reason}`,
        status: "rejected",
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
  const upstreamHeaders = prepareAnalyticsUiProxyHeaders(headers);

  const response = await fetch(url, {
    method: request.method,
    headers: upstreamHeaders,
    body: requestBody,
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

