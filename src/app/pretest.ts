import type {
  CalculatorState,
  ClinicalModifier,
  PretestAssumption,
} from "../types";
import { posttestProbability } from "../lib/calculations";

export const ILLUSTRATIVE_PRETEST_PERCENT = 5;
type PretestInput = Pick<
  CalculatorState,
  "manualPretestPercent" | "pretestInputSource" | "pretestInputVersion"
>;

export function illustrativePretestInput(): PretestInput {
  return {
    manualPretestPercent: ILLUSTRATIVE_PRETEST_PERCENT,
    pretestInputSource: "illustrative",
    pretestInputVersion: 2,
  };
}

export function restorePretestInput(
  saved: Partial<CalculatorState>,
): PretestInput {
  const valid =
    typeof saved.manualPretestPercent === "number" &&
    Number.isFinite(saved.manualPretestPercent) &&
    saved.manualPretestPercent >= 0 &&
    saved.manualPretestPercent <= 100;
  if (
    valid &&
    ["manual", "assumption", "illustrative"].includes(
      saved.pretestInputSource ?? "",
    )
  ) {
    return {
      manualPretestPercent: saved.manualPretestPercent!,
      pretestInputSource: saved.pretestInputSource,
      pretestInputVersion: 2,
    };
  }
  // Repair the old empty startup state once; preserve deliberately cleared inputs thereafter.
  if (saved.pretestInputVersion === 2) {
    return {
      manualPretestPercent: valid ? saved.manualPretestPercent! : 0,
      pretestInputSource: "unset",
      pretestInputVersion: 2,
    };
  }
  return illustrativePretestInput();
}

export function pretestInputLabel(
  source: CalculatorState["pretestInputSource"],
): string {
  if (source === "illustrative")
    return "Lehrbeispiel; keine Erkrankungs- oder Settingprävalenz";
  if (source === "manual") return "Manuelle Arbeitsannahme";
  if (source === "assumption")
    return "Kuratierte Startannahme; Herkunft und Übertragbarkeit prüfen";
  return "Nicht festgelegt";
}

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
    "expert-estimate": "Arbeitsannahme (nicht validiert)",
    unknown: "Herkunft nicht ausreichend geklärt",
  }[origin];
}

export function isEligiblePretest(assumption: PretestAssumption): boolean {
  return (
    assumption.probability != null &&
    Number.isFinite(assumption.probability) &&
    assumption.probability >= 0 &&
    assumption.probability <= 1 &&
    assumption.sourceCheck?.status === "verified" &&
    ((assumption.evidenceQuality !== "expert-opinion" &&
      assumption.origin !== "expert-estimate") ||
      (assumption.origin === "expert-estimate" &&
        assumption.startingPoint?.basis === "working-estimate" &&
        Boolean(assumption.startingPoint.justification.trim())))
  );
}

export function pretestRangeLabel(assumption: PretestAssumption): string {
  return {
    "study-interval": "95%-Intervall der Quelle",
    "between-study": "Berichtete Spannweite",
    scenario: "Szenariospanne (kein KI)",
  }[assumption.rangeKind ?? "scenario"];
}

export function resolveAssumption(
  assumptions: PretestAssumption[],
  conditionId: string,
  settingId: string,
  testId?: string,
): PretestAssumption | null {
  const candidates = assumptions.filter(
    (item) =>
      item.conditionId === conditionId &&
      (!item.applicableTestIds ||
        (testId != null && item.applicableTestIds.includes(testId))) &&
      (!testId || !item.excludedTestIds?.includes(testId)),
  );
  const scoped = candidates.filter((item) => item.applicableTestIds);
  return (
    scoped.find((item) => item.settingId === settingId) ??
    scoped.find((item) => item.evidenceLevel === "fallback") ??
    candidates.find((item) => item.settingId === settingId) ??
    candidates.find((item) => item.evidenceLevel === "fallback") ??
    null
  );
}

export function startingPretestInput(
  assumption: PretestAssumption | null,
): PretestInput {
  return assumption && isEligiblePretest(assumption)
    ? {
        manualPretestPercent: Number(
          (assumption.probability! * 100).toPrecision(12),
        ),
        pretestInputSource: "assumption",
        pretestInputVersion: 2,
      }
    : illustrativePretestInput();
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
