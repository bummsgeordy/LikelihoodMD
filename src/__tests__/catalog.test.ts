import { describe, expect, it } from 'vitest';
import { filterCatalogRows, sortCatalogRows, type CatalogRow } from '../app/catalog';

const rows: CatalogRow[] = [
  {
    key: 'profile:arr',
    kind: 'profile',
    domain: 'diagnostic-tests',
    id: 'arr',
    status: 'curated',
    reviewStatus: 'needs-review',
    evidenceQuality: 'moderate',
    dataCompleteness: 'partial',
    conditionId: 'primaerer-hyperaldosteronismus',
    settingId: 'hausarztpraxis',
    testId: 'arr',
    cells: [],
    searchText: 'primärer hyperaldosteronismus aldosteron renin ratio leitlinie',
    sortValues: {
      condition: 'Primärer Hyperaldosteronismus',
      setting: 'Hausarztpraxis',
      test: 'Aldosteron-Renin-Ratio',
      lrPositive: 16.2,
      lrNegative: 0.03,
      reviewStatus: 'needs-review'
    },
    detail: {
      title: 'ARR',
      sources: 'Guideline',
      population: 'Population',
      rationale: 'Rationale',
      limitations: 'Limitations'
    }
  },
  {
    key: 'modifier:ppgl',
    kind: 'modifier',
    domain: 'diagnostic-tests',
    id: 'ppgl',
    status: 'custom',
    reviewStatus: 'draft',
    evidenceQuality: 'expert-opinion',
    dataCompleteness: 'minimal',
    conditionId: 'phaochromozytom-paragangliom',
    cells: [],
    searchText: 'paroxysmale symptome phäochromozytom',
    sortValues: {
      condition: 'Phäochromozytom',
      setting: '',
      test: '',
      lrPositive: null,
      lrNegative: null,
      reviewStatus: 'draft'
    },
    detail: {
      title: 'PPGL modifier',
      sources: 'Source',
      population: 'Population',
      rationale: 'Rationale',
      limitations: 'Limitations'
    }
  }
];

const baseFilters = {
  conditionId: 'all',
  settingId: 'all',
  testId: 'all',
  status: 'all',
  reviewStatus: 'all',
  evidenceQuality: 'all',
  dataCompleteness: 'all',
  domain: 'all',
  search: '',
  sortBy: 'condition' as const
};

describe('catalog helpers', () => {
  it('filters by search and review metadata', () => {
    const filtered = filterCatalogRows(rows, {
      ...baseFilters,
      search: 'leitlinie',
      reviewStatus: 'needs-review',
      dataCompleteness: 'partial'
    }, null);
    expect(filtered.map(row => row.id)).toEqual(['arr']);
  });

  it('keeps non-profile rows for a selected test through the matching condition', () => {
    const filtered = filterCatalogRows(rows, {
      ...baseFilters,
      testId: 'arr'
    }, 'primaerer-hyperaldosteronismus');
    expect(filtered.map(row => row.id)).toEqual(['arr']);
  });

  it('sorts numeric LR columns', () => {
    expect(sortCatalogRows(rows, 'lrPositive').map(row => row.id)).toEqual(['arr', 'ppgl']);
  });
});
