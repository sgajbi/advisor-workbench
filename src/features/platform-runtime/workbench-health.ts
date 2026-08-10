import {
  resolveGatewayRequestTimeoutMs,
} from "@/features/platform-runtime/gateway-request-policy";
import {
  resolveGatewayBaseUrl,
  resolveLotusEnvironment,
  type RuntimeEnvironment,
} from "@/features/platform-runtime/service-addressing";

const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const LOCAL_DEVELOPMENT_DEPLOYMENT_ID = "local-development";

export interface WorkbenchReadiness {
  status: "ready" | "not_ready";
  service: "lotus-workbench";
  environment: string;
  deployment_id: string | null;
  gateway_origin: string | null;
  gateway_timeout_ms: number | null;
  certification_posture:
    | "local_non_certifying"
    | "configuration_valid_non_certifying"
    | "not_ready";
  failures: string[];
}

export function assessWorkbenchReadiness(
  environment: RuntimeEnvironment = process.env,
): WorkbenchReadiness {
  const lotusEnvironment = resolveLotusEnvironment(environment);
  const failures: string[] = [];
  let gatewayOrigin: string | null = null;
  let gatewayTimeoutMs: number | null = null;

  try {
    gatewayOrigin = new URL(resolveGatewayBaseUrl(environment)).origin;
  } catch {
    failures.push("gateway_configuration_invalid");
  }

  try {
    gatewayTimeoutMs = resolveGatewayRequestTimeoutMs(
      environment.WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS,
    );
  } catch {
    failures.push("gateway_timeout_configuration_invalid");
  }

  const configuredDeploymentId = environment.WORKBENCH_DEPLOYMENT_ID?.trim();
  const developmentEnvironment = lotusEnvironment === "dev";
  const deploymentId = configuredDeploymentId ||
    (developmentEnvironment ? LOCAL_DEVELOPMENT_DEPLOYMENT_ID : null);
  if (deploymentId && !DEPLOYMENT_ID_PATTERN.test(deploymentId)) {
    failures.push("deployment_identity_invalid");
  } else if (!deploymentId) {
    failures.push("deployment_identity_required");
  }

  return {
    status: failures.length === 0 ? "ready" : "not_ready",
    service: "lotus-workbench",
    environment: lotusEnvironment,
    deployment_id: deploymentId,
    gateway_origin: gatewayOrigin,
    gateway_timeout_ms: gatewayTimeoutMs,
    certification_posture:
      failures.length > 0
        ? "not_ready"
        : developmentEnvironment
          ? "local_non_certifying"
          : "configuration_valid_non_certifying",
    failures,
  };
}
