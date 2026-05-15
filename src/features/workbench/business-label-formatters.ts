export function preserveBusinessAcronyms(value: string): string {
  return value.replace(/\b(Pm|Hr|Oms|Dpm|Ai|Usd|Id)\b/g, (match) => match.toUpperCase());
}
