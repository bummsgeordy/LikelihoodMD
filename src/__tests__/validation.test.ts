import { describe, expect, it } from 'vitest';
import modifiers from '../data/clinical-modifiers.json';
import assumptions from '../data/pretest-assumptions.json';
import tests from '../data/tests.json';
import { validateClinicalModifier, validateDiagnosticTest, validatePretestAssumption } from '../lib/validation';
import type { ClinicalModifier, DiagnosticTest, PretestAssumption } from '../types';

describe('curated data', () => {
  it('validates all curated diagnostic tests', () => {
    const issues = (tests as DiagnosticTest[]).flatMap(validateDiagnosticTest);
    expect(issues).toEqual([]);
  });

  it('validates all curated pretest assumptions', () => {
    const issues = (assumptions as PretestAssumption[]).flatMap(validatePretestAssumption);
    expect(issues).toEqual([]);
  });

  it('validates all curated clinical modifiers', () => {
    const issues = (modifiers as ClinicalModifier[]).flatMap(validateClinicalModifier);
    expect(issues).toEqual([]);
  });

  it('has a fallback pretest assumption for every curated test condition', () => {
    const fallbackConditionIds = new Set(
      (assumptions as PretestAssumption[])
        .filter(assumption => assumption.evidenceLevel === 'fallback')
        .map(assumption => assumption.conditionId)
    );
    const testConditionIds = new Set(
      (tests as DiagnosticTest[]).map(test =>
        test.condition
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    );
    expect([...testConditionIds].filter(conditionId => !fallbackConditionIds.has(conditionId))).toEqual([]);
  });
});
