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

const STORAGE_KEY = 'likelihood-ratio-rechner-state-v6';
const PREVIOUS_STORAGE_KEYS = ['likelihood-ratio-rechner-state-v5', 'likelihood-ratio-rechner-state-v4', 'likelihood-ratio-rechner-state-v2'];
const LEGACY_STORAGE_KEY = 'likelihood-ratio-rechner-state-v1';
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_COLLECTION_ITEMS = 500;
const MAX_TEXT_LENGTH = 20_000;
const MAX_URL_LENGTH = 2_048;

type UserDataExportV2 = Omit<UserDataExport, 'schemaVersion' | 'customModifiers'> & { schemaVersion: 2 };
type UserDataExportV3 = Omit<UserDataExport, 'schemaVersion'> & { schemaVersion: 3 };
type UserDataExportV4 = Omit<UserDataExport, 'schemaVersion'> & { schemaVersion: 4 };
type UserDataExportV5 = Omit<UserDataExport, 'schemaVersion'> & { schemaVersion: 5 };

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
  const calculationMode =
    profile.calculationMode ??
    ((profile.lrPositive != null && profile.lrNegative != null) ||
    (profile.sensitivity != null && profile.specificity != null)
      ? 'binary-lr'
      : 'workflow-only');
  return {
    ...withReviewFields(profile),
    intendedUse: profile.intendedUse ?? profile.purpose ?? 'diagnostic-support',
    preanalyticRisk: profile.preanalyticRisk ?? 'unclear',
    applicabilityWarning: profile.applicabilityWarning ?? profile.limitations,
    reviewPriority: profile.reviewPriority ?? (profile.reviewStatus === 'reviewed' ? 'low' : 'medium'),
    calculationMode,
    lrDerivation:
      calculationMode === 'binary-lr'
        ? profile.lrDerivation ?? (profile.sensitivity != null && profile.specificity != null ? 'derived' : 'reported')
        : undefined,
    nonComputableReason:
      calculationMode === 'binary-lr'
        ? undefined
        : profile.nonComputableReason ?? 'Aus älterem Export migriert: keine belastbare binäre Likelihood-Ratio hinterlegt.'
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
  appMode: 'diagnostic-tests',
  selectedTestId: 'dst-1mg',
  selectedEvidenceProfileId: 'dst-1mg-statpearls',
  selectedAssumptionId: 'cushing-endocrine-direct',
  selectedSettingId: 'ambulant-endokrinologie',
  selectedConditionId: 'cushing-syndrom-hyperkortisolismus',
  manualPretestPercent: 5,
  selectedModifierIds: [],
  modifierListExpanded: false,
  pretestStatusExpanded: false,
  pretestEstimateDetailsOpen: false,
  customTests: [],
  customEvidenceProfiles: [],
  customAssumptions: [],
  customModifiers: [],
  drawerOpen: false,
  adminMode: 'data',
  selectedDiagnosticChainId: 'cushing-lnsc-to-dst',
  selectedPhysicalSystemId: 'vitalzeichen-akut',
  selectedPhysicalConditionId: 'anaemie',
  selectedPhysicalFindingId: 'anaemie-pallor-at-any-site',
  physicalPretestPercent: 20
};

