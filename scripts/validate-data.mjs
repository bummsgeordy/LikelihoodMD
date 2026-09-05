import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tests = JSON.parse(fs.readFileSync(path.join(root, 'src/data/tests.json'), 'utf8'));
const conditions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/conditions.json'), 'utf8'));
const practiceQuestions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/practice-questions.json'), 'utf8'));
const diagnosticChains = JSON.parse(fs.readFileSync(path.join(root, 'src/data/diagnostic-chains.json'), 'utf8'));
const conditionGuidance = JSON.parse(fs.readFileSync(path.join(root, 'src/data/condition-guidance.json'), 'utf8'));
const clinicalSettings = JSON.parse(fs.readFileSync(path.join(root, 'src/data/clinical-settings.json'), 'utf8'));
const pretestEvidenceGaps = JSON.parse(fs.readFileSync(path.join(root, 'src/data/pretest-evidence-gaps.json'), 'utf8'));
const assumptions = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/pretest-assumptions.json'), 'utf8')
);
const modifiers = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/clinical-modifiers.json'), 'utf8')
);
const physicalSystems = JSON.parse(fs.readFileSync(path.join(root, 'src/data/physical-systems.json'), 'utf8'));
const physicalConditions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/physical-conditions.json'), 'utf8'));
const physicalFindings = JSON.parse(fs.readFileSync(path.join(root, 'src/data/physical-findings.json'), 'utf8'));

const sourceKinds = new Set(['Leitlinie', 'Studie', 'Review', 'Lehrtext', 'Lokale Annahme']);
const profileKinds = new Set(['curated', 'custom', 'scenario']);
const pretestEvidenceLevels = new Set(['direct', 'fallback', 'manual']);
const modifierDirections = new Set(['increases', 'decreases', 'uncertain']);
const modifierCategories = new Set(['Symptom', 'Klinisches Zeichen', 'Anamnese', 'Kontext', 'Labor/Vorbefund']);
const reviewStatuses = new Set(['draft', 'reviewed', 'needs-review']);
const evidenceQualities = new Set(['high', 'moderate', 'low', 'expert-opinion', 'unclear']);
const dataCompletenessLevels = new Set(['complete', 'partial', 'minimal']);
const quantificationStatuses = new Set(['qualitative', 'probability-factor', 'likelihood-ratio']);
const preanalyticRisks = new Set(['low', 'moderate', 'high', 'unclear']);
const reviewPriorities = new Set(['low', 'medium', 'high']);
const calculationModes = new Set(['binary-lr', 'categorical', 'workflow-only']);
const lrDerivations = new Set(['reported', 'derived']);
const pretestEvidenceGapStatuses = new Set([
  'no-setting-specific-estimate-found',
  'score-or-risk-stratum-required',
  'not-clinically-meaningful-as-setting'
]);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const errors = [];
const knownConditionIds = new Set(conditions.map(condition => condition.id));
const knownSettingIds = new Set(clinicalSettings.map(setting => setting.id));

