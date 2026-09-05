import { describe, expect, it } from "vitest";
import assumptionsRaw from "../data/pretest-assumptions.json";
import conditions from "../data/conditions.json";
import settings from "../data/clinical-settings.json";
import testsRaw from "../data/tests.json";
import questions from "../data/practice-questions.json";
import {
  isEligiblePretest,
  resolveAssumption,
  startingPretestInput,
} from "../app/pretest";
import { validatePretestAssumption } from "../lib/validation";
import { calculateProfileOutcome } from "../lib/calculations";
import type { DiagnosticTest, PretestAssumption } from "../types";

const assumptions = assumptionsRaw as PretestAssumption[];
const tests = testsRaw as DiagnosticTest[];
describe("sourced starting assumptions", () => {
  it("covers each condition in each general setting without inventing separate setting measurements", () => {
    for (const condition of conditions)
      for (const setting of settings) {
        const a = resolveAssumption(assumptions, condition.id, setting.id)!;
        expect(a?.conditionId, condition.id + setting.id).toBe(condition.id);
        expect(isEligiblePretest(a), a.id).toBe(true);
        expect(a.sources.length).toBeGreaterThan(0);
        expect(a.sourceCheck?.location.length).toBeGreaterThan(10);
        expect(a.reviewStatus).toBe("needs-review");
      }
  });
  it("covers each practice question and eligible test with its own target", () => {
    for (const q of questions)
      for (const test of q.testIds) {
        const a = resolveAssumption(
          assumptions,
          q.conditionId,
          "hausarztpraxis",
          test,
        )!;
        expect(isEligiblePretest(a), q.id).toBe(true);
      }
    for (const setting of settings) {
      expect(
        resolveAssumption(
          assumptions,
          "cushing-syndrom-hyperkortisolismus",
          setting.id,
          "dst-macs-context",
        )?.probability,
      ).toBe(0.3);
      expect(
        resolveAssumption(
          assumptions,
          "cushing-syndrom-hyperkortisolismus",
          setting.id,
          "dst-1mg",
        )?.probability,
      ).toBeLessThan(0.3);
      expect(
        resolveAssumption(
          assumptions,
          "nebenniereninsuffizienz",
          setting.id,
          "morning-cortisol-recovery",
        )?.probability,
      ).toBe(0.487);
      expect(
        resolveAssumption(
          assumptions,
          "nebenniereninsuffizienz",
          setting.id,
          "primary-ai-context",
        )?.probability,
      ).toBe(0.1);
    }
  });
  it("retains valid Bayes outcomes for every binary profile", () => {
    for (const test of tests)
      for (const profile of test.evidenceProfiles) {
        if (profile.calculationMode !== "binary-lr") continue;
        const a = resolveAssumption(
          assumptions,
          test.conditionId,
          "ambulant-endokrinologie",
          test.id,
        )!;
        const input = startingPretestInput(a);
        expect(input.pretestInputSource, test.id).toBe("assumption");
        expect(
          calculateProfileOutcome(profile, input.manualPretestPercent / 100)
            .status,
          profile.id,
        ).toBe("computed");
      }
  });
  it("keeps rare population rates and adult-only evidence distinct", () => {
    expect(
      resolveAssumption(assumptions, "akromegalie", "hausarztpraxis")
        ?.probability,
    ).toBe(0.000083);
    expect(
      resolveAssumption(assumptions, "akromegalie", "ambulant-endokrinologie")
        ?.probability,
    ).toBe(0.05);
    expect(
      resolveAssumption(assumptions, "zoliakie", "ambulant-diabetologie")
        ?.probability,
    ).toBe(0.027);
  });
  it("does not manufacture a point value for absent/benign EU-TIRADS categories", () => {
    for (const level of [1, 2]) {
      expect(
        resolveAssumption(
          assumptions,
          "schilddrusenknoten-malignitatsrisiko",
          `thyroid-eu-tirads-${level}`,
        )?.probability,
      ).toBeNull();
    }
  });
  it("validates source, range semantics and explicit expert derivation", () => {
    for (const a of assumptions) {
      expect(validatePretestAssumption(a), a.id).toEqual([]);
      for (const s of a.sources) expect(new URL(s.url).protocol).toBe("https:");
      if (a.rangeLow != null) expect(a.rangeKind).toBeDefined();
      if (a.probability != null)
        expect(a.startingPoint?.justification).toBeTruthy();
      if (a.origin === "expert-estimate") {
        expect(a.evidenceQuality).toBe("expert-opinion");
        expect(a.startingPoint?.basis).toBe("working-estimate");
        expect(isEligiblePretest({ ...a, startingPoint: undefined })).toBe(
          false,
        );
      }
      if (a.sourceCheck)
        expect(
          isEligiblePretest({
            ...a,
            sourceCheck: { ...a.sourceCheck, status: "restricted" },
          }),
        ).toBe(false);
    }
    const a = assumptions.find(
      (a) => a.rangeHigh != null && a.probability != null,
    )!;
    expect(validatePretestAssumption({ ...a, probability: 1 })).not.toEqual([]);
  });
});
