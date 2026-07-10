import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tests = JSON.parse(fs.readFileSync(path.join(root, 'src/data/tests.json'), 'utf8'));
const findings = JSON.parse(fs.readFileSync(path.join(root, 'src/data/physical-findings.json'), 'utf8'));
const assumptions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/pretest-assumptions.json'), 'utf8'));
const modifiers = JSON.parse(fs.readFileSync(path.join(root, 'src/data/clinical-modifiers.json'), 'utf8'));
const chains = JSON.parse(fs.readFileSync(path.join(root, 'src/data/diagnostic-chains.json'), 'utf8'));
const guidance = JSON.parse(fs.readFileSync(path.join(root, 'src/data/condition-guidance.json'), 'utf8'));
const profiles = tests.flatMap(test =>
  test.evidenceProfiles.map(profile => ({ test, profile }))
);

const modeCounts = Object.fromEntries(
  ['binary-lr', 'categorical', 'workflow-only'].map(mode => [
    mode,
    profiles.filter(entry => entry.profile.calculationMode === mode).length
  ])
);
const escapeCell = value => String(value ?? '–').replaceAll('|', '\\|').replaceAll('\n', ' ');
const rows = profiles
  .sort((a, b) =>
    a.test.condition.localeCompare(b.test.condition, 'de') ||
    a.test.name.localeCompare(b.test.name, 'de') ||
    a.profile.label.localeCompare(b.profile.label, 'de')
  )
  .map(({ test, profile }) => {
    const primarySource = profile.sources[0];
    const source = primarySource
      ? `[${escapeCell(primarySource.title)}](${primarySource.url}) (${primarySource.year})`
      : '–';
    return `| ${escapeCell(test.condition)} | ${escapeCell(test.name)} | ${escapeCell(profile.label)} | ${profile.calculationMode} | ${source} | ${profile.reviewStatus} |`;
  });

const assumptionRows = assumptions
  .sort((a, b) => a.condition.localeCompare(b.condition, 'de') || a.setting.localeCompare(b.setting, 'de'))
  .map(assumption => {
    const primarySource = assumption.sources[0];
    const source = primarySource
      ? `[${escapeCell(primarySource.title)}](${primarySource.url}) (${primarySource.year})`
      : '–';
    const range = assumption.rangeLow != null && assumption.rangeHigh != null
      ? `${(assumption.rangeLow * 100).toLocaleString('de-DE')}–${(assumption.rangeHigh * 100).toLocaleString('de-DE')} %`
      : '–';
    return `| ${escapeCell(assumption.condition)} | ${escapeCell(assumption.setting)} | ${(assumption.probability * 100).toLocaleString('de-DE')} % | ${range} | ${source} | ${assumption.reviewStatus} |`;
  });

const chainRows = chains
  .sort((a, b) => a.label.localeCompare(b.label, 'de'))
  .map(chain => {
    const source = chain.sources[0]
      ? `[${escapeCell(chain.sources[0].title)}](${chain.sources[0].url}) (${chain.sources[0].year})`
      : '–';
    const stages = chain.stages.map(stage => escapeCell(stage.label)).join(' → ');
    return `| ${escapeCell(chain.label)} | ${stages} | ${source} | ${chain.reviewStatus} |`;
  });

const strongRuleIn = findings.filter(finding => (finding.lrPositive.value ?? 0) >= 10).length;
const strongRuleOut = findings.filter(finding => finding.lrNegative.value != null && finding.lrNegative.value <= 0.1).length;
const missingNegative = findings.filter(finding => finding.lrNegative.notReported).length;