function slugifyClinicalLabel(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function probability(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateSources(sources, prefix) {
  if (!Array.isArray(sources) || sources.length === 0) {
    errors.push(`${prefix}: mindestens eine Quelle erforderlich`);
    return;
  }
  sources.forEach((source, index) => {
    const sourcePrefix = `${prefix}.sources[${index}]`;
    if (!hasText(source.title)) errors.push(`${sourcePrefix}.title fehlt`);
    if (!Number.isInteger(source.year) || source.year < 1900) errors.push(`${sourcePrefix}.year unplausibel`);
    if (!hasText(source.url)) errors.push(`${sourcePrefix}.url fehlt`);
    if (hasText(source.url) && !/^https?:\/\//i.test(source.url)) errors.push(`${sourcePrefix}.url muss http/https sein`);
    if (hasText(source.url) && source.url.includes('pubmed.ncbi.nlm.nih.gov/?term=')) {
      errors.push(`${sourcePrefix}.url darf kein PubMed-Suchlink sein`);
    }
    if (!sourceKinds.has(source.kind)) errors.push(`${sourcePrefix}.kind unbekannt`);
    if (!hasText(source.note)) errors.push(`${sourcePrefix}.note fehlt`);
  });
}

function validateReview(item, prefix) {
  if (item.sourceCheck != null) {
    const check = item.sourceCheck;
    if (!['verified', 'restricted', 'withdrawn'].includes(check.status) || !isoDatePattern.test(check.checkedAt || '') || !hasText(check.location) || !hasText(check.note)) errors.push(`${prefix}.sourceCheck unvollständig`);
  }
  if (!reviewStatuses.has(item.reviewStatus)) errors.push(`${prefix}.reviewStatus unbekannt`);
  if (!evidenceQualities.has(item.evidenceQuality)) errors.push(`${prefix}.evidenceQuality unbekannt`);
  if (!dataCompletenessLevels.has(item.dataCompleteness)) errors.push(`${prefix}.dataCompleteness unbekannt`);
  if (item.reviewStatus === 'reviewed' && !hasText(item.reviewNote)) errors.push(`${prefix}.reviewNote fehlt für reviewed`);
  if (!isoDatePattern.test(item.lastReviewed || '')) errors.push(`${prefix}.lastReviewed muss YYYY-MM-DD sein`);
}

function validateProfile(profile, prefix) {
  ['id', 'testId', 'label', 'method', 'cutoff', 'population', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(profile[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!profileKinds.has(profile.kind)) errors.push(`${prefix}.kind unbekannt`);
  if (!calculationModes.has(profile.calculationMode)) errors.push(`${prefix}.calculationMode unbekannt`);
  if (profile.sensitivity !== null && !probability(profile.sensitivity)) errors.push(`${prefix}.sensitivity ungültig`);
  if (profile.specificity !== null && !probability(profile.specificity)) errors.push(`${prefix}.specificity ungültig`);
  if (profile.lrPositive !== undefined && (!Number.isFinite(profile.lrPositive) || profile.lrPositive <= 0)) {
    errors.push(`${prefix}.lrPositive ungültig`);
  }
  if (profile.lrNegative !== undefined && (!Number.isFinite(profile.lrNegative) || profile.lrNegative <= 0)) {
    errors.push(`${prefix}.lrNegative ungültig`);
  }
  if (profile.lrDerivation !== undefined && !lrDerivations.has(profile.lrDerivation)) {
    errors.push(`${prefix}.lrDerivation unbekannt`);
  }
  if (profile.calculationMode === 'binary-lr') {
    const hasRatios = profile.lrPositive !== undefined && profile.lrNegative !== undefined;
    const hasAccuracy = profile.sensitivity !== null && profile.specificity !== null;
    if (!hasRatios && !hasAccuracy) errors.push(`${prefix} binär ohne LR oder Sensitivität/Spezifität`);
    if (!lrDerivations.has(profile.lrDerivation)) errors.push(`${prefix}.lrDerivation fehlt`);
    if (profile.lrPositive === 1 && profile.lrNegative === 1) errors.push(`${prefix} LR 1/1 darf nicht als Platzhalter dienen`);
    if (hasAccuracy) {
      const derivedPositive = profile.specificity < 1 ? profile.sensitivity / (1 - profile.specificity) : Infinity;
      const derivedNegative = profile.specificity > 0 ? (1 - profile.sensitivity) / profile.specificity : Infinity;
      if (!Number.isFinite(derivedPositive) || !Number.isFinite(derivedNegative) || derivedPositive <= 0 || derivedNegative <= 0) {
        errors.push(`${prefix} erzeugt keine endlichen positiven LR-Werte`);
      }
    }
  } else {
    if (profile.lrPositive !== undefined || profile.lrNegative !== undefined) {
      errors.push(`${prefix} nicht-binär mit LR-Werten`);
    }
    if (!hasText(profile.nonComputableReason)) errors.push(`${prefix}.nonComputableReason fehlt`);
  }
  [
    ['sensitivityInterval', profile.sensitivityInterval, profile.sensitivity],
    ['specificityInterval', profile.specificityInterval, profile.specificity],
    ['lrPositiveInterval', profile.lrPositiveInterval, profile.lrPositive],
    ['lrNegativeInterval', profile.lrNegativeInterval, profile.lrNegative]
  ].forEach(([field, interval, value]) => {
    if (interval === undefined) return;
    if (!Number.isFinite(interval.low) || !Number.isFinite(interval.high) || interval.low > interval.high) {
      errors.push(`${prefix}.${field} ungültig`);
    } else if (value !== null && value !== undefined && (value < interval.low || value > interval.high)) {
      errors.push(`${prefix}.${field} enthält Punktwert nicht`);
    }
  });
  if (profile.kind === 'scenario' && !hasText(profile.deviationReason)) errors.push(`${prefix}.deviationReason fehlt`);
  if (profile.preanalyticRisk !== undefined && !preanalyticRisks.has(profile.preanalyticRisk)) {
    errors.push(`${prefix}.preanalyticRisk unbekannt`);
  }
  if (profile.reviewPriority !== undefined && !reviewPriorities.has(profile.reviewPriority)) {
    errors.push(`${prefix}.reviewPriority unbekannt`);
  }
  validateReview(profile, prefix);
  validateSources(profile.sources, prefix);
}

tests.forEach((test, index) => {
  const prefix = `tests[${index}]`;
  ['id', 'name', 'category', 'conditionId', 'condition', 'description'].forEach(field => {
    if (!hasText(test[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!knownConditionIds.has(test.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!Array.isArray(test.evidenceProfiles) || test.evidenceProfiles.length === 0) {
    errors.push(`${prefix}.evidenceProfiles fehlt`);
    return;
  }
  const defaultCount = test.evidenceProfiles.filter(profile => profile.isDefault).length;
  if (defaultCount !== 1) errors.push(`${prefix}.evidenceProfiles braucht genau ein Default-Profil`);
  test.evidenceProfiles.forEach((profile, profileIndex) => {
    if (profile.testId !== test.id) errors.push(`${prefix}.evidenceProfiles[${profileIndex}].testId passt nicht zum Test`);
    validateProfile(profile, `${prefix}.evidenceProfiles[${profileIndex}]`);
  });
});

assumptions.forEach((assumption, index) => {
  const prefix = `assumptions[${index}]`;
  ['id', 'condition', 'conditionId', 'setting', 'settingId', 'evidenceLevel', 'population', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(assumption[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (assumption.conditionId !== slugifyClinicalLabel(assumption.condition)) {
    errors.push(`${prefix}.conditionId passt nicht zum Krankheitsbild`);
  }
  if (!pretestEvidenceLevels.has(assumption.evidenceLevel)) errors.push(`${prefix}.evidenceLevel unbekannt`);
  if (assumption.evidenceLevel === 'fallback' && assumption.settingId !== 'general') {
    errors.push(`${prefix}.fallback braucht settingId general`);
  }
  if (assumption.evidenceLevel === 'direct' && assumption.settingId === 'general') {
    errors.push(`${prefix}.direct braucht konkretes Setting`);
  }
  if (!profileKinds.has(assumption.kind)) errors.push(`${prefix}.kind unbekannt`);
  if (!knownConditionIds.has(assumption.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (assumption.probability !== null && !probability(assumption.probability)) errors.push(`${prefix}.probability ungültig`);
  if (assumption.rangeLow !== undefined && !probability(assumption.rangeLow)) errors.push(`${prefix}.rangeLow ungültig`);
  if (assumption.rangeHigh !== undefined && !probability(assumption.rangeHigh)) errors.push(`${prefix}.rangeHigh ungültig`);
  if (assumption.rangeLow > assumption.rangeHigh) errors.push(`${prefix}.range unplausibel`);
  validateReview(assumption, prefix);
  validateSources(assumption.sources, prefix);
});

const activeAssumptionKeys = new Set();
assumptions.forEach((assumption, index) => {
  const populationKey = String(assumption.population).trim().toLocaleLowerCase('de');
  const key = `${assumption.conditionId}:${assumption.settingId}:${populationKey}`;
  if (activeAssumptionKeys.has(key)) errors.push(`assumptions[${index}] doppelte aktive Population: ${key}`);
  activeAssumptionKeys.add(key);
});

const directPretestKeys = new Set(
  assumptions
    .filter(assumption => assumption.evidenceLevel === 'direct')
    .map(assumption => `${assumption.conditionId}:${assumption.settingId}`)
);
const gapPretestKeys = new Set();
pretestEvidenceGaps.forEach((gap, index) => {
  const prefix = `pretestEvidenceGaps[${index}]`;
  ['id', 'conditionId', 'status', 'summary', 'searchedQuestion', 'recommendedNextStep', 'lastReviewed'].forEach(field => {
    if (!hasText(gap[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!knownConditionIds.has(gap.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!pretestEvidenceGapStatuses.has(gap.status)) errors.push(`${prefix}.status unbekannt`);
  if (!Array.isArray(gap.settingIds) || gap.settingIds.length === 0) {
    errors.push(`${prefix}.settingIds fehlt`);
  } else {
    const gapSettingIds = new Set();
    gap.settingIds.forEach((settingId, settingIndex) => {
      if (!knownSettingIds.has(settingId)) errors.push(`${prefix}.settingIds[${settingIndex}] unbekannt`);
      if (gapSettingIds.has(settingId)) errors.push(`${prefix}.settingIds[${settingIndex}] doppelt`);
      gapSettingIds.add(settingId);
      gapPretestKeys.add(`${gap.conditionId}:${settingId}`);
    });
  }
  validateReview(gap, prefix);
  validateSources(gap.searchedSources, prefix);
});

modifiers.forEach((modifier, index) => {
  const prefix = `modifiers[${index}]`;
  ['id', 'conditionId', 'label', 'category', 'direction', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(modifier[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!modifierCategories.has(modifier.category)) errors.push(`${prefix}.category unbekannt`);
  if (!modifierDirections.has(modifier.direction)) errors.push(`${prefix}.direction unbekannt`);
  if (!knownConditionIds.has(modifier.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!profileKinds.has(modifier.kind)) errors.push(`${prefix}.kind unbekannt`);
  if (!quantificationStatuses.has(modifier.quantificationStatus)) errors.push(`${prefix}.quantificationStatus unbekannt`);
  if (modifier.probabilityFactor !== undefined && (!Number.isFinite(modifier.probabilityFactor) || modifier.probabilityFactor <= 0)) {
    errors.push(`${prefix}.probabilityFactor ungültig`);
  }
  if (modifier.likelihoodRatio !== undefined && (!Number.isFinite(modifier.likelihoodRatio) || modifier.likelihoodRatio <= 0)) {
    errors.push(`${prefix}.likelihoodRatio ungültig`);
  }
  if (modifier.quantificationStatus === 'likelihood-ratio' && modifier.likelihoodRatio === undefined) {
    errors.push(`${prefix}.likelihoodRatio fehlt für LR-Status`);
  }
  if (modifier.quantificationStatus === 'probability-factor' && modifier.probabilityFactor === undefined) {
    errors.push(`${prefix}.probabilityFactor fehlt für Faktor-Status`);
  }
  if (modifier.quantificationStatus === 'qualitative' && (modifier.likelihoodRatio !== undefined || modifier.probabilityFactor !== undefined)) {
    errors.push(`${prefix}.qualitative Modifikatoren dürfen keinen Faktor/LR tragen`);
  }
  if (modifier.mapsToPretestAssumptionId !== undefined && !hasText(modifier.overlapWarning)) {
    errors.push(`${prefix}.overlapWarning fehlt bei mapsToPretestAssumptionId`);
  }
  validateReview(modifier, prefix);
  validateSources(modifier.sources, prefix);
});

const profiles = tests.flatMap(test => test.evidenceProfiles);
diagnosticChains.forEach((chain, index) => {
  const prefix = `diagnosticChains[${index}]`;
  ['id', 'conditionId', 'label', 'description', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(chain[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!knownConditionIds.has(chain.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!Array.isArray(chain.stages) || chain.stages.length < 2) {
    errors.push(`${prefix}.stages braucht mindestens zwei Stufen`);
  } else {
    chain.stages.forEach((stage, stageIndex) => {
      const test = tests.find(candidate => candidate.id === stage.testId);
      const profile = profiles.find(candidate => candidate.id === stage.evidenceProfileId);
      if (!test) errors.push(`${prefix}.stages[${stageIndex}].testId unbekannt`);
      if (!profile) errors.push(`${prefix}.stages[${stageIndex}].evidenceProfileId unbekannt`);
      if (test && test.conditionId !== chain.conditionId) errors.push(`${prefix}.stages[${stageIndex}].testId passt nicht zur Erkrankung`);
      if (test && profile && profile.testId !== test.id) errors.push(`${prefix}.stages[${stageIndex}].profile passt nicht zum Test`);
      if (chain.calculationPolicy === 'conditional-lr' && profile && profile.calculationMode !== 'binary-lr') errors.push(`${prefix}.stages[${stageIndex}] ist nicht binär berechenbar`);
      if (stage.continueOn !== undefined) {
        if (!Array.isArray(stage.continueOn) || stage.continueOn.length === 0) errors.push(`${prefix}.stages[${stageIndex}].continueOn leer`);
        else stage.continueOn.forEach(result => {
          if (!['positive', 'negative'].includes(result)) errors.push(`${prefix}.stages[${stageIndex}].continueOn unbekannt`);
        });
      }
    });
  }
  if (!profileKinds.has(chain.kind)) errors.push(`${prefix}.kind unbekannt`);
  validateReview(chain, prefix);
  validateSources(chain.sources, prefix);
});

conditionGuidance.forEach((guidance, index) => {
  const prefix = `conditionGuidance[${index}]`;
  ['conditionId', 'summary', 'lastReviewed'].forEach(field => {
    if (!hasText(guidance[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!knownConditionIds.has(guidance.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  ['whenToTest', 'recommendedTests', 'pitfalls', 'settingNotes'].forEach(field => {
    if (!Array.isArray(guidance[field]) || guidance[field].length === 0) {
      errors.push(`${prefix}.${field} braucht mindestens einen Eintrag`);
      return;
    }
    guidance[field].forEach((item, itemIndex) => {
      if (!hasText(item)) errors.push(`${prefix}.${field}[${itemIndex}] fehlt`);
    });
  });
  validateReview(guidance, prefix);
  validateSources(guidance.links, `${prefix}.links`);
});

const physicalSystemIds = new Set(physicalSystems.map(system => system.id));
const physicalConditionIds = new Set(physicalConditions.map(condition => condition.id));
const physicalFindingKeys = new Set();

physicalSystems.forEach((system, index) => {
  const prefix = `physicalSystems[${index}]`;
  ['id', 'label'].forEach(field => {
    if (!hasText(system[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!Number.isFinite(system.sortOrder)) errors.push(`${prefix}.sortOrder fehlt`);
});

physicalConditions.forEach((condition, index) => {
  const prefix = `physicalConditions[${index}]`;
  ['id', 'systemId', 'label', 'sourceBox'].forEach(field => {
    if (!hasText(condition[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!physicalSystemIds.has(condition.systemId)) errors.push(`${prefix}.systemId unbekannt`);
});

function validatePhysicalLr(lr, prefix) {
  if (typeof lr !== 'object' || lr === null) {
    errors.push(`${prefix} fehlt`);
    return;
  }
  if (lr.notReported) {
    if (lr.value !== null) errors.push(`${prefix}.value muss null sein, wenn nicht berichtet`);
    return;
  }
  if (!Number.isFinite(lr.value) || lr.value <= 0) errors.push(`${prefix}.value ungültig`);
  if ((lr.ciLow === undefined) !== (lr.ciHigh === undefined)) errors.push(`${prefix}.CI unvollständig`);
  if (lr.ciLow !== undefined && (lr.ciLow < 0 || lr.ciHigh < lr.ciLow)) errors.push(`${prefix}.CI unplausibel`);
}

physicalFindings.forEach((finding, index) => {
  const prefix = `physicalFindings[${index}]`;
  ['id', 'systemId', 'conditionId', 'findingLabel', 'positiveCriterion', 'negativeCriterion', 'limitations', 'reviewStatus'].forEach(field => {
    if (!hasText(finding[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!physicalSystemIds.has(finding.systemId)) errors.push(`${prefix}.systemId unbekannt`);
  if (!physicalConditionIds.has(finding.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!reviewStatuses.has(finding.reviewStatus)) errors.push(`${prefix}.reviewStatus unbekannt`);
  if (!Number.isFinite(finding.pretestRange?.low) || !Number.isFinite(finding.pretestRange?.high) || finding.pretestRange.low < 0 || finding.pretestRange.high > 100 || finding.pretestRange.low > finding.pretestRange.high) {
    errors.push(`${prefix}.pretestRange unplausibel`);
  }
  ['title', 'sourceBox', 'note'].forEach(field => {
    if (!hasText(finding.source?.[field])) errors.push(`${prefix}.source.${field} fehlt`);
  });
  if (!Number.isFinite(finding.source?.sourcePage)) errors.push(`${prefix}.source.sourcePage fehlt`);
  validatePhysicalLr(finding.lrPositive, `${prefix}.lrPositive`);
  validatePhysicalLr(finding.lrNegative, `${prefix}.lrNegative`);
  if (finding.lrPositive?.notReported && finding.lrNegative?.notReported) errors.push(`${prefix}.lr komplett fehlend`);
  const duplicateKey = `${finding.conditionId}:${finding.id}:${finding.source?.sourceBox}`;
  if (physicalFindingKeys.has(duplicateKey)) errors.push(`${prefix}.duplicate`);
  physicalFindingKeys.add(duplicateKey);
});

const physicalAudit = {
  strongRuleIn: physicalFindings.filter(finding => finding.lrPositive?.value >= 10).length,
  strongRuleOut: physicalFindings.filter(finding => finding.lrNegative?.value != null && finding.lrNegative.value <= 0.1).length,
  missingNegative: physicalFindings.filter(finding => finding.lrNegative?.notReported).length
};
if (physicalAudit.strongRuleIn !== 99 || physicalAudit.strongRuleOut !== 51 || physicalAudit.missingNegative !== 94) {
  errors.push(`McGee-Auditgruppen unerwartet: ${JSON.stringify(physicalAudit)}`);
}
if (physicalFindings.some(finding => finding.reviewStatus !== 'needs-review')) {
  errors.push('Öffentliche McGee-Befunde müssen bis zur Einzelprüfung needs-review bleiben');
}

const fallbackConditionIds = new Set(
  assumptions
    .filter(assumption => assumption.evidenceLevel === 'fallback')
    .map(assumption => assumption.conditionId)
);
const testConditionIds = new Set(tests.map(test => test.conditionId));
testConditionIds.forEach(conditionId => {
  if (!fallbackConditionIds.has(conditionId) && !pretestEvidenceGaps.some(gap => gap.conditionId === conditionId)) {
    errors.push(`condition ${conditionId} hat keinen Fallback`);
  }
});
conditions.forEach(condition => {
  clinicalSettings.forEach(setting => {
    const key = `${condition.id}:${setting.id}`;
    if (!directPretestKeys.has(key) && !gapPretestKeys.has(key)) {
      errors.push(`Prätest-Matrixlücke ohne Annahme oder Evidenzlücken-Vermerk: ${key}`);
    }
  });
});

const questionIds = new Set();
practiceQuestions.forEach(question => {
  const prefix = `practiceQuestions.${question.id}`;
  ['id','conditionId','label','indication','urgent','burden','reflection'].forEach(key => {if (!hasText(question[key])) errors.push(`${prefix}.${key} fehlt`);});
  if (questionIds.has(question.id)) errors.push(`${prefix}: doppelte ID`);
  questionIds.add(question.id);
  if (!knownConditionIds.has(question.conditionId)) errors.push(`${prefix}.conditionId unbekannt`);
  if (!Array.isArray(question.contexts) || question.contexts.length === 0 || question.contexts.some(c => !['screening','suspicion','incidental','follow-up'].includes(c))) errors.push(`${prefix}.contexts ungültig`);
  if (!Array.isArray(question.prerequisites) || question.prerequisites.length === 0 || question.prerequisites.some(p => !hasText(p))) errors.push(`${prefix}.prerequisites unvollständig`);
  if (!Array.isArray(question.testIds) || question.testIds.length === 0 || question.testIds.some(id => !tests.some(t => t.id === id && t.conditionId === question.conditionId))) errors.push(`${prefix}.testIds nicht passend`);
  ['normal','abnormal','borderline','discordant','uninterpretable'].forEach(category => {if (!hasText(question.results?.[category])) errors.push(`${prefix}.results.${category} fehlt`);});
  validateSources(question.sources, prefix);
  validateReview(question, prefix);
});

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${conditions.length} conditions, ${tests.length} tests, ${assumptions.length} canonical pretest assumptions, ${pretestEvidenceGaps.length} pretest evidence gap groups, ${modifiers.length} clinical modifiers, ${diagnosticChains.length} diagnostic chains, ${conditionGuidance.length} condition guidance entries, ${practiceQuestions.length} practice questions and ${physicalFindings.length} physical findings.`);
