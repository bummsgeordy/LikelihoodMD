import pretestProbabilityDatasetRaw from '../data/pretest-probability-estimates.json';
import type {
  MedicationInterference,
  PreanalyticalIssue,
  PretestEstimateResolution,
  PretestProbabilityDataset,
  PretestProbabilityEstimate,
  PretestQualitativeAdjustedRisk,
  ProbabilityModifier,
  ProbabilityModifierDirection,
  SourceReference
} from '../types';

export const pretestProbabilityDataset = pretestProbabilityDatasetRaw as PretestProbabilityDataset;

const confidenceLabels: Record<string, string> = {
  Adirecthighquality: 'hoch: direkte Daten',
  Bmoderatedirect: 'moderat: direkte oder nahe Daten',
  Cindirectormixed: 'indirekt oder gemischt',
  Dexpertestimate: 'Expertenschätzung',
  E_uncertain: 'unsicher'
};

const directionRank: Record<ProbabilityModifierDirection, number> = {
  decreasesstrongly: -2,
  decreasesmoderately: -1,
  neutralorunclear: 0,
  increasesmildly: 1,
  increasesmoderately: 2,
  increasesstrongly: 3,
  increasesvery_strongly: 4
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAnyNeedle(label: string, needles: string[]): boolean {
  const normalizedLabel = normalize(label);
  return needles.some(needle => {
    const normalizedNeedle = normalize(needle);
    return normalizedNeedle.length > 0 && (normalizedLabel.includes(normalizedNeedle) || normalizedNeedle.includes(normalizedLabel));
  });
}

function resolveSources(estimate: PretestProbabilityEstimate, dataset: PretestProbabilityDataset): SourceReference[] {
  return estimate.sources
    .map(sourceId => dataset.sources.find(source => source.id === sourceId))
    .filter((source): source is SourceReference => Boolean(source));
}

function chooseEstimate(
  diseaseId: string,
  settingId: string,
  dataset: PretestProbabilityDataset
): PretestProbabilityEstimate | null {
  const diseaseEstimates = dataset.estimates.filter(estimate => estimate.diseaseId === diseaseId);
  if (diseaseEstimates.length === 0) return null;
  return (
    diseaseEstimates.find(estimate => estimate.settingId === settingId) ??
    diseaseEstimates.find(estimate => estimate.settingId === 'general') ??
    diseaseEstimates[0]
  );
}

function selectedModifiers(estimate: PretestProbabilityEstimate, activeModifiers: string[]): ProbabilityModifier[] {
  if (activeModifiers.length === 0) return [];
  return estimate.modifiers.filter(modifier => includesAnyNeedle(modifier.factor, activeModifiers));
}

function selectedIssues<T extends PreanalyticalIssue | MedicationInterference>(
  items: T[],
  activeFlags: string[],
  labelSelector: (item: T) => string
): T[] {
  if (activeFlags.length === 0) return [];
  return items.filter(item => includesAnyNeedle(labelSelector(item), activeFlags));
}

function qualitativeRiskFromModifiers(
  modifiers: ProbabilityModifier[],
  issues: PreanalyticalIssue[],
  medications: MedicationInterference[]
): PretestQualitativeAdjustedRisk {
  if ([...issues, ...medications].some(item => item.severity === 'high')) {
    return 'nicht valide berechenbar wegen Präanalytik/Medikamenten';
  }
  if (modifiers.length === 0) return 'etwa Basisrisiko';
  const rank = modifiers.reduce((strongest, modifier) => {
    const next = directionRank[modifier.direction];
    return Math.abs(next) > Math.abs(strongest) ? next : strongest;
  }, 0);
  if (rank <= -1) return 'niedriger als Basis';
  if (rank === 0) return 'etwa Basisrisiko';
  if (rank === 1) return 'moderat erhöht';
  if (rank <= 3) return 'deutlich erhöht';
  return 'sehr deutlich erhöht';
}

function warningsForEstimate(
  estimate: PretestProbabilityEstimate,
  issues: PreanalyticalIssue[],
  medications: MedicationInterference[]
): string[] {
  const warnings = ['Prätestwahrscheinlichkeit ist settingabhängig.'];
  if (estimate.estimateType === 'highriskgroup' || estimate.estimateType === 'riskscorecategory') {
    warnings.push('Hochrisikokohorten nicht auf Allgemeinbevölkerung übertragen.');
  }
  if ([...issues, ...medications].some(item => item.severity === 'high')) {
    warnings.push('Präanalytik/Medikamente können Testresultat wesentlich verfälschen.');
  }
  if (estimate.evidenceQuality === 'Cindirectormixed' || estimate.evidenceQuality === 'Dexpertestimate' || estimate.evidenceQuality === 'E_uncertain') {
    warnings.push('Schätzung ist indirekt abgeleitet oder unsicher.');
  }
  warnings.push('Diese Angaben sind didaktische Entscheidungsunterstützung, keine Diagnose.');
  return Array.from(new Set(warnings));
}

export function getPretestEstimate(
  diseaseId: string,
  settingId: string,
  activeModifiers: string[] = [],
  preanalyticalFlags: string[] = [],
  medicationFlags: string[] = [],
  dataset: PretestProbabilityDataset = pretestProbabilityDataset
): PretestEstimateResolution {
  const estimate = chooseEstimate(diseaseId, settingId, dataset);
  if (!estimate) {
    return {
      estimate: null,
      baseProbability: null,
      probabilityRange: null,
      qualitativeAdjustedRisk: 'etwa Basisrisiko',
      activeWarnings: ['Für diese Erkrankung ist noch keine erweiterte Prätest-Datenbasis hinterlegt.'],
      confidenceLabel: 'nicht hinterlegt',
      sources: [],
      activeModifiers: [],
      activePreanalyticalIssues: [],
      activeMedicationInterferences: []
    };
  }
  const modifiers = selectedModifiers(estimate, activeModifiers);
  const issues = selectedIssues(estimate.preanalyticalIssues, preanalyticalFlags, issue => issue.issue);
  const medications = selectedIssues(estimate.medicationInterferences, medicationFlags, medication => medication.medicationOrClass);
  return {
    estimate,
    baseProbability: estimate.baseProbabilityPercent ?? null,
    probabilityRange: estimate.probabilityRangePercent,
    qualitativeAdjustedRisk: qualitativeRiskFromModifiers(modifiers, issues, medications),
    activeWarnings: warningsForEstimate(estimate, issues, medications),
    confidenceLabel: confidenceLabels[estimate.evidenceQuality] ?? 'unklar',
    sources: resolveSources(estimate, dataset),
    activeModifiers: modifiers,
    activePreanalyticalIssues: issues,
    activeMedicationInterferences: medications
  };
}

export function pretestEstimateForDisease(diseaseId: string, settingId: string): PretestProbabilityEstimate | null {
  return chooseEstimate(diseaseId, settingId, pretestProbabilityDataset);
}