function migrateLegacyTest(test: Record<string, unknown>): { test: DiagnosticTest; profile: EvidenceProfile } {
  const id = String(test.id ?? `custom-test-${Date.now()}`);
  const sensitivity = typeof test.sensitivity === 'number' ? test.sensitivity : null;
  const specificity = typeof test.specificity === 'number' ? test.specificity : null;
  const ratios =
    sensitivity != null && specificity != null
      ? likelihoodRatiosFromSensitivitySpecificity(sensitivity, specificity)
      : null;
  const reportedRatios =
    typeof test.lrPositive === 'number' && typeof test.lrNegative === 'number';
  const calculationMode = ratios || reportedRatios ? 'binary-lr' : 'workflow-only';
  const profile: EvidenceProfile = {
    id: `${id}-profile`,
    testId: id,
    label: 'Migriertes Evidenzprofil',
    kind: 'custom',
    calculationMode,
    lrDerivation:
      calculationMode === 'binary-lr'
        ? sensitivity != null && specificity != null
          ? 'derived'
          : 'reported'
        : undefined,
    nonComputableReason:
      calculationMode === 'workflow-only'
        ? 'Aus älterem Export migriert: keine belastbare binäre Testgüte hinterlegt.'
        : undefined,
    method: String(test.method ?? 'Migrierte Methode'),
    cutoff: String(test.cutoff ?? 'Migrierter Cut-off'),
    sensitivity,
    specificity,
    lrPositive:
      calculationMode === 'binary-lr'
        ? typeof test.lrPositive === 'number'
          ? test.lrPositive
          : ratios!.lrPositive
        : undefined,
    lrNegative:
      calculationMode === 'binary-lr'
        ? typeof test.lrNegative === 'number'
          ? test.lrNegative
          : ratios!.lrNegative
        : undefined,
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
        pretestStatusExpanded: Boolean(parsed.pretestStatusExpanded),
        pretestEstimateDetailsOpen: Boolean(parsed.pretestEstimateDetailsOpen),
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

export function saveState(state: CalculatorState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, drawerOpen: false }));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent('likelihoodmd-storage-error'));
    return false;
  }
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
    schemaVersion: 6,
    exportedAt: new Date().toISOString(),
    customTests,
    customEvidenceProfiles,
    customAssumptions,
    customModifiers
  };
}

export function parseUserDataExport(text: string): UserDataExport {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('Import ist größer als 2 MiB. Bitte in kleinere Vorschläge aufteilen.');
  }
  const parsed = JSON.parse(text) as UserDataExport | (Record<string, unknown> & { schemaVersion?: number });
  validateImportShape(parsed);
  if (parsed.schemaVersion === 6) {
    const exportV6 = parsed as UserDataExport;
    if (
      !Array.isArray(exportV6.customTests) ||
      !Array.isArray(exportV6.customEvidenceProfiles) ||
      !Array.isArray(exportV6.customAssumptions) ||
      !Array.isArray(exportV6.customModifiers)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil-, Annahmen- oder Modifikatorlisten.');
    }
    return buildExport(
      exportV6.customTests,
      exportV6.customEvidenceProfiles.map(profile => withProfileFields(profile)),
      exportV6.customAssumptions,
      exportV6.customModifiers.map(withModifierFields)
    );
  }
  if (parsed.schemaVersion === 5) {
    const exportV5 = parsed as unknown as UserDataExportV5;
    if (
      !Array.isArray(exportV5.customTests) ||
      !Array.isArray(exportV5.customEvidenceProfiles) ||
      !Array.isArray(exportV5.customAssumptions) ||
      !Array.isArray(exportV5.customModifiers)
    ) {
      throw new Error('Export enthält keine gültigen Test-, Profil-, Annahmen- oder Modifikatorlisten.');
    }
    return buildExport(
      exportV5.customTests,
      exportV5.customEvidenceProfiles.map(profile => withProfileFields(profile)),
      exportV5.customAssumptions,
      exportV5.customModifiers
    );
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

function validateImportShape(value: unknown): void {
  let visited = 0;
  const visit = (item: unknown, key = '', depth = 0): void => {
    visited += 1;
    if (visited > 25_000 || depth > 20) throw new Error('Import ist zu komplex.');
    if (typeof item === 'string') {
      const maximum = /url|doi/i.test(key) ? MAX_URL_LENGTH : MAX_TEXT_LENGTH;
      if (item.length > maximum) throw new Error(`Feld „${key || 'Text'}“ überschreitet die erlaubte Länge.`);
      return;
    }
    if (Array.isArray(item)) {
      if (item.length > MAX_COLLECTION_ITEMS) throw new Error(`Sammlung „${key || 'Einträge'}“ enthält mehr als 500 Einträge.`);
      item.forEach((entry, index) => visit(entry, `${key}[${index}]`, depth + 1));
      return;
    }
    if (item && typeof item === 'object') {
      Object.entries(item as Record<string, unknown>).forEach(([childKey, child]) =>
        visit(child, childKey, depth + 1)
      );
    }
  };
  visit(value);
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
