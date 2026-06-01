import type { DataCompleteness, EvidenceProfileKind, EvidenceQuality, ReviewStatus } from '../types';

export type CatalogRowKind = 'assumption' | 'pretest-gap' | 'modifier' | 'profile' | 'physical-finding';
export type CatalogSortKey = 'condition' | 'setting' | 'test' | 'lrPositive' | 'lrNegative' | 'reviewStatus';
export type CatalogDomain = 'diagnostic-tests' | 'physical-exam';

export interface CatalogRow {
  key: string;
  kind: CatalogRowKind;
  domain: CatalogDomain;
  id: string;
  status: EvidenceProfileKind;
  reviewStatus: ReviewStatus;
  evidenceQuality: EvidenceQuality;
  dataCompleteness: DataCompleteness;
  conditionId: string;
  settingId?: string;
  testId?: string;
  cells: string[];
  searchText: string;
  sortValues: {
    condition: string;
    setting: string;
    test: string;
    lrPositive: number | null;
    lrNegative: number | null;
    reviewStatus: string;
  };
  detail: {
    title: string;
    sources: string;
    population: string;
    rationale: string;
    limitations: string;
    reviewNote?: string;
  };
}

export interface CatalogFilters {
  conditionId: string;
  settingId: string;
  testId: string;
  status: string;
  reviewStatus: string;
  evidenceQuality: string;
  dataCompleteness: string;
  search: string;
  domain: string;
  sortBy: CatalogSortKey;
}

export function filterCatalogRows(rows: CatalogRow[], filters: CatalogFilters, testConditionId: string | null): CatalogRow[] {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter(row => {
    if (filters.conditionId !== 'all' && row.conditionId !== filters.conditionId) return false;
    if (filters.domain !== 'all' && row.domain !== filters.domain) return false;
    if (filters.settingId !== 'all' && row.settingId && row.settingId !== filters.settingId) return false;
    if (filters.settingId !== 'all' && row.kind === 'profile' && !row.settingId) return false;
    if (filters.testId !== 'all' && row.testId && row.testId !== filters.testId) return false;
    if (filters.testId !== 'all' && !row.testId && testConditionId && row.conditionId !== testConditionId) return false;
    if (filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.reviewStatus !== 'all' && row.reviewStatus !== filters.reviewStatus) return false;
    if (filters.evidenceQuality !== 'all' && row.evidenceQuality !== filters.evidenceQuality) return false;
    if (filters.dataCompleteness !== 'all' && row.dataCompleteness !== filters.dataCompleteness) return false;
    if (needle && !row.searchText.includes(needle)) return false;
    return true;
  });
}

export function sortCatalogRows(rows: CatalogRow[], sortBy: CatalogSortKey): CatalogRow[] {
  return [...rows].sort((a, b) => {
    const aValue = a.sortValues[sortBy];
    const bValue = b.sortValues[sortBy];
    if (typeof aValue === 'number' || typeof bValue === 'number') {
      const aNumber = typeof aValue === 'number' ? aValue : Number.POSITIVE_INFINITY;
      const bNumber = typeof bValue === 'number' ? bValue : Number.POSITIVE_INFINITY;
      return aNumber - bNumber;
    }
    return String(aValue ?? '').localeCompare(String(bValue ?? ''), 'de');
  });
}
