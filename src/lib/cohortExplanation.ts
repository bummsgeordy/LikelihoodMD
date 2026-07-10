import type { CalculationResult, EvidenceProfile } from "../types";

export interface CohortExplanation {
  title: string;
  positive: string;
  negative: string;
}

function roundedCount(value: number): number {
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function formatCount(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

export function cohortExplanationParts(
  profile: EvidenceProfile,
  result: CalculationResult,
  positiveLabel: string,
  negativeLabel: string,
): CohortExplanation | null {
  if (profile.sensitivity == null || profile.specificity == null) return null;

  const diseased = roundedCount(result.pretestProbability * 1000);
  const notDiseased = 1000 - diseased;
  const truePositive = roundedCount(diseased * profile.sensitivity);
  const falsePositive = roundedCount(
    notDiseased * (1 - profile.specificity),
  );
  const falseNegative = Math.max(0, diseased - truePositive);
  const trueNegative = Math.max(0, notDiseased - falsePositive);

  return {
    title: "Anschaulich bei 1000 ähnlichen Patienten",
    positive: `Etwa ${formatCount(diseased)} hätten die Erkrankung. Bei ${positiveLabel} wären etwa ${formatCount(truePositive)} richtig positiv und ${formatCount(falsePositive)} falsch positiv.`,
    negative: `Bei ${negativeLabel} wären etwa ${formatCount(trueNegative)} richtig negativ und ${formatCount(falseNegative)} falsch negativ.`,
  };
}
