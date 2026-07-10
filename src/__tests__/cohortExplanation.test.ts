import { describe, expect, it } from "vitest";
import { calculateResult } from "../lib/calculations";
import { cohortExplanationParts } from "../lib/cohortExplanation";
import type { EvidenceProfile } from "../types";

const profile = {
  id: "cohort-profile",
  testId: "test",
  label: "Direkte Testgüte",
  calculationMode: "binary-lr",
  lrDerivation: "derived",
  kind: "curated",
  method: "Test",
  cutoff: "positiv",
  sensitivity: 0.9,
  specificity: 0.8,
  population: "Beispielpopulation",
  rationale: "Test",
  limitations: "Test",
  lastReviewed: "2026-07-10",
  isDefault: true,
  sources: [],
  reviewStatus: "needs-review",
  evidenceQuality: "moderate",
  dataCompleteness: "partial",
  intendedUse: "diagnostic-support",
  preanalyticRisk: "low",
  applicabilityWarning: "Nur Beispiel",
  reviewPriority: "medium",
} satisfies EvidenceProfile;

describe("1000er-Veranschaulichung", () => {
  it("uses directly stored sensitivity and specificity", () => {
    const result = calculateResult(profile, 0.1);
    const explanation = cohortExplanationParts(
      profile,
      result,
      "positivem Test",
      "negativem Test",
    );

    expect(explanation?.positive).toContain("100 hätten die Erkrankung");
    expect(explanation?.positive).toContain("90 richtig positiv");
    expect(explanation?.positive).toContain("180 falsch positiv");
    expect(explanation?.negative).toContain("720 richtig negativ");
    expect(explanation?.negative).toContain("10 falsch negativ");
  });

  it("does not reconstruct test performance from likelihood ratios", () => {
    const result = calculateResult(profile, 0.1);
    const withoutPerformance = {
      ...profile,
      sensitivity: null,
      specificity: null,
      lrPositive: 4.5,
      lrNegative: 0.125,
      lrDerivation: "reported" as const,
    };

    expect(
      cohortExplanationParts(
        withoutPerformance,
        result,
        "positivem Test",
        "negativem Test",
      ),
    ).toBeNull();
  });
});
