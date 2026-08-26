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

export type UnresolvedProductCopyExpression = Readonly<{
  filePath: string;
  line: number;
  column: number;
  context: string;
  signature: string;
}>;

export type ProductCopySourceEvaluation = Readonly<{
  findings: ProductCopyFinding[];
  unresolvedExpressions: UnresolvedProductCopyExpression[];
}>;

export type ProductCopyRepositoryEvaluation = ProductCopySourceEvaluation & Readonly<{
  suppressedFindings: ProductCopyFinding[];
  policyErrors: string[];
  exceptionCount: number;
}>;

export function scanProductCopySource(
  source: ProductCopySource,
): ProductCopyFinding[];

export function evaluateProductCopySource(
  source: ProductCopySource,
): ProductCopySourceEvaluation;

export function scanProductCopyRepository(
  repositoryRoot?: string,
): ProductCopyFinding[];

export function evaluateProductCopyRepository(
  repositoryRoot?: string,
): ProductCopyRepositoryEvaluation;

export function productCopyUnresolvedDigest(
  unresolvedExpressions: UnresolvedProductCopyExpression[],
): string;
