import type {
  CalculatorState,
  ClinicalModifier,
  DiagnosticTest,
  EvidenceProfile,
  EvidenceQuality,
  PretestAssumption,
  DataCompleteness,
  QuantificationStatus,
  ReviewStatus,
  UserDataExport
} from '../types';
import { likelihoodRatiosFromSensitivitySpecificity } from './calculations';

const STORAGE_KEY = 'likelihood-ratio-rechner-state-v5';
const PREVIOUS_STORAGE_KEYS = ['likelihood-ratio-rechner-state-v4', 'likelihood-ratio-rechner-state-v2'];
const LEGACY_STORAGE_KEY = 'likelihood-ratio-rechner-state-v1';

type UserDataExportV2 = Omit<UserDataExport, 'schemaVersion' | 'customModifiers'> & { schemaVersion: 2 };
type UserDataExportV3 = Omit<UserDataExport, 'schemaVersion'> & { schemaVersion: 3 };
type UserDataExportV4 = Omit<UserDataExport, 'schemaVersion'> & { schemaVersion: 4 };

const defaultReview = {
  reviewStatus: 'draft' as ReviewStatus,
  evidenceQuality: 'unclear' as EvidenceQuality,
  dataCompleteness: 'minimal' as DataCompleteness
};

function withReviewFields<T extends Partial<EvidenceProfile | PretestAssumption | ClinicalModifier>>(item: T): T {
  return {
    ...item,
    reviewStatus: item.reviewStatus ?? defaultReview.reviewStatus,
    evidenceQuality: item.evidenceQuality ?? defaultReview.evidenceQuality,
    dataCompleteness: item.dataCompleteness ?? defaultReview.dataCompleteness
  };
}

function withProfileFields(profile: EvidenceProfile): EvidenceProfile {
  return {
    ...withReviewFields(profile),
    intendedUse: profile.intendedUse ?? profile.purpose ?? 'diagnostic-support',
    preanalyticRisk: profile.preanalyticRisk ?? 'unclear',
    applicabilityWarning: profile.applicabilityWarning ?? profile.limitations,
    reviewPriority: profile.reviewPriority ?? (profile.reviewStatus === 'reviewed' ? 'low' : 'medium')
  };
}

function withModifierFields(modifier: ClinicalModifier): ClinicalModifier {
  return {
    ...withReviewFields(modifier),
    quantificationStatus:
      modifier.quantificationStatus ??
      ((modifier.likelihoodRatio != null ? 'likelihood-ratio' : modifier.probabilityFactor != null ? 'probability-factor' : 'qualitative') as QuantificationStatus)
  };
}

function slugifyClinicalLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function settingIdFromLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes('hausarzt')) return 'hausarztpraxis';
  if (normalized.includes('notaufnahme')) return 'klinik-notaufnahme';
  if (normalized.includes('kardiologie')) return 'ambulant-kardiologie';
  if (normalized.includes('endokrinologie')) return 'ambulant-endokrinologie';
  if (normalized.includes('diabetologie')) return 'ambulant-diabetologie';
  if (normalized.includes('nephrologie') || normalized.includes('hypertonie')) return 'ambulant-nephrologie';
  return slugifyClinicalLabel(value || 'eigene-praxis');
}

function legacySelectionFromAssumptionId(id: unknown): Pick<CalculatorState, 'selectedConditionId' | 'selectedSettingId'> | null {
  switch (id) {
    case 'cushing-primary-care-low':
      return { selectedConditionId: 'cushing-syndrom-hyperkortisolismus', selectedSettingId: 'hausarztpraxis' };
    case 'cushing-endocrine-moderate':
      return { selectedConditionId: 'cushing-syndrom-hyperkortisolismus', selectedSettingId: 'ambulant-endokrinologie' };
    case 'pa-resistant-hypertension':
      return { selectedConditionId: 'primarer-hyperaldosteronismus', selectedSettingId: 'ambulant-nephrologie' };
    case 'ppgl-low-suspicion':
      return { selectedConditionId: 'phaochromozytom-paragangliom', selectedSettingId: 'hausarztpraxis' };
    case 'heart-failure-primary-care':
      return { selectedConditionId: 'herzinsuffizienz', selectedSettingId: 'hausarztpraxis' };
    default:
      return null;
  }
}

