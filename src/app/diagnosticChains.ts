import { calculateProfileOutcome, formatPercent, formatRatio } from '../lib/calculations';
import type { CalculationResult, DiagnosticChain, DiagnosticTest, EvidenceProfile, EvidenceSource } from '../types';

export interface DiagnosticChainStageResolution {
  stageId: string;
  label: string;
  test: DiagnosticTest;
  profile: EvidenceProfile;
}

export interface DiagnosticChainPath {
  id: string;
  label: string;
  firstResultLabel: 'positiv' | 'negativ';
  secondResultLabel: 'positiv' | 'negativ' | null;
  first: CalculationResult;
  second: CalculationResult | null;
  intermediateProbability: number;
  finalProbability: number;
  status: 'continued' | 'stopped';
  note?: string;
}

export interface DiagnosticChainViewModel {
  chain: DiagnosticChain;
  stages: DiagnosticChainStageResolution[];
  paths: DiagnosticChainPath[];
  sources: EvidenceSource[];
}

export function chainsForContext(
  chains: DiagnosticChain[],
  conditionId: string,
  settingId: string
): DiagnosticChain[] {
  return chains.filter(chain => {
    if (chain.conditionId !== conditionId) return false;
    return chain.settingIds.length === 0 || chain.settingIds.includes(settingId);
  });
}

export function resolveChainStages(
  chain: DiagnosticChain,
  tests: DiagnosticTest[],
  profiles: EvidenceProfile[]
): DiagnosticChainStageResolution[] {
  return chain.stages.flatMap(stage => {
    const test = tests.find(candidate => candidate.id === stage.testId);
    const profile = profiles.find(candidate => candidate.id === stage.evidenceProfileId);
    return test && profile && profile.testId === test.id && test.conditionId === chain.conditionId ? [{ stageId: stage.id, label: stage.label, test, profile }] : [];
  });
}

export function calculateDiagnosticChain(
  chain: DiagnosticChain,
  tests: DiagnosticTest[],
  profiles: EvidenceProfile[],
  startPretestProbability: number
): DiagnosticChainViewModel | null {
  const stages = resolveChainStages(chain, tests, profiles);
  if (chain.calculationPolicy !== 'conditional-lr' || !chain.conditionalEvidence || chain.sourceCheck?.status !== 'verified') {
    return { chain, stages, paths: [], sources: chain.sources };
  }
  if (stages.length !== 2 || chain.stages.length !== 2) return null;
  const [firstStage, secondStage] = stages;
  const firstOutcome = calculateProfileOutcome(firstStage.profile, startPretestProbability);
  if (firstOutcome.status !== 'computed') return null;
  const first = firstOutcome.result;
  const firstPositiveAsPretest = first.postPositiveProbability;
  const firstNegativeAsPretest = first.postNegativeProbability;
  const continueOn = firstStage.profile.calculationMode === 'binary-lr'
    ? chain.stages[0].continueOn ?? ['positive', 'negative']
    : [];

  const paths: DiagnosticChainPath[] = [];
  (['positive', 'negative'] as const).forEach(firstResult => {
    const firstResultLabel = firstResult === 'positive' ? 'positiv' : 'negativ';
    const intermediateProbability = firstResult === 'positive'
      ? firstPositiveAsPretest
      : firstNegativeAsPretest;
    if (!continueOn.includes(firstResult)) {
      paths.push({
        id: `${chain.id}:${firstResult === 'positive' ? 'pos' : 'neg'}-stop`,
        label: `${firstResultLabel} → stoppen`,
        firstResultLabel,
        secondResultLabel: null,
        first,
        second: null,
        intermediateProbability,
        finalProbability: intermediateProbability,
        status: 'stopped',
        note: chain.stages[0].stopAfter?.[firstResult] ?? 'Standardpfad endet nach Test 1.'
      });
      return;
    }
    const secondOutcome = calculateProfileOutcome(secondStage.profile, intermediateProbability);
    if (secondOutcome.status !== 'computed') return;
    const second = secondOutcome.result;
    (['positive', 'negative'] as const).forEach(secondResult => {
      paths.push({
        id: `${chain.id}:${firstResult === 'positive' ? 'pos' : 'neg'}-${secondResult === 'positive' ? 'pos' : 'neg'}`,
        label: `${firstResultLabel} → ${secondResult === 'positive' ? 'positiv' : 'negativ'}`,
        firstResultLabel,
        secondResultLabel: secondResult === 'positive' ? 'positiv' : 'negativ',
        first,
        second,
        intermediateProbability,
        finalProbability: secondResult === 'positive'
          ? second.postPositiveProbability
          : second.postNegativeProbability,
        status: 'continued'
      });
    });
  });

  return {
    chain,
    stages,
    sources: chain.sources,
    paths
  };
}

export function chainPathFinalProbability(path: DiagnosticChainPath): number {
  return path.finalProbability;
}

export function describeChainPath(path: DiagnosticChainPath): string {
  return path.status === 'stopped'
    ? `${path.label}: nach Test 1 ${formatPercent(path.intermediateProbability)}; Standardpfad beendet.`
    : `${path.label}: nach Test 1 ${formatPercent(path.intermediateProbability)}, nach Test 2 ${formatPercent(chainPathFinalProbability(path))}`;
}

export function chainStageSummary(stage: DiagnosticChainStageResolution): string {
  return `${stage.label}: ${stage.test.name}, ${stage.profile.label}, LR+ ${formatRatio(stage.profile.lrPositive ?? null)}, LR− ${formatRatio(stage.profile.lrNegative ?? null)}`;
}
