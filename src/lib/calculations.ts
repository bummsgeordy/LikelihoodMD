import type {
  CalculationResult,
  EvidenceProfile,
  ProfileCalculationOutcome,
} from "../types";

export const MIN_PROBABILITY_PERCENT = 0;
export const MAX_PROBABILITY_PERCENT = 100;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function clampProbabilityPercent(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return clamp(value, MIN_PROBABILITY_PERCENT, MAX_PROBABILITY_PERCENT);
}

export function probabilityToOdds(probability: number): number {
  if (!isProbability(probability)) return Number.NaN;
  return probability / (1 - probability);
}

export function oddsToProbability(odds: number): number {
  if (odds === Number.POSITIVE_INFINITY) return 1;
  if (!Number.isFinite(odds) || odds < 0) return Number.NaN;
  return odds / (1 + odds);
}

export function posttestProbability(
  pretestProbability: number,
  likelihoodRatio: number,
): number {
  if (
    !isProbability(pretestProbability) ||
    !Number.isFinite(likelihoodRatio) ||
    likelihoodRatio <= 0
  )
    return Number.NaN;
  if (pretestProbability === 0 || pretestProbability === 1)
    return pretestProbability;
  // Work in log odds to retain very small probabilities and avoid overflow.
  const logOdds =
    Math.log(pretestProbability) -
    Math.log1p(-pretestProbability) +
    Math.log(likelihoodRatio);
  return logOdds >= 0
    ? 1 / (1 + Math.exp(-logOdds))
    : Math.exp(logOdds) / (1 + Math.exp(logOdds));
}

export function isProbability(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

export function parseProbabilityPercent(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return isProbability(number / 100) ? number : null;
}

export function likelihoodRatiosFromSensitivitySpecificity(
  sensitivity: number,
  specificity: number,
): { lrPositive: number; lrNegative: number } {
  return {
    lrPositive:
      specificity < 1
        ? sensitivity / (1 - specificity)
        : Number.POSITIVE_INFINITY,
    lrNegative:
      specificity > 0
        ? (1 - sensitivity) / specificity
        : Number.POSITIVE_INFINITY,
  };
}

export function tryResolveLikelihoodRatios(
  profile: EvidenceProfile,
): { lrPositive: number; lrNegative: number } | null {
  if (
    profile.calculationMode !== "binary-lr" ||
    profile.sourceCheck?.status === "withdrawn"
  )
    return null;
  if (
    profile.lrDerivation === "derived" &&
    isProbability(profile.sensitivity) &&
    isProbability(profile.specificity)
  ) {
    const ratios = likelihoodRatiosFromSensitivitySpecificity(
      profile.sensitivity,
      profile.specificity,
    );
    return Number.isFinite(ratios.lrPositive) &&
      Number.isFinite(ratios.lrNegative) &&
      ratios.lrPositive > 0 &&
      ratios.lrNegative > 0
      ? ratios
      : null;
  }
  if (
    typeof profile.lrPositive === "number" &&
    typeof profile.lrNegative === "number"
  ) {
    const ratios = {
      lrPositive: profile.lrPositive,
      lrNegative: profile.lrNegative,
    };
    return Number.isFinite(ratios.lrPositive) &&
      Number.isFinite(ratios.lrNegative) &&
      ratios.lrPositive > 0 &&
      ratios.lrNegative > 0
      ? ratios
      : null;
  }

  if (
    !isProbability(profile.sensitivity) ||
    !isProbability(profile.specificity)
  ) {
    return null;
  }

  const ratios = likelihoodRatiosFromSensitivitySpecificity(
    profile.sensitivity,
    profile.specificity,
  );
  return Number.isFinite(ratios.lrPositive) &&
    Number.isFinite(ratios.lrNegative) &&
    ratios.lrPositive > 0 &&
    ratios.lrNegative > 0
    ? ratios
    : null;
}

export function resolveLikelihoodRatios(profile: EvidenceProfile): {
  lrPositive: number;
  lrNegative: number;
} {
  const ratios = tryResolveLikelihoodRatios(profile);
  if (!ratios)
    throw new Error(
      profile.nonComputableReason ??
        "Dieses Profil besitzt keine valide binäre Likelihood-Ratio.",
    );
  return ratios;
}

export function predictiveValues(
  pretestProbability: number,
  sensitivity: number | null,
  specificity: number | null,
): { ppv: number | null; npv: number | null } {
  if (sensitivity == null || specificity == null) {
    return { ppv: null, npv: null };
  }

  const ppvDenominator =
    sensitivity * pretestProbability +
    (1 - specificity) * (1 - pretestProbability);
  const npvDenominator =
    specificity * (1 - pretestProbability) +
    (1 - sensitivity) * pretestProbability;

  return {
    ppv:
      ppvDenominator > 0
        ? (sensitivity * pretestProbability) / ppvDenominator
        : null,
    npv:
      npvDenominator > 0
        ? (specificity * (1 - pretestProbability)) / npvDenominator
        : null,
  };
}

export function calculateResult(
  profile: EvidenceProfile,
  pretestProbability: number,
): CalculationResult {
  const { lrPositive, lrNegative } = resolveLikelihoodRatios(profile);
  const { ppv, npv } = predictiveValues(
    pretestProbability,
    profile.sensitivity,
    profile.specificity,
  );

  return {
    pretestProbability,
    lrPositive,
    lrNegative,
    postPositiveProbability: posttestProbability(
      pretestProbability,
      lrPositive,
    ),
    postNegativeProbability: posttestProbability(
      pretestProbability,
      lrNegative,
    ),
    ppv,
    npv,
  };
}

export function calculateProfileOutcome(
  profile: EvidenceProfile,
  pretestProbability: number,
): ProfileCalculationOutcome {
  const ratios = tryResolveLikelihoodRatios(profile);
  if (!ratios) {
    return {
      status: "not-computable",
      reason:
        profile.nonComputableReason ??
        (profile.calculationMode === "categorical"
          ? "Dieses Verfahren liefert Kategorien statt einer universellen binären Likelihood-Ratio."
          : "Dieses Verfahren ist ein klinischer Workflow und nicht als einzelner binärer LR-Test berechenbar."),
    };
  }
  if (!isProbability(pretestProbability))
    return {
      status: "not-computable",
      reason: "Keine gültige Prätestwahrscheinlichkeit angegeben.",
    };
  return {
    status: "computed",
    result: calculateResult(profile, pretestProbability),
  };
}

export function formatPercent(probability: number | null, digits = 1): string {
  if (probability == null || !Number.isFinite(probability)) return "–";
  const percent = probability * 100;
  if (percent !== 0 && Math.abs(percent) < 0.001)
    return `${percent.toExponential(1).replace(".", ",")} %`;
  if (probability < 1 && probability > 0.99999) return ">99,999 %";
  const precision =
    percent !== 0 && Math.abs(percent) < 1
      ? Math.max(digits, Math.ceil(-Math.log10(Math.abs(percent))) + 1)
      : probability < 1 && probability >= 0.995
        ? Math.max(digits, 3)
        : digits;
  const formatted =
    percent > 0 && percent < 1
      ? percent.toLocaleString("de-DE", {
          maximumFractionDigits: precision,
          useGrouping: false,
        })
      : percent.toFixed(precision).replace(".", ",");
  return `${formatted} %`;
}

export function formatRatio(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "–";
  if (value > 0 && value < 0.001)
    return value.toExponential(1).replace(".", ",");
  return value
    .toFixed(value > 0 && value < 0.01 ? 4 : digits)
    .replace(".", ",");
}
