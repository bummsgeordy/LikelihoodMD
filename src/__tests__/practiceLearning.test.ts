import { describe, expect, it } from "vitest";
import testsRaw from "../data/tests.json";
import questionsRaw from "../data/practice-questions.json";
import assumptionsRaw from "../data/pretest-assumptions.json";
import modifiersRaw from "../data/clinical-modifiers.json";
import type {
  DiagnosticTest,
  PracticeQuestion,
  PretestAssumption,
  ClinicalModifier,
} from "../types";
import { applicableQuestion, applicableTests } from "../app/practice";
import {
  isEligiblePretest,
  modifierPreviewProbability,
  resolveAssumption,
} from "../app/pretest";
import {
  calculateProfileOutcome,
  formatPercent,
  parseProbabilityPercent,
  posttestProbability,
  tryResolveLikelihoodRatios,
} from "../lib/calculations";
import { cohortCounts, formatExpectedCount } from "../lib/cohortExplanation";
import { learningScenario, lectureCases } from "../lib/learning";
import { createNomogramLayout, nomogramPoints } from "../lib/nomogram";

const tests = testsRaw as DiagnosticTest[],
  profiles = tests.flatMap((t) => t.evidenceProfiles),
  q = questionsRaw as PracticeQuestion[],
  a = assumptionsRaw as PretestAssumption[];
describe("rare probabilities and transparent teaching", () => {
  it("retains 0.006% without a floor in parser, Bayes and display", () => {
    expect(parseProbabilityPercent("0,006")).toBe(0.006);
    const p = 0.00006;
    expect(posttestProbability(p, 5)).toBeCloseTo(
      (p * 5) / (1 - p + p * 5),
      12,
    );
    expect(formatPercent(p)).toBe("0,006 %");
    expect(formatPercent(0.999)).not.toBe("100 %");
  });
  it.each(["", "12,3x", "-1", "100.01", "Infinity", "NaN"])(
    "rejects %s instead of silently changing it",
    (value) => expect(parseProbabilityPercent(value)).toBeNull(),
  );
  it("rejects missing, invalid probabilities and non-positive ratios", () => {
    expect(calculateProfileOutcome(profiles[0], NaN).status).toBe(
      "not-computable",
    );
    expect(posttestProbability(-1, 5)).toBeNaN();
    expect(posttestProbability(0.1, 0)).toBeNaN();
    expect(posttestProbability(0, 5)).toBe(0);
    expect(posttestProbability(1, 0.2)).toBe(1);
  });
  it("preserves all four frequency cells and denominator for a rare disease", () => {
    const p = profiles.find((p) => p.id === "ntprobnp-400")!,
      c = cohortCounts(p, 0.00006)!;
    expect(c.diseased).toBeCloseTo(0.06, 12);
    expect(
      c.truePositive + c.falseNegative + c.falsePositive + c.trueNegative,
    ).toBeCloseTo(1000, 10);
    expect(formatExpectedCount(c.truePositive)).not.toBe("0");
    const scenario = learningScenario(p, 0.00006)!;
    expect(scenario.result.postPositiveProbability).toBeCloseTo(
      c.truePositive / (c.truePositive + c.falsePositive),
      12,
    );
  });
  it("never reconstructs a frequency table from LR alone", () => {
    expect(
      cohortCounts(
        { ...profiles[0], sensitivity: null, specificity: null },
        0.1,
      ),
    ).toBeNull();
  });
  it("frames very low and high probabilities without truncation", () => {
    for (const p of [0.00000001, 0.00006, 0.1, 0.9999])
      for (const lr of [0.0001, 0.01, 1, 150, 1000]) {
        const post = posttestProbability(p, lr),
          layout = createNomogramLayout({ width: 300, height: 360 }, [p, post]);
        for (const pt of Object.values(nomogramPoints(p, lr, post, layout))) {
          expect(pt.x).toBeGreaterThan(0);
          expect(pt.x).toBeLessThan(300);
          expect(pt.y).toBeGreaterThanOrEqual(layout.top);
          expect(pt.y).toBeLessThanOrEqual(layout.bottom);
        }
      }
  });
});
describe("clinical applicability", () => {
  it("does not borrow an assumption from another disease", () =>
    expect(resolveAssumption(a, "unknown", "hausarztpraxis")).toBeNull());
  it("does not promote setting matches or guessed midpoints to measured prevalence", () => {
    const expert = a.find((a) => a.origin === "expert-estimate")!;
    expect(expert.startingPoint?.basis).toBe("working-estimate");
    expect(expert.evidenceQuality).toBe("expert-opinion");
    expect(isEligiblePretest(expert)).toBe(true);
    expect(isEligiblePretest({ ...expert, startingPoint: undefined })).toBe(
      false,
    );
    for (const assumption of a.filter((a) => a.id.includes("eu-tirads"))) {
      if (assumption.probability != null) {
        expect(assumption.origin).toBe("expert-estimate");
        expect(assumption.startingPoint?.basis).toBe("working-estimate");
      }
    }
  });
  it("does not mathematically combine qualitative modifiers", () =>
    expect(
      modifierPreviewProbability(
        0.1,
        modifiersRaw.slice(0, 2) as ClinicalModifier[],
      ),
    ).toBeNull());
  it("excludes FNA when EU-TIRADS 1 means no nodule", () => {
    const question = q.find((q) => q.id === "nodule-context")!;
    expect(
      applicableTests(
        tests,
        question.conditionId,
        question,
        "thyroid-eu-tirads-1",
      ).some((t) => t.id === "thyroid-fna-bethesda"),
    ).toBe(false);
  });
  it("separates steroid recovery from primary adrenal evaluation", () => {
    expect(
      applicableQuestion(q, "nebenniereninsuffizienz", "follow-up")?.id,
    ).toBe("steroid-recovery");
    expect(
      applicableQuestion(q, "nebenniereninsuffizienz", "suspicion")?.id,
    ).toBe("primary-ai");
  });
  it("withdraws fabricated calcitonin LR and retains the published point and CI separately", () => {
    const p = profiles.find((p) => p.id === "basal-calcitonin-10pgml-review")!;
    expect(p.sensitivity).toBe(1);
    expect(p.sensitivityInterval?.low).toBe(0.997);
    expect(p.lrNegativeInterval).toBeUndefined();
    expect(tryResolveLikelihoodRatios(p)).toBeNull();
    expect(cohortCounts(p, 0.01)).toBeNull();
  });
  it("represents all six Bethesda categories without binary probability", () => {
    const p = profiles.find((p) => p.testId === "thyroid-fna-bethesda")!;
    expect(p.resultCategories?.map((c) => c.id)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
    ]);
    expect(tryResolveLikelihoodRatios(p)).toBeNull();
  });
  it("has valid sourced practice questions and six distinct teaching cases", () => {
    expect(q.length).toBeGreaterThanOrEqual(12);
    expect(new Set(q.map((q) => q.id)).size).toBe(q.length);
    expect(lectureCases).toHaveLength(6);
    for (const question of q) {
      expect(question.sources.length).toBeGreaterThan(0);
      expect(Object.keys(question.results)).toHaveLength(5);
      expect(question.reviewStatus).toBe("needs-review");
      for (const id of question.testIds)
        expect(tests.find((t) => t.id === id)?.conditionId).toBe(
          question.conditionId,
        );
      for (const s of question.sources)
        expect(new URL(s.url).protocol).toBe("https:");
    }
  });
});
