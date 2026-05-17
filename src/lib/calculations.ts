import type { CalculationResult, EvidenceProfile } from '../types';

export const MIN_PROBABILITY_PERCENT = 0.1;
export const MAX_PROBABILITY_PERCENT = 99.9;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function clampProbabilityPercent(value: number): number {
  return clamp(value, MIN_PROBABILITY_PERCENT, MAX_PROBABILITY_PERCENT);
}

export function probabilityToOdds(probability: number): number {
  const bounded = clamp(probability, 0.001, 0.999);
  return bounded / (1 - bounded);
}

export function oddsToProbability(odds: number): number {
  if (!Number.isFinite(odds)) return 1;
  return odds / (1 + odds);
}

export function posttestProbability(pretestProbability: number, likelihoodRatio: number): number {
  return oddsToProbability(probabilityToOdds(pretestProbability) * likelihoodRatio);
}

export function likelihoodRatiosFromSensitivitySpecificity(
  sensitivity: number,
  specificity: number
): { lrPositive: number; lrNegative: number } {
  return {
    lrPositive: specificity < 1 ? sensitivity / (1 - specificity) : Number.POSITIVE_INFINITY,
    lrNegative: specificity > 0 ? (1 - sensitivity) / specificity : Number.POSITIVE_INFINITY
  };
}

export function resolveLikelihoodRatios(profile: EvidenceProfile): { lrPositive: number; lrNegative: number } {
  if (typeof profile.lrPositive === 'number' && typeof profile.lrNegative === 'number') {
    return {
      lrPositive: profile.lrPositive,
      lrNegative: profile.lrNegative
    };
  }

  if (profile.sensitivity == null || profile.specificity == null) {
    return { lrPositive: 1, lrNegative: 1 };
  }

  return likelihoodRatiosFromSensitivitySpecificity(profile.sensitivity, profile.specificity);
}

export function predictiveValues(
  pretestProbability: number,
  sensitivity: number | null,
  specificity: number | null
): { ppv: number | null; npv: number | null } {
  if (sensitivity == null || specificity == null) {
    return { ppv: null, npv: null };
  }

  const ppvDenominator =
    sensitivity * pretestProbability + (1 - specificity) * (1 - pretestProbability);
  const npvDenominator =
    specificity * (1 - pretestProbability) + (1 - sensitivity) * pretestProbability;

  return {
    ppv: ppvDenominator > 0 ? (sensitivity * pretestProbability) / ppvDenominator : null,
    npv: npvDenominator > 0 ? (specificity * (1 - pretestProbability)) / npvDenominator : null
  };
}

export function calculateResult(profile: EvidenceProfile, pretestProbability: number): CalculationResult {
  const { lrPositive, lrNegative } = resolveLikelihoodRatios(profile);
  const { ppv, npv } = predictiveValues(pretestProbability, profile.sensitivity, profile.specificity);

  return {
    pretestProbability,
    lrPositive,
    lrNegative,
    postPositiveProbability: posttestProbability(pretestProbability, lrPositive),
    postNegativeProbability: posttestProbability(pretestProbability, lrNegative),
    ppv,
    npv
  };
}

export function formatPercent(probability: number | null, digits = 1): string {
  if (probability == null || !Number.isFinite(probability)) return '–';
  return `${(probability * 100).toFixed(digits).replace('.', ',')} %`;
}

export function formatRatio(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return value.toFixed(digits).replace('.', ',');
}