const document = `# Evidenz-Audit

Stand: 2026-07-10 · Datenschema v6

Dieser Bericht dokumentiert den maschinell prüfbaren Stand der kuratierten Daten. Ein Quellenabgleich oder eine strukturelle Prüfung setzt einen Eintrag **nicht** automatisch auf \`reviewed\`. Die fachliche Einzelprüfung durch einen benannten Reviewer bleibt erforderlich.

## Zentrale Korrekturen des Stabilisierungsreleases

- Nicht quantifizierbare Verfahren sind \`categorical\` oder \`workflow-only\`; LR 1/1 wird nicht als Platzhalter verwendet.
- LR− 0 und nicht endliche LR werden blockiert. Calcitonin wird mit sichtbarer Unsicherheit statt absolutem Ausschluss dargestellt.
- Troponin ist vom stabilen KHK-Kontext getrennt und als serieller ACS-/Myokardschaden-Workflow geführt.
- Diagnostikketten enthalten bedingte Fortsetzungen und Stopppfade; nach negativem D-Dimer wird im geeigneten Standardpfad keine Bildgebung fortgerechnet.
- \`pretest-assumptions.json\` ist die einzige kanonische Prätestbasis. Evidenzlücken werden separat dokumentiert.
- 1000er-Veranschaulichungen werden nur aus direkt hinterlegter Sensitivität und Spezifität erzeugt.

## Profilübersicht

- Profile insgesamt: ${profiles.length}
- Binär berechenbar: ${modeCounts['binary-lr']}
- Kategorisch: ${modeCounts.categorical}
- Nur Workflow/Kontext: ${modeCounts['workflow-only']}

| Erkrankung | Test | Profil | Modus | Primärquelle | Status |
|---|---|---|---|---|---|
${rows.join('\n')}

## Prätestannahmen

- Kanonische Annahmen: ${assumptions.length}
- Klinische Modifikatoren: ${modifiers.length}

| Erkrankung | Setting/Population | Startwert | Spanne | Primärquelle | Status |
|---|---|---:|---:|---|---|
${assumptionRows.join('\n')}

## Diagnostikketten und Guidance

- Bedingte Diagnostikketten: ${chains.length}
- Krankheitsbezogene Guidance-Einträge: ${guidance.length}

| Kette | Bedingte Stufen | Primärquelle | Status |
|---|---|---|---|
${chainRows.join('\n')}

## Körperliche Untersuchung nach McGee

- Befunde insgesamt: ${findings.length}
- Prioritäre Einzelprüfung LR+ ≥ 10: ${strongRuleIn}
- Prioritäre Einzelprüfung LR− ≤ 0,1: ${strongRuleOut}
- LR− nicht berichtet: ${missingNegative}
- Öffentlicher Status: alle Einträge \`needs-review\`

Der öffentliche Datensatz ist als deutschsprachige Arbeitsfassung aufbereitet und enthält Kriterien, LR/Konfidenzintervalle und präzise Buchreferenzen. Einzelne medizinische Begriffe sind noch nicht abschließend sprachlich vereinheitlicht. Englische Originalspalten und Arbeitsmaterial bleiben außerhalb des öffentlichen Bundles. Vor einer breiteren Wiederverwendung sind fachlicher, sprachlicher und urheberrechtlicher Review erforderlich.

## Verbleibende Grenzen

- Viele LR gelten nur für die jeweilige Population, Methode und den jeweiligen Cut-off.
- Bei fehlenden Konfidenzintervallen kann kein vollständiger Posttest-Unsicherheitsbereich berechnet werden.
- Klinische Modifikatoren bleiben ohne direkt belegten numerischen Effekt qualitativ.
- Lokale Prävalenzen, Laborassays und Behandlungspfade können von den kuratierten Startwerten abweichen.
- Die verbleibende Aufteilung der großen UI-Startdatei in weitere unabhängige Renderer ist technischer Folgebedarf; medizinische Berechnungen und 1000er-Logik sind bereits DOM-unabhängig getestet.
`;

fs.writeFileSync(path.join(root, 'docs/EVIDENCE_AUDIT.md'), document);
console.log(`Evidenz-Audit mit ${profiles.length} Profilen geschrieben.`);
