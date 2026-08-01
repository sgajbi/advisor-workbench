import { NextRequest, NextResponse } from "next/server";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { applyAdvisoryCopilotCallerContextHeaders } from "@/features/advisory-copilot/caller-context";
import { prepareAnalyticsUiProxyHeaders } from "@/features/analytics-observability/correlation";
import { applyAdvisorBookCallerContextHeaders } from "@/features/advisor-book/caller-context";
import { applyAdvisorCockpitCallerContextHeaders } from "@/features/advisor-cockpit/caller-context";
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
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const advisorBookAuthority = applyAdvisorBookCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
  });
  if (advisorBookAuthority.status === "rejected") {
    const rejection = advisorBookAuthorityRejection(advisorBookAuthority.reason);
    return NextResponse.json(
      { code: rejection.code, status: "rejected" },
      { status: rejection.status, headers: { "cache-control": "no-store" } },
    );
  }
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
  const advisorCockpitAuthority = applyAdvisorCockpitCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
    searchParams: request.nextUrl.searchParams,
    bodyText: requestBody,
  });
  if (advisorCockpitAuthority.status === "rejected") {
    const rejection = advisorCockpitAuthorityRejection(advisorCockpitAuthority.reason);
    return NextResponse.json(
      { code: rejection.code, status: "rejected" },
      { status: rejection.status, headers: { "cache-control": "no-store" } },
    );
  }
  const advisoryCopilotAuthority = applyAdvisoryCopilotCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
    bodyText: requestBody,
  });
  if (advisoryCopilotAuthority.status === "rejected") {
    const rejection = advisoryCopilotAuthorityRejection(advisoryCopilotAuthority.reason);
    return NextResponse.json(
      { code: rejection.code, status: "rejected" },
      { status: rejection.status, headers: { "cache-control": "no-store" } },
    );
  }
  const reportingAuthority = applyReportOrderingRouteCallerContextHeaders(headers, {
    method: request.method,
    upstreamPath,
    searchParams: request.nextUrl.searchParams,
    bodyText: requestBody,
  });
  if (reportingAuthority.status === "rejected") {
    const rejection = reportingAuthorityRejection(reportingAuthority.reason);
    return NextResponse.json(
      {
        code: rejection.code,
        status: "rejected",
      },
      { status: rejection.status, headers: { "cache-control": "no-store" } },
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

function advisorCockpitAuthorityRejection(
  reason: Exclude<
    ReturnType<typeof applyAdvisorCockpitCallerContextHeaders>,
    { status: "not_applicable" } | { status: "applied" }
  >["reason"],
): { code: string; status: number } {
  switch (reason) {
    case "authenticated_principal_required":
      return { code: "advisor_cockpit_authenticated_principal_required", status: 401 };
    case "advisor_cockpit_scope_not_entitled":
      return { code: "advisor_cockpit_scope_not_entitled", status: 403 };
    case "invalid_advisor_cockpit_request":
      return { code: "advisor_cockpit_invalid_request", status: 422 };
    case "unsupported_advisor_cockpit_route":
      return { code: "advisor_cockpit_route_not_supported", status: 404 };
    case "development_authority_not_allowed":
    case "invalid_authority_mode":
    case "invalid_advisor_cockpit_configuration":
      return { code: "advisor_cockpit_authority_configuration_rejected", status: 500 };
  }
}

function advisorBookAuthorityRejection(
  reason: Exclude<
    ReturnType<typeof applyAdvisorBookCallerContextHeaders>,
    { status: "not_applicable" } | { status: "applied" }
  >["reason"],
): { code: string; status: number } {
  switch (reason) {
    case "authenticated_principal_required":
      return { code: "advisor_book_authenticated_principal_required", status: 401 };
    case "development_authority_not_allowed":
    case "invalid_authority_mode":
    case "invalid_advisor_book_configuration":
      return { code: "advisor_book_authority_configuration_rejected", status: 500 };
  }
}

function advisoryCopilotAuthorityRejection(
  reason: Exclude<
    ReturnType<typeof applyAdvisoryCopilotCallerContextHeaders>,
    { status: "not_applicable" } | { status: "applied" }
  >["reason"],
): { code: string; status: number } {
  switch (reason) {
    case "authenticated_principal_required":
      return { code: "advisory_copilot_authenticated_principal_required", status: 401 };
    case "invalid_advisory_copilot_request":
      return { code: "advisory_copilot_invalid_request", status: 422 };
    case "development_authority_not_allowed":
    case "invalid_authority_mode":
    case "invalid_advisory_copilot_configuration":
      return { code: "advisory_copilot_authority_configuration_rejected", status: 500 };
  }
}

function reportingAuthorityRejection(
  reason: Exclude<
    ReturnType<typeof applyReportOrderingRouteCallerContextHeaders>,
    { status: "not_applicable" } | { status: "applied" }
  >["reason"],
): { code: string; status: number } {
  switch (reason) {
    case "authenticated_principal_required":
      return { code: "reporting_authenticated_principal_required", status: 401 };
    case "reporting_scope_not_entitled":
      return { code: "reporting_scope_not_entitled", status: 403 };
    case "invalid_reporting_request":
      return { code: "reporting_invalid_request", status: 422 };
    case "development_authority_not_allowed":
    case "invalid_authority_mode":
    case "invalid_reporting_configuration":
      return { code: "reporting_authority_configuration_rejected", status: 500 };
  }
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

