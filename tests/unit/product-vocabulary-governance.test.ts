import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readRepositoryFile(path: string): string {
  return readFileSync(join(process.cwd(), ...path.split("/")), "utf8");
}

describe("Workbench product vocabulary governance", () => {
  const vocabulary = readRepositoryFile(
    "docs/documentation/product-vocabulary.md",
  );
  const wiki = readRepositoryFile("wiki/Product-Vocabulary.md");

  it("defines the business concepts that must not collapse into synonyms", () => {
    for (const term of [
      "Portfolio",
      "Adviser book",
      "Positions",
      "Projected cash flow",
      "Report centre",
      "Attention item",
      "Exception",
      "Availability",
      "Review readiness",
      "Evidence coverage",
      "As-of date",
      "Valuation date",
      "Base currency",
      "Reporting currency",
      "Instrument currency",
      "Transaction currency",
      "Time-weighted return (TWR)",
      "Money-weighted return (MWR)",
      "Suitability review",
      "Rebalance instruction",
      "rebalance wave",
      "rebalance campaign",
    ]) {
      expect(vocabulary, term).toContain(term);
    }
  });

  it("keeps the reader-facing wiki indexed without creating a second runtime authority", () => {
    const home = readRepositoryFile("wiki/Home.md");
    const sidebar = readRepositoryFile("wiki/_Sidebar.md");

    expect(wiki).toContain("docs/documentation/product-vocabulary.md");
    expect(wiki).toContain("Runtime terms remain in their owning domain");
    expect(home).toContain("[Product Vocabulary](Product-Vocabulary)");
    expect(sidebar).toContain("[Product Vocabulary](Product-Vocabulary)");
  });

  it("records source boundaries and rejected shortcuts", () => {
    const normalizedVocabulary = vocabulary.replace(/\s+/g, " ");

    expect(normalizedVocabulary).toContain(
      "A reporting currency exists only after a supported request is accepted by the source",
    );
    expect(normalizedVocabulary).toContain(
      "TWR and MWR are calculation methods. NET and GROSS are fee bases.",
    );
    expect(normalizedVocabulary).toContain(
      "Never infer execution-only from absent advice, data, or controls",
    );
    expect(normalizedVocabulary).toContain("not a second application copy registry");
  });

  it("keeps repository context and research decisions aligned", () => {
    const context = readRepositoryFile("REPOSITORY-ENGINEERING-CONTEXT.md");
    const ledger = readRepositoryFile(
      "docs/product/WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md",
    );
    const section = ledger.split("## Product Vocabulary and Business Language")[1];

    expect(context).toContain("docs/documentation/product-vocabulary.md");
    expect(context).toContain("Runtime terms remain in their owning");
    expect(section).toContain("### Adopted decisions");
    expect(section).toContain("### Rejected decisions");
    expect(section).toContain("blind synonym replacement");
  });
});
