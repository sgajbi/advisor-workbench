import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const documentationRoots = ["README.md", "docs", "wiki"];

function collectMarkdownFiles(entry: string): string[] {
  const absoluteEntry = join(repositoryRoot, entry);

  if (extname(entry) === ".md") {
    return [absoluteEntry];
  }

  return readdirSync(absoluteEntry, { withFileTypes: true }).flatMap(
    (directoryEntry) => {
      const child = join(absoluteEntry, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        return collectMarkdownFiles(relative(repositoryRoot, child));
      }

      return extname(directoryEntry.name) === ".md" ? [child] : [];
    },
  );
}

function findNonPortableLinks(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const findings: string[] = [];

  for (const match of source.matchAll(/\]\(([^)\r\n]*)\)/g)) {
    const destination = match[1];

    if (!destination.includes("\\")) {
      continue;
    }

    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push(
      `${relative(repositoryRoot, filePath).replaceAll("\\", "/")}:${line} -> ${destination}`,
    );
  }

  return findings;
}

function findBrokenRelativeLinks(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  const findings: string[] = [];

  for (const match of source.matchAll(/\]\(([^)\r\n]*)\)/g)) {
    const destination = match[1];

    if (!destination.startsWith(".")) {
      continue;
    }

    const repositoryPath = destination.split(/[?#]/, 1)[0];
    const absoluteDestination = resolve(dirname(filePath), repositoryPath);

    if (existsSync(absoluteDestination)) {
      continue;
    }

    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push(
      `${relative(repositoryRoot, filePath).replaceAll("\\", "/")}:${line} -> ${destination}`,
    );
  }

  return findings;
}

describe("Documentation link portability", () => {
  it("uses URL path separators in every Markdown link destination", () => {
    const findings = documentationRoots
      .flatMap(collectMarkdownFiles)
      .flatMap(findNonPortableLinks);

    expect(findings).toEqual([]);
  });

  it("keeps repository-relative Markdown links on committed paths", () => {
    const findings = documentationRoots
      .flatMap(collectMarkdownFiles)
      .flatMap(findBrokenRelativeLinks);

    expect(findings).toEqual([]);
  });
});
