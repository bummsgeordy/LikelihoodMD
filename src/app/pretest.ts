import type { ClinicalModifier, PretestAssumption } from "../types";
import { posttestProbability } from "../lib/calculations";

export function estimateOriginLabel(assumption: PretestAssumption): string {
  const origin =
    assumption.origin ??
    (assumption.evidenceQuality === "expert-opinion"
      ? "expert-estimate"
      : "unknown");
  return {
    observed: "Beobachtete Häufigkeit",
    "transferred-cohort": "Übertragene Kohortendaten",
    "guideline-estimate": "Leitlinien-/Review-Schätzung",
    "expert-estimate": "Expertenschätzung",
    unknown: "Herkunft nicht ausreichend geklärt",
  }[origin];
}

export function isEligiblePretest(assumption: PretestAssumption): boolean {
  return (
    assumption.probability != null &&
    assumption.sourceCheck?.status === "verified" &&
    assumption.evidenceQuality !== "expert-opinion"
  );
}

export function resolveAssumption(
  assumptions: PretestAssumption[],
  conditionId: string,
  settingId: string,
): PretestAssumption | null {
  const candidates = assumptions.filter(
    (item) => item.conditionId === conditionId,
  );
  return (
    candidates.find((item) => item.settingId === settingId) ??
    candidates.find((item) => item.evidenceLevel === "fallback") ??
    null
  );
}

export function modifierPreviewProbability(
  base: number,
  modifiers: ClinicalModifier[],
): number | null {
  // Multiple correlated findings and risk associations are not a diagnostic model.
  if (modifiers.length !== 1 || !Number.isFinite(base) || base < 0 || base > 1)
    return null;
  const modifier = modifiers[0];
  if (
    modifier.role === "test-validity" ||
    modifier.role === "both" ||
    modifier.quantificationStatus !== "likelihood-ratio" ||
    modifier.sourceCheck?.status !== "verified" ||
    modifier.overlapWarning ||
    !modifier.likelihoodRatio
  )
    return null;
  return posttestProbability(base, modifier.likelihoodRatio);
}
