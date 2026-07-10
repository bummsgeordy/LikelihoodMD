import { describe, expect, it } from "vitest";
import conditionsRaw from "../data/conditions.json";
import testsRaw from "../data/tests.json";
import { conditionIdForTest } from "../app/conditions";
import { DEFAULT_TEST_BY_CONDITION } from "../app/defaultTests";
import type { ClinicalCondition, DiagnosticTest } from "../types";

const conditions = conditionsRaw as ClinicalCondition[];
const tests = testsRaw as DiagnosticTest[];

describe("Standardtests", () => {
  it("assigns every condition an existing compatible default test", () => {
    for (const condition of conditions) {
      const testId = DEFAULT_TEST_BY_CONDITION[condition.id];
      const test = tests.find((candidate) => candidate.id === testId);
      expect(testId, `Kein Standardtest für ${condition.id}`).toBeTruthy();
      expect(test, `Standardtest ${testId} fehlt`).toBeTruthy();
      expect(conditionIdForTest(test!), `${testId} ist falsch zugeordnet`).toBe(
        condition.id,
      );
    }
  });
});
