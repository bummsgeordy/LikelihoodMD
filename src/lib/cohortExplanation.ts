import type { CalculationResult, EvidenceProfile } from "../types";
import { isProbability } from "./calculations";

export interface CohortExplanation {
  title: string;
  positive: string;
  negative: string;
}
export interface CohortCounts {
  total: number;
  diseased: number;
  notDiseased: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
}

export function cohortCounts(
  profile: EvidenceProfile,
  pretest: number,
  total = 1000,
): CohortCounts | null {
  if (
    !isProbability(pretest) ||
    !isProbability(profile.sensitivity) ||
    !isProbability(profile.specificity) ||
    !Number.isFinite(total) ||
    total <= 0 ||
    profile.sourceCheck?.status === "withdrawn"
  )
    return null;
  const diseased = pretest * total;
  const notDiseased = total - diseased;
  const truePositive = diseased * profile.sensitivity;
  const falsePositive = notDiseased * (1 - profile.specificity);
  return {
    total,
    diseased,
    notDiseased,
    truePositive,
    falsePositive,
    falseNegative: diseased - truePositive,
    trueNegative: notDiseased - falsePositive,
  };
}

export function formatExpectedCount(value: number): string {
  if (value > 0 && value < 0.001) return "<0,001";
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: value > 0 && value < 1 ? 3 : 1,
  });
}

export function cohortExplanationParts(
  profile: EvidenceProfile,
  result: CalculationResult,
  positiveLabel: string,
  negativeLabel: string,
): CohortExplanation | null {
  const counts = cohortCounts(profile, result.pretestProbability);
  if (!counts) return null;
  const n = formatExpectedCount;
  return {
    title: "Anschaulich bei 1000 ähnlichen Patienten",
    positive: `Etwa ${n(counts.diseased)} hätten die Erkrankung. Bei ${positiveLabel} wären etwa ${n(counts.truePositive)} richtig positiv und ${n(counts.falsePositive)} falsch positiv.`,
    negative: `Bei ${negativeLabel} wären etwa ${n(counts.trueNegative)} richtig negativ und ${n(counts.falseNegative)} falsch negativ. Modellierte Erwartungswerte, keine Vorhersage für einzelne Personen.`,
  };
}