export const defaultState: CalculatorState = {
  selectedTestId: 'lnsc',
  selectedEvidenceProfileId: 'lnsc-elecsys-2024',
  selectedAssumptionId: 'cushing-endocrine-direct',
  selectedSettingId: 'ambulant-endokrinologie',
  selectedConditionId: 'cushing-syndrom-hyperkortisolismus',
  manualPretestPercent: 10,
  selectedModifierIds: [],
  modifierListExpanded: false,
  customTests: [],
  customEvidenceProfiles: [],
  customAssumptions: [],
  customModifiers: [],
  drawerOpen: false,
  adminMode: 'data'
};

function migrateLegacyTest(test: Record<string, unknown>): { test: DiagnosticTest; profile: EvidenceProfile } {
  const id = String(test.id ?? `custom-test-${Date.now()}`);
  const sensitivity = typeof test.sensitivity === 'number' ? test.sensitivity : null;
  const specificity = typeof test.specificity === 'number' ? test.specificity : null;
  const ratios =
    sensitivity != null && specificity != null
      ? likelihoodRatiosFromSensitivitySpecificity(sensitivity, specificity)
      : { lrPositive: 1, lrNegative: 1 };
  const profile: EvidenceProfile = {
    id: `${id}-profile`,
    testId: id,
    label: 'Migriertes Evidenzprofil',
    kind: 'custom',
    method: String(test.method ?? 'Migrierte Methode'),
    cutoff: String(test.cutoff ?? 'Migrierter Cut-off'),
    sensitivity,
    specificity,
    lrPositive: typeof test.lrPositive === 'number' ? test.lrPositive : ratios.lrPositive,
    lrNegative: typeof test.lrNegative === 'number' ? test.lrNegative : ratios.lrNegative,
    population: String(test.population ?? 'Migrierte Population'),
    rationale: String(test.rationale ?? 'Aus älterem lokalen Export migriert.'),
    limitations: String(test.limitations ?? 'Bitte Grenzen nach Migration prüfen.'),
    sources: Array.isArray(test.sources) ? (test.sources as EvidenceProfile['sources']) : [],
    lastReviewed: String(test.lastReviewed ?? new Date().toISOString().slice(0, 10)),
    isDefault: true,
    ...defaultReview
  };

  return {
    test: {
      id,
      name: String(test.name ?? 'Migrierter Test'),
      category: String(test.category ?? 'Eigene Tests'),
      conditionId: typeof test.conditionId === 'string' ? test.conditionId : slugifyClinicalLabel(String(test.condition ?? 'Eigene Fragestellung')),
      condition: String(test.condition ?? 'Eigene Fragestellung'),
      description: String(test.description ?? 'Aus älterem lokalen Export migriert.'),
      evidenceProfiles: [],
      custom: true
    },
    profile: withProfileFields(profile)
  };
}

