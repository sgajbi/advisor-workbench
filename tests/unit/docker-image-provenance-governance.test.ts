import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const CHECKOUT_LABEL = "com.lotus.repository.checkout";
const COMPOSE_CHECKOUT =
  "${PWD:?Docker Compose must resolve the Workbench checkout path}";

function readRepositoryFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), "utf8");
}

interface ComposeService {
  build?: {
    labels?: Record<string, string>;
  };
}

interface ComposeModel {
  services?: Record<string, ComposeService>;
}

interface WorkflowStep {
  run?: string;
}

interface WorkflowModel {
  jobs?: Record<string, { steps?: WorkflowStep[] }>;
}

function dockerBuildCommands(workflowName: string): string[] {
  const workflow = parseYaml(
    readRepositoryFile(".github", "workflows", workflowName),
  ) as WorkflowModel;

  return Object.values(workflow.jobs ?? {}).flatMap((job) =>
    (job.steps ?? [])
      .map((step) => step.run ?? "")
      .filter((command) => command.startsWith("docker build ")),
  );
}

describe("Docker image checkout provenance", () => {
  it.each([
    ["docker-compose.yml", "lotus-workbench"],
    ["docker-compose.ci-local.yml", "ci-local"],
  ])("labels the %s build from Compose's resolved checkout", (file, service) => {
    const compose = parseYaml(readRepositoryFile(file)) as ComposeModel;

    expect(compose.services?.[service]?.build?.labels).toEqual({
      [CHECKOUT_LABEL]: COMPOSE_CHECKOUT,
    });
  });

  it.each(["pr-merge-gate.yml", "main-releasability.yml"])(
    "labels every direct image build in %s with the exact runner checkout",
    (workflowName) => {
      const commands = dockerBuildCommands(workflowName);

      expect(commands).toHaveLength(2);
      for (const command of commands) {
        expect(command).toContain(
          `--label "${CHECKOUT_LABEL}=\${{ github.workspace }}"`,
        );
      }
    },
  );

  it("does not forge Docker-reserved Compose ownership labels", () => {
    const sources = [
      readRepositoryFile("docker-compose.yml"),
      readRepositoryFile("docker-compose.ci-local.yml"),
      readRepositoryFile("Dockerfile"),
    ].join("\n");

    expect(sources).not.toContain("com.docker.compose.project.working_dir:");
  });
});
