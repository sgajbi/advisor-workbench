export type ProductCopyFinding = Readonly<{
  filePath: string;
  line: number;
  column: number;
  context: string;
  ruleId: string;
  text: string;
  remediation: string;
}>;

export type ProductCopySource = Readonly<{
  filePath: string;
  sourceText: string;
}>;

export function scanProductCopySource(
  source: ProductCopySource,
): ProductCopyFinding[];

export function scanProductCopyRepository(
  repositoryRoot?: string,
): ProductCopyFinding[];