function migrateLegacyState(parsed: Record<string, unknown>): CalculatorState {
  const migrated = { ...defaultState };
  const customTests = Array.isArray(parsed.customTests) ? parsed.customTests : [];
  const migratedPairs = customTests.map(test => migrateLegacyTest(test as Record<string, unknown>));
  migrated.customTests = migratedPairs.map(pair => pair.test);
  migrated.customEvidenceProfiles = migratedPairs.map(pair => pair.profile);
  migrated.customAssumptions = Array.isArray(parsed.customAssumptions)
    ? (parsed.customAssumptions as PretestAssumption[]).map(assumption => ({
        ...withReviewFields(assumption),
        conditionId: assumption.conditionId ?? slugifyClinicalLabel(assumption.condition),
        settingId: assumption.settingId ?? settingIdFromLabel(assumption.setting),
        evidenceLevel: assumption.evidenceLevel ?? 'direct',
        kind: assumption.kind ?? 'custom',
        custom: true
      }))
    : [];
  migrated.customModifiers = Array.isArray(parsed.customModifiers)
    ? (parsed.customModifiers as ClinicalModifier[]).map(modifier => withModifierFields({ ...modifier, kind: modifier.kind ?? 'custom', custom: true }))
    : [];
  migrated.selectedModifierIds = Array.isArray(parsed.selectedModifierIds)
    ? (parsed.selectedModifierIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];
  migrated.manualPretestPercent =
    typeof parsed.manualPretestPercent === 'number' ? parsed.manualPretestPercent : defaultState.manualPretestPercent;
  migrated.selectedTestId = migrated.customTests[0]?.id ?? defaultState.selectedTestId;
  migrated.selectedEvidenceProfileId = migrated.customEvidenceProfiles[0]?.id ?? defaultState.selectedEvidenceProfileId;
  migrated.selectedAssumptionId = migrated.customAssumptions[0]?.id ?? defaultState.selectedAssumptionId;
  const legacySelection = legacySelectionFromAssumptionId(parsed.selectedAssumptionId);
  migrated.selectedConditionId =
    typeof parsed.selectedConditionId === 'string'
      ? parsed.selectedConditionId
      : migrated.customAssumptions[0]?.conditionId ?? legacySelection?.selectedConditionId ?? defaultState.selectedConditionId;
  migrated.selectedSettingId =
    typeof parsed.selectedSettingId === 'string'
      ? parsed.selectedSettingId
      : migrated.customAssumptions[0]?.settingId ?? legacySelection?.selectedSettingId ?? defaultState.selectedSettingId;
  return migrated;
}

export function loadState(): CalculatorState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CalculatorState>;
      const legacySelection = legacySelectionFromAssumptionId(parsed.selectedAssumptionId);
      return {
        ...defaultState,
        ...parsed,
        selectedSettingId: parsed.selectedSettingId ?? legacySelection?.selectedSettingId ?? defaultState.selectedSettingId,
        selectedConditionId: parsed.selectedConditionId ?? legacySelection?.selectedConditionId ?? defaultState.selectedConditionId,
        customAssumptions: (parsed.customAssumptions ?? []).map(assumption => ({
          ...withReviewFields(assumption),
          ...assumption,
          conditionId: assumption.conditionId ?? slugifyClinicalLabel(assumption.condition),
          settingId: assumption.settingId ?? settingIdFromLabel(assumption.setting),
          evidenceLevel: assumption.evidenceLevel ?? 'direct'
        })),
        customEvidenceProfiles: (parsed.customEvidenceProfiles ?? []).map(profile => withProfileFields(profile as EvidenceProfile)),
        customModifiers: (parsed.customModifiers ?? []).map(modifier => withModifierFields({
          ...modifier,
          kind: modifier.kind ?? 'custom',
          custom: modifier.custom ?? true
        })),
        selectedModifierIds: (parsed.selectedModifierIds ?? []).filter((id): id is string => typeof id === 'string'),
        modifierListExpanded: Boolean(parsed.modifierListExpanded),
        drawerOpen: false
      };
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateLegacyState(JSON.parse(legacy));
      saveState(migrated);
      return migrated;
    }
    for (const key of PREVIOUS_STORAGE_KEYS) {
      const previous = window.localStorage.getItem(key);
      if (previous) {
        const migrated = migrateLegacyState(JSON.parse(previous));
        saveState(migrated);
        return migrated;
      }
    }
    return { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: CalculatorState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, drawerOpen: false }));
}

