import type { CalculationResult, EvidenceProfile, ProfileCalculationOutcome } from '../types';

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

export function tryResolveLikelihoodRatios(profile: EvidenceProfile): { lrPositive: number; lrNegative: number } | null {
  if (profile.calculationMode !== 'binary-lr') return null;
  if (typeof profile.lrPositive === 'number' && typeof profile.lrNegative === 'number') {
    const ratios = {
      lrPositive: profile.lrPositive,
      lrNegative: profile.lrNegative
    };
    return Number.isFinite(ratios.lrPositive) && Number.isFinite(ratios.lrNegative) && ratios.lrPositive > 0 && ratios.lrNegative > 0
      ? ratios
      : null;
  }

  if (profile.sensitivity == null || profile.specificity == null) {
    return null;
  }

  const ratios = likelihoodRatiosFromSensitivitySpecificity(profile.sensitivity, profile.specificity);
  return Number.isFinite(ratios.lrPositive) && Number.isFinite(ratios.lrNegative) && ratios.lrPositive > 0 && ratios.lrNegative > 0
    ? ratios
    : null;
}

export function resolveLikelihoodRatios(profile: EvidenceProfile): { lrPositive: number; lrNegative: number } {
  const ratios = tryResolveLikelihoodRatios(profile);
  if (!ratios) throw new Error(profile.nonComputableReason ?? 'Dieses Profil besitzt keine valide binäre Likelihood-Ratio.');
  return ratios;
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

export function calculateProfileOutcome(
  profile: EvidenceProfile,
  pretestProbability: number
): ProfileCalculationOutcome {
  const ratios = tryResolveLikelihoodRatios(profile);
  if (!ratios) {
    return {
      status: 'not-computable',
      reason:
        profile.nonComputableReason ??
        (profile.calculationMode === 'categorical'
          ? 'Dieses Verfahren liefert Kategorien statt einer universellen binären Likelihood-Ratio.'
          : 'Dieses Verfahren ist ein klinischer Workflow und nicht als einzelner binärer LR-Test berechenbar.')
    };
  }
  return { status: 'computed', result: calculateResult(profile, pretestProbability) };
}

export function formatPercent(probability: number | null, digits = 1): string {
  if (probability == null || !Number.isFinite(probability)) return '–';
  return `${(probability * 100).toFixed(digits).replace('.', ',')} %`;
}

export function formatRatio(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return value.toFixed(digits).replace('.', ',');
}
