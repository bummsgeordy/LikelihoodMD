import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tests = JSON.parse(fs.readFileSync(path.join(root, 'src/data/tests.json'), 'utf8'));
const assumptions = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/pretest-assumptions.json'), 'utf8')
);
const modifiers = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/clinical-modifiers.json'), 'utf8')
);

const sourceKinds = new Set(['Leitlinie', 'Studie', 'Review', 'Lehrtext', 'Lokale Annahme']);
const profileKinds = new Set(['curated', 'custom', 'scenario']);
const pretestEvidenceLevels = new Set(['direct', 'fallback', 'manual']);
const modifierDirections = new Set(['increases', 'decreases', 'uncertain']);
const modifierCategories = new Set(['Symptom', 'Klinisches Zeichen', 'Anamnese', 'Kontext', 'Labor/Vorbefund']);
const errors = [];

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
    if (!sourceKinds.has(source.kind)) errors.push(`${sourcePrefix}.kind unbekannt`);
    if (!hasText(source.note)) errors.push(`${sourcePrefix}.note fehlt`);
  });
}

function validateProfile(profile, prefix) {
  ['id', 'testId', 'label', 'method', 'cutoff', 'population', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(profile[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!profileKinds.has(profile.kind)) errors.push(`${prefix}.kind unbekannt`);
  if (profile.sensitivity !== null && !probability(profile.sensitivity)) errors.push(`${prefix}.sensitivity ungültig`);
  if (profile.specificity !== null && !probability(profile.specificity)) errors.push(`${prefix}.specificity ungültig`);
  if (profile.lrPositive !== undefined && (!Number.isFinite(profile.lrPositive) || profile.lrPositive <= 0)) {
    errors.push(`${prefix}.lrPositive ungültig`);
  }
  if (profile.lrNegative !== undefined && (!Number.isFinite(profile.lrNegative) || profile.lrNegative < 0)) {
    errors.push(`${prefix}.lrNegative ungültig`);
  }
  if (profile.kind === 'scenario' && !hasText(profile.deviationReason)) errors.push(`${prefix}.deviationReason fehlt`);
  validateSources(profile.sources, prefix);
}

tests.forEach((test, index) => {
  const prefix = `tests[${index}]`;
  ['id', 'name', 'category', 'condition', 'description'].forEach(field => {
    if (!hasText(test[field])) errors.push(`${prefix}.${field} fehlt`);
  });
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
  if (!probability(assumption.probability)) errors.push(`${prefix}.probability ungültig`);
  if (assumption.rangeLow !== undefined && !probability(assumption.rangeLow)) errors.push(`${prefix}.rangeLow ungültig`);
  if (assumption.rangeHigh !== undefined && !probability(assumption.rangeHigh)) errors.push(`${prefix}.rangeHigh ungültig`);
  if (assumption.rangeLow > assumption.rangeHigh) errors.push(`${prefix}.range unplausibel`);
  validateSources(assumption.sources, prefix);
});

modifiers.forEach((modifier, index) => {
  const prefix = `modifiers[${index}]`;
  ['id', 'conditionId', 'label', 'category', 'direction', 'rationale', 'limitations', 'lastReviewed'].forEach(field => {
    if (!hasText(modifier[field])) errors.push(`${prefix}.${field} fehlt`);
  });
  if (!modifierCategories.has(modifier.category)) errors.push(`${prefix}.category unbekannt`);
  if (!modifierDirections.has(modifier.direction)) errors.push(`${prefix}.direction unbekannt`);
  if (!profileKinds.has(modifier.kind)) errors.push(`${prefix}.kind unbekannt`);
  if (modifier.probabilityFactor !== undefined && (!Number.isFinite(modifier.probabilityFactor) || modifier.probabilityFactor <= 0)) {
    errors.push(`${prefix}.probabilityFactor ungültig`);
  }
  if (modifier.likelihoodRatio !== undefined && (!Number.isFinite(modifier.likelihoodRatio) || modifier.likelihoodRatio <= 0)) {
    errors.push(`${prefix}.likelihoodRatio ungültig`);
  }
  validateSources(modifier.sources, prefix);
});

const fallbackConditionIds = new Set(
  assumptions
    .filter(assumption => assumption.evidenceLevel === 'fallback')
    .map(assumption => assumption.conditionId)
);
const testConditionIds = new Set(tests.map(test => slugifyClinicalLabel(test.condition)));
testConditionIds.forEach(conditionId => {
  if (!fallbackConditionIds.has(conditionId)) {
    errors.push(`condition ${conditionId} hat keinen Fallback`);
  }
});

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${tests.length} tests, ${assumptions.length} pretest assumptions and ${modifiers.length} clinical modifiers.`);