export function resetStoredState(): CalculatorState {
  window.localStorage.removeItem(STORAGE_KEY);
  return { ...defaultState };
}

export function buildExport(
  customTests: DiagnosticTest[],
  customEvidenceProfiles: EvidenceProfile[],
  customAssumptions: PretestAssumption[],
  customModifiers: ClinicalModifier[] = []
): UserDataExport {
  return {
    schemaVersion: 5,
    exportedAt: new Date().toISOString(),
    customTests,
    customEvidenceProfiles,
    customAssumptions,
    customModifiers
  };
}

export function parseUserDataExport(text: string): UserDataExport {
  const parsed = JSON.parse(text) as UserDataExport | (Record<string, unknown> & { schemaVersion?: number });
  if (parsed.schemaVersion === 5) {
    const exportV5 = parsed as UserDataExport;
    if (
      !Array.isArray(exportV5.customTests) ||
      !Array.isArray(exportV5.customEvidenceProfiles) ||
      !Array.isArray(exportV5.customAssumptions) ||
      !Array.isArray(exportV5.customModifiers)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil-, Annahmen- oder Modifikatorlisten.');
    }
    return exportV5;
  }
  if (parsed.schemaVersion === 4) {
    const exportV4 = parsed as unknown as UserDataExportV4;
    if (
      !Array.isArray(exportV4.customTests) ||
      !Array.isArray(exportV4.customEvidenceProfiles) ||
      !Array.isArray(exportV4.customAssumptions) ||
      !Array.isArray(exportV4.customModifiers)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil-, Annahmen- oder Modifikatorlisten.');
    }
    return buildExport(
      exportV4.customTests.map(test => ({
        ...test,
        conditionId: test.conditionId ?? slugifyClinicalLabel(test.condition)
      })),
      exportV4.customEvidenceProfiles.map(profile => withProfileFields(profile)),
      exportV4.customAssumptions.map(assumption => withReviewFields(assumption) as PretestAssumption),
      exportV4.customModifiers.map(withModifierFields)
    );
  }
  if (parsed.schemaVersion === 3) {
    const exportV3 = parsed as unknown as UserDataExportV3;
    if (
      !Array.isArray(exportV3.customTests) ||
      !Array.isArray(exportV3.customEvidenceProfiles) ||
      !Array.isArray(exportV3.customAssumptions) ||
      !Array.isArray(exportV3.customModifiers)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil-, Annahmen- oder Modifikatorlisten.');
    }
    return buildExport(
      exportV3.customTests.map(test => ({
        ...test,
        conditionId: test.conditionId ?? slugifyClinicalLabel(test.condition)
      })),
      exportV3.customEvidenceProfiles.map(profile => withProfileFields(profile)),
      exportV3.customAssumptions.map(assumption => withReviewFields(assumption) as PretestAssumption),
      exportV3.customModifiers.map(withModifierFields)
    );
  }
  if (parsed.schemaVersion === 2) {
    const exportV2 = parsed as unknown as UserDataExportV2;
    if (
      !Array.isArray(exportV2.customTests) ||
      !Array.isArray(exportV2.customEvidenceProfiles) ||
      !Array.isArray(exportV2.customAssumptions)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil- oder Annahmenlisten.');
    }
    return buildExport(
      exportV2.customTests.map(test => ({
        ...test,
        conditionId: test.conditionId ?? slugifyClinicalLabel(test.condition)
      })),
      exportV2.customEvidenceProfiles.map(profile => withProfileFields(profile)),
      exportV2.customAssumptions.map(assumption => withReviewFields(assumption) as PretestAssumption),
      []
    );
  }
  if (parsed.schemaVersion === 1) {
    const migrated = migrateLegacyState(parsed);
    return buildExport(migrated.customTests, migrated.customEvidenceProfiles, migrated.customAssumptions, migrated.customModifiers);
  }
  throw new Error('Nicht unterstützte Export-Version.');
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
