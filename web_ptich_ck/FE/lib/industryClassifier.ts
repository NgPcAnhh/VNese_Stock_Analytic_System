export function isBankingIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const keywords = ["ngân hàng", "ngan hang", "bank", "banking"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}

export function isInsuranceIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const keywords = ["bảo hiểm", "bao hiem", "insurance"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}

export function isFincoIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const explicitNonFinKeywords = ["phi tài chính", "phi tai chinh", "non-financial", "non financial"];
  if (normalized.some((text) => explicitNonFinKeywords.some((kw) => text.includes(kw)))) {
    return false;
  }

  const keywords = ["dịch vụ tài chính", "tài chính", "tai chinh", "financial", "finco"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}
