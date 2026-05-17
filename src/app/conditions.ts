import type { ClinicalCondition, DiagnosticTest, PretestAssumption } from '../types';

export function clinicalIdFromLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function conditionLabel(conditionId: string, conditions: ClinicalCondition[]): string {
  return conditions.find(condition => condition.id === conditionId)?.label ?? conditionId;
}

export function conditionIdForTest(test: Pick<DiagnosticTest, 'conditionId' | 'condition'>): string {
  return test.conditionId || clinicalIdFromLabel(test.condition);
}

export function mergeConditions(
  curatedConditions: ClinicalCondition[],
  tests: DiagnosticTest[],
  assumptions: PretestAssumption[]
): ClinicalCondition[] {
  const byId = new Map(curatedConditions.map(condition => [condition.id, condition]));
  tests.forEach(test => {
    const id = conditionIdForTest(test);
    if (!byId.has(id)) byId.set(id, { id, label: test.condition });
  });
  assumptions.forEach(assumption => {
    const id = assumption.conditionId ?? clinicalIdFromLabel(assumption.condition);
    if (!byId.has(id)) byId.set(id, { id, label: assumption.condition });
  });
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}
