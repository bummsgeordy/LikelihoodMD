export type SourceKind = 'Leitlinie' | 'Studie' | 'Review' | 'Lehrtext' | 'Lokale Annahme';
export type EvidenceProfileKind = 'curated' | 'custom' | 'scenario';
export type PretestEvidenceLevel = 'direct' | 'fallback' | 'manual';
export type ClinicalModifierDirection = 'increases' | 'decreases' | 'uncertain';
export type ModifierCategory = 'Symptom' | 'Klinisches Zeichen' | 'Anamnese' | 'Kontext' | 'Labor/Vorbefund';

export interface ClinicalSetting {
  id: string;
  label: string;
}

export interface ClinicalCondition {
  id: string;
  label: string;
}

export interface EvidenceSource {
  title: string;
  year: number;
  url: string;
  kind: SourceKind;
  note: string;
}

export interface EvidenceProfile {
  id: string;
  testId: string;
  label: string;
  kind: EvidenceProfileKind;
  method: string;
  cutoff: string;
  procedure?: string;
  sensitivity: number | null;
  specificity: number | null;
  lrPositive?: number;
  lrNegative?: number;
  population: string;
  rationale: string;
  limitations: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  isDefault?: boolean;
  deviationFromProfileId?: string;
  deviationReason?: string;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  category: string;
  condition: string;
  description: string;
  evidenceProfiles: EvidenceProfile[];
  custom?: boolean;
}

export interface PretestAssumption {
  id: string;
  condition: string;
  conditionId?: string;
  setting: string;
  settingId?: string;
  evidenceLevel?: PretestEvidenceLevel;
  population: string;
  probability: number;
  rangeLow?: number;
  rangeHigh?: number;
  rationale: string;
  limitations: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  kind: EvidenceProfileKind;
  custom?: boolean;
  deviationReason?: string;
}

export interface ClinicalModifier {
  id: string;
  conditionId: string;
  label: string;
  category: ModifierCategory;
  direction: ClinicalModifierDirection;
  probabilityFactor?: number;
  likelihoodRatio?: number;
  rationale: string;
  limitations: string;
  sources: EvidenceSource[];
  lastReviewed: string;
  kind: EvidenceProfileKind;
  custom?: boolean;
  deviationReason?: string;
}

export interface CalculatorState {
  selectedTestId: string;
  selectedEvidenceProfileId: string;
  selectedAssumptionId: string;
  selectedSettingId: string;
  selectedConditionId: string;
  manualPretestPercent: number;
  useManualPretest: boolean;
  selectedModifierIds: string[];
  modifierListExpanded: boolean;
  customTests: DiagnosticTest[];
  customEvidenceProfiles: EvidenceProfile[];
  customAssumptions: PretestAssumption[];
  customModifiers: ClinicalModifier[];
  drawerOpen: boolean;
  adminMode: 'test' | 'profile' | 'assumption' | 'scenario' | 'modifier' | 'data' | 'catalog';
}

export interface CalculationResult {
  pretestProbability: number;
  lrPositive: number;
  lrNegative: number;
  postPositiveProbability: number;
  postNegativeProbability: number;
  ppv: number | null;
  npv: number | null;
}

export interface UserDataExport {
  schemaVersion: 3;
  exportedAt: string;
  customTests: DiagnosticTest[];
  customEvidenceProfiles: EvidenceProfile[];
  customAssumptions: PretestAssumption[];
  customModifiers: ClinicalModifier[];
}
