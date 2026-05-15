export function preserveBusinessAcronyms(value: string): string {
  return value.replace(/\b(Pm|Hr|Oms|Dpm|Ai|Usd)\b/g, (match) => match.toUpperCase());
}
