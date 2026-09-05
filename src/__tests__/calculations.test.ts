import { describe, expect, it } from 'vitest';
import {
  calculateResult,
  calculateProfileOutcome,
  clampProbabilityPercent,
  likelihoodRatiosFromSensitivitySpecificity,
  oddsToProbability,
  posttestProbability,
  predictiveValues,
  probabilityToOdds
} from '../lib/calculations';
import type { EvidenceProfile } from '../types';

const exampleProfile: EvidenceProfile = {
  id: 'example-profile',
  testId: 'example-test',
  label: 'Example profile',
  kind: 'curated',
  calculationMode: 'binary-lr',
  lrDerivation: 'derived',
  method: 'Example method',
  cutoff: 'Example cutoff',
  sensitivity: 0.9,
  specificity: 0.8,
  population: 'Example population',
  rationale: 'Example rationale',
  limitations: 'Example limitations',
  lastReviewed: '2026-05-17',
  reviewStatus: 'reviewed',
  evidenceQuality: 'moderate',
  dataCompleteness: 'complete',
  isDefault: true,
  sources: [
    {
      title: 'Example source',
      year: 2026,
      url: 'https://example.com',
      kind: 'Lokale Annahme',
      note: 'Example note'
    }
  ]
};

describe('Bayes calculations', () => {
  it('converts probabilities to odds and back', () => {
    expect(probabilityToOdds(0.25)).toBeCloseTo(1 / 3, 5);
    expect(oddsToProbability(1 / 3)).toBeCloseTo(0.25, 5);
  });

  it('calculates posttest probability from likelihood ratio', () => {
    expect(posttestProbability(0.1, 7.65)).toBeCloseTo(0.459, 3);
    expect(posttestProbability(0.1, 0.13)).toBeCloseTo(0.014, 3);
  });

  it('derives likelihood ratios from sensitivity and specificity', () => {
    const ratios = likelihoodRatiosFromSensitivitySpecificity(0.9, 0.8);
    expect(ratios.lrPositive).toBeCloseTo(4.5, 5);
    expect(ratios.lrNegative).toBeCloseTo(0.125, 5);
  });

  it('calculates PPV and NPV for a known example', () => {
    const values = predictiveValues(0.25, 0.9, 0.8);
    expect(values.ppv).toBeCloseTo(0.6, 5);
    expect(values.npv).toBeCloseTo(0.96, 5);
  });

  it('limits slider positions without imposing a minimum clinical probability', () => {
    expect(clampProbabilityPercent(-10)).toBe(0);
    expect(clampProbabilityPercent(150)).toBe(100);
    expect(clampProbabilityPercent(Number.NaN)).toBeNaN();
    expect(clampProbabilityPercent(Infinity)).toBeNaN();
  });

  it('calculates a complete result from an evidence profile', () => {
    const result = calculateResult(exampleProfile, 0.25);
    expect(result.lrPositive).toBeCloseTo(4.5, 5);
    expect(result.postPositiveProbability).toBeCloseTo(0.6, 5);
    expect(result.postNegativeProbability).toBeCloseTo(0.04, 5);
  });

  it('does not invent LR 1/1 for categorical or workflow profiles', () => {
    const outcome = calculateProfileOutcome(
      {
        ...exampleProfile,
        id: 'workflow-profile',
        calculationMode: 'workflow-only',
        lrDerivation: undefined,
        sensitivity: null,
        specificity: null,
        nonComputableReason: 'Serieller klinischer Workflow.'
      },
      0.25
    );
    expect(outcome).toEqual({ status: 'not-computable', reason: 'Serieller klinischer Workflow.' });
  });
});
