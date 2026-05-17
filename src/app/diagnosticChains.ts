import { calculateResult, formatPercent, formatRatio } from '../lib/calculations';
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
  secondResultLabel: 'positiv' | 'negativ';
  first: CalculationResult;
  second: CalculationResult;
  intermediateProbability: number;
  finalProbability: number;
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
    return test && profile ? [{ stageId: stage.id, label: stage.label, test, profile }] : [];
  });
}

export function calculateDiagnosticChain(
  chain: DiagnosticChain,
  tests: DiagnosticTest[],
  profiles: EvidenceProfile[],
  startPretestProbability: number
): DiagnosticChainViewModel | null {
  const stages = resolveChainStages(chain, tests, profiles);
  if (stages.length < 2) return null;
  const [firstStage, secondStage] = stages;
  const first = calculateResult(firstStage.profile, startPretestProbability);
  const firstPositiveAsPretest = first.postPositiveProbability;
  const firstNegativeAsPretest = first.postNegativeProbability;
  const secondAfterFirstPositive = calculateResult(secondStage.profile, firstPositiveAsPretest);
  const secondAfterFirstNegative = calculateResult(secondStage.profile, firstNegativeAsPretest);

  return {
    chain,
    stages,
    sources: chain.sources,
    paths: [
      {
        id: `${chain.id}:pos-pos`,
        label: '+ dann +',
        firstResultLabel: 'positiv',
        secondResultLabel: 'positiv',
        first,
        second: secondAfterFirstPositive,
        intermediateProbability: firstPositiveAsPretest,
        finalProbability: secondAfterFirstPositive.postPositiveProbability
      },
      {
        id: `${chain.id}:pos-neg`,
        label: '+ dann −',
        firstResultLabel: 'positiv',
        secondResultLabel: 'negativ',
        first,
        second: secondAfterFirstPositive,
        intermediateProbability: firstPositiveAsPretest,
        finalProbability: secondAfterFirstPositive.postNegativeProbability
      },
      {
        id: `${chain.id}:neg-pos`,
        label: '− dann +',
        firstResultLabel: 'negativ',
        secondResultLabel: 'positiv',
        first,
        second: secondAfterFirstNegative,
        intermediateProbability: firstNegativeAsPretest,
        finalProbability: secondAfterFirstNegative.postPositiveProbability
      },
      {
        id: `${chain.id}:neg-neg`,
        label: '− dann −',
        firstResultLabel: 'negativ',
        secondResultLabel: 'negativ',
        first,
        second: secondAfterFirstNegative,
        intermediateProbability: firstNegativeAsPretest,
        finalProbability: secondAfterFirstNegative.postNegativeProbability
      }
    ]
  };
}

export function chainPathFinalProbability(path: DiagnosticChainPath): number {
  return path.finalProbability;
}

export function describeChainPath(path: DiagnosticChainPath): string {
  return `${path.label}: nach Test 1 ${formatPercent(path.intermediateProbability)}, nach Test 2 ${formatPercent(chainPathFinalProbability(path))}`;
}

export function chainStageSummary(stage: DiagnosticChainStageResolution): string {
  return `${stage.label}: ${stage.test.name}, ${stage.profile.label}, LR+ ${formatRatio(stage.profile.lrPositive ?? null)}, LR− ${formatRatio(stage.profile.lrNegative ?? null)}`;
}
