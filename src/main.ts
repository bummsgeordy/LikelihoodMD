import './styles.css';
import clinicalSettingsRaw from './data/clinical-settings.json';
import conditionGuidanceRaw from './data/condition-guidance.json';
import conditionsRaw from './data/conditions.json';
import diagnosticChainsRaw from './data/diagnostic-chains.json';
import curatedModifiersRaw from './data/clinical-modifiers.json';
import curatedAssumptionsRaw from './data/pretest-assumptions.json';
import curatedTestsRaw from './data/tests.json';
import physicalSystemsRaw from './data/physical-systems.json';
import physicalConditionsRaw from './data/physical-conditions.json';
import physicalFindingsRaw from './data/physical-findings.json';
import {
  calculateResult,
  clamp,
  clampProbabilityPercent,
  formatPercent,
  formatRatio,
  likelihoodRatiosFromSensitivitySpecificity,
  resolveLikelihoodRatios
} from './lib/calculations';
import {
  buildExport,
  defaultState,
  downloadJson,
  loadState,
  parseUserDataExport,
  resetStoredState,
  saveState
} from './lib/storage';
import { drawNomogramCanvases } from './ui/renderNomogram';
import {
  filterCatalogRows,
  sortCatalogRows,
  type CatalogRow,
  type CatalogRowKind,
  type CatalogSortKey
} from './app/catalog';
import { clinicalIdFromLabel, conditionIdForTest, conditionLabel, mergeConditions } from './app/conditions';
import { calculateDiagnosticChain } from './app/diagnosticChains';
import { renderDiagnosticChains } from './ui/renderDiagnosticChains';
import { validateClinicalModifier, validateDiagnosticTest, validateEvidenceProfile, validatePretestAssumption } from './lib/validation';
import type {
  CalculationResult,
  CalculatorState,
  ClinicalCondition,
  ConditionGuidance,
  ClinicalModifier,
  ClinicalModifierDirection,
  ClinicalSetting,
  DataCompleteness,
  DiagnosticChain,
  DiagnosticTest,
  EvidenceProfile,
  EvidenceQuality,
  EvidenceSource,
  PhysicalCondition,
  PhysicalFinding,
  PhysicalSystem,
  PretestAssumption,
  ReviewMetadata,
  ReviewStatus,
  SourceKind
} from './types';

const curatedTests = curatedTestsRaw as DiagnosticTest[];
const curatedAssumptions = curatedAssumptionsRaw as PretestAssumption[];
const curatedModifiers = curatedModifiersRaw as ClinicalModifier[];
const clinicalSettings = clinicalSettingsRaw as ClinicalSetting[];
const clinicalConditions = conditionsRaw as ClinicalCondition[];
const conditionGuidance = conditionGuidanceRaw as ConditionGuidance[];
const diagnosticChains = diagnosticChainsRaw as DiagnosticChain[];
const physicalSystems = physicalSystemsRaw as PhysicalSystem[];
const physicalConditions = physicalConditionsRaw as PhysicalCondition[];
const physicalFindings = physicalFindingsRaw as PhysicalFinding[];

const DEFAULT_TEST_BY_CONDITION: Record<string, string> = {
  'akromegalie': 'igf1-acromegaly',
  'cushing-syndrom-hyperkortisolismus': 'dst-1mg',
  'morbus-basedow': 'trab-graves',
  'medullares-schilddrusenkarzinom': 'basal-calcitonin-thyroid-nodule',
  'nebenniereninsuffizienz': 'acth-stimulation-250',
  'phaochromozytom-paragangliom': 'metanephrines-plasma',
  'primarer-hyperaldosteronismus': 'arr',
  'zoliakie': 'ttg-iga-celiac',
  'herzinsuffizienz': 'ntprobnp',
  'tiefe-venenthrombose': 'd-dimer-dvt',
  'lungenembolie': 'd-dimer-pe'
};

let state: CalculatorState = loadState();
let lastFocusBeforeDrawer: HTMLElement | null = null;
let selectedCatalogRowKey = '';
let catalogFiltersLoaded = false;
const CATALOG_FILTER_KEY = 'likelihood-ratio-rechner-catalog-filters-v1';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found.');

app.innerHTML = `
  <main class="app">
    <header class="hero">
      <div class="hero-top">
        <h1>Likelihood-Ratio-Rechner</h1>
        <div class="hero-actions">
          <a class="secondary-button info-link" href="./info/vierfeldertafel/index.html">Diagnostische Kennzahlen</a>
          <a class="secondary-button info-link" href="./simulation/">Simulation</a>
          <button id="drawerOpenButton" class="menu-button" type="button" aria-controls="adminDrawer" aria-expanded="false">☰ Daten verwalten</button>
        </div>
      </div>
      <section class="disclaimer-box" aria-labelledby="disclaimerTitle">
        <div class="disclaimer-summary">
          <p id="disclaimerTitle">Lehr- und Rechentool für medizinische Fachpersonen. Kein Medizinprodukt, keine alleinige Entscheidungsgrundlage.</p>
          <button id="disclaimerToggleButton" class="secondary-button compact-button" type="button" aria-expanded="false" aria-controls="disclaimerContent">
            <span aria-hidden="true" id="disclaimerToggleIcon">+</span>
            <span id="disclaimerToggleLabel">Details anzeigen</span>
          </button>
        </div>
        <div id="disclaimerContent" class="disclaimer-content hidden">
          <p class="lead">Deutschsprachiges Lehr- und Rechentool für medizinische Fachpersonen: Es soll dabei helfen zu visualisieren, unter welchen Bedingungen, etwa bei unterschiedlichen Prätestwahrscheinlichkeiten in unterschiedlichen Settings der Patientenvorstellung, welche Faktoren und diagnostischen Tests die Wahrscheinlichkeit einer Diagnose in welchem Ausmaß beeinflussen. Datengrundlage sind, soweit möglich, Studien zu Prävalenz, beeinflussenden Faktoren sowie Sensitivität und Spezifität der entsprechenden Tests. Die Daten sind noch unvollständig und können Fehler enthalten. Mithilfe bei der Erweiterung ist ausdrücklich erwünscht.</p>
          <div class="notice" role="note">Dieses Tool ist keine alleinige Entscheidungsgrundlage, kein Medizinprodukt und ersetzt keine klinische Beurteilung. Insbesondere präanalytische Faktoren wie interferierende Medikamente, Begleiterkrankungen und Testbedingungen können die Aussagekraft der Tests signifikant beeinflussen.</div>
        </div>
      </section>
    </header>

    <nav class="mode-tabs" aria-label="Rechner-Modus">
      <button id="diagnosticModeTab" type="button" data-mode-tab="diagnostic-tests">Diagnostische Tests</button>
      <button id="physicalModeTab" type="button" data-mode-tab="physical-exam">Körperliche Untersuchung</button>
    </nav>

    <section class="calculator-grid" id="calculatorGrid" aria-label="Likelihood-Ratio-Rechner">
      <div class="calculator-column calculator-column-primary">
      <section class="card settings-card" aria-labelledby="settingsTitle">
        <h2 id="settingsTitle">Rechner</h2>
        <div class="field">
          <label for="settingSelect">Setting wählen</label>
          <select id="settingSelect"></select>
        </div>
        <div class="field">
          <label for="conditionSelect">Erkrankung wählen</label>
          <select id="conditionSelect"></select>
        </div>
        <div class="field">
          <label for="testSelect">Diagnostischen Test wählen</label>
          <select id="testSelect"></select>
        </div>
        <div class="field">
          <label for="profileSelect">Evidenzprofil / Quelle wählen</label>
          <select id="profileSelect"></select>
          <p class="muted" id="profileHint">Mehrere Quellen oder Cut-offs werden als auswählbare Evidenzprofile geführt.</p>
        </div>
        <div class="scenario-banner hidden" id="scenarioBanner"></div>
        <div class="mismatch-warning hidden" id="mismatchWarning"></div>
        <div class="field">
          <label for="pretestRange">Prätestwahrscheinlichkeit (%)</label>
          <div class="pretest-control">
            <div class="range-with-marker" id="pretestRangeWrap">
              <input id="pretestRange" type="range" min="0.1" max="99.9" step="0.1">
              <button id="pretestSuggestionMarker" class="pretest-suggestion-marker" type="button" aria-label="Vorgeschlagene Prätestwahrscheinlichkeit übernehmen"></button>
            </div>
            <input id="pretestNumber" class="pretest-number-input" type="text" inputmode="decimal" autocomplete="off" maxlength="5" aria-label="Prätestwahrscheinlichkeit in Prozent">
          </div>
          <p class="pretest-suggestion-hint" id="pretestSuggestionHint"></p>
        </div>
        <div class="pretest-status" id="pretestStatus"></div>
        <div class="field modifier-field">
          <div class="section-heading-row compact-heading">
            <label>Klinische Modifikatoren</label>
            <button id="toggleModifierListButton" class="secondary-button compact-button" type="button">Mehr anzeigen</button>
          </div>
          <div id="modifierOptions" class="modifier-options"></div>
          <div id="modifierSummary" class="modifier-summary muted"></div>
          <button id="applyModifiedPretestButton" class="secondary-button hidden" type="button">Modifizierte Prätestwahrscheinlichkeit übernehmen</button>
        </div>
        <div class="metric-grid" aria-label="Likelihood-Ratios">
          <div class="metric"><span class="label">LR+</span><span class="value" id="lrPositive">–</span></div>
          <div class="metric"><span class="label">LR−</span><span class="value" id="lrNegative">–</span></div>
        </div>
        <div class="button-row">
          <button id="copySummaryButton" class="primary-button" type="button">Kurzbericht kopieren</button>
          <button id="resetButton" type="button">Zurücksetzen</button>
        </div>
        <p class="message hidden" id="actionMessage" role="status"></p>
      </section>

      <section class="card" id="resultsCard" aria-labelledby="resultsTitle" aria-live="polite">
        <h2 id="resultsTitle">Ergebnisse</h2>
        <div class="bars">
          <div>
            <div class="bar-heading"><span>Prätest</span><span id="pretestValue">–</span></div>
            <div class="bar-track" aria-hidden="true"><div class="bar pretest" id="pretestBar"></div></div>
          </div>
          <div>
            <div class="bar-heading"><span>Nach positivem Ergebnis</span><span id="postPositiveValue">–</span></div>
            <div class="bar-track" aria-hidden="true"><div class="bar positive" id="postPositiveBar"></div></div>
          </div>
          <div>
            <div class="bar-heading"><span>Nach negativem Ergebnis</span><span id="postNegativeValue">–</span></div>
            <div class="bar-track" aria-hidden="true"><div class="bar negative" id="postNegativeBar"></div></div>
          </div>
        </div>
        <div class="interpretation" id="interpretation">–</div>
        <div class="modifier-impact hidden" id="resultModifierImpact"></div>
      </section>

      </div>
      <div class="calculator-column calculator-column-secondary">
      <section class="card nomogram-card" id="nomogramCard" aria-labelledby="nomogramTitle">
        <input id="nomogramSizeToggle" class="nomogram-size-toggle" type="checkbox">
        <div class="section-heading-row">
          <h2 id="nomogramTitle">Nomogramm</h2>
          <label for="nomogramSizeToggle" class="secondary-button compact-button nomogram-toggle">
            <span class="toggle-small">Nomogramm auf ganzer Breite</span>
            <span class="toggle-large">Normal anzeigen</span>
          </label>
        </div>
        <div class="nomogram-panels">
          <section class="nomogram-panel" aria-labelledby="nomogramPositiveTitle">
            <h3 id="nomogramPositiveTitle">Positives Testergebnis (LR+)</h3>
            <canvas id="nomogramPositive" width="720" height="405" aria-label="Fagan-Nomogramm für positives Testergebnis"></canvas>
          </section>
          <section class="nomogram-panel" aria-labelledby="nomogramNegativeTitle">
            <h3 id="nomogramNegativeTitle">Negatives Testergebnis (LR−)</h3>
            <canvas id="nomogramNegative" width="720" height="405" aria-label="Fagan-Nomogramm für negatives Testergebnis"></canvas>
          </section>
        </div>
        <div class="modifier-impact hidden" id="nomogramModifierImpact"></div>
        <div class="nomogram-guide">
          <h3>Nomogramm interpretieren</h3>
          <p>Das Nomogramm macht sichtbar, wie ein Testergebnis die Wahrscheinlichkeit einer Erkrankung verändert: links steht die Ausgangswahrscheinlichkeit, in der Mitte die Likelihood-Ratio und rechts die daraus entstehende Posttestwahrscheinlichkeit. So wird erkennbar, ob ein Test die klinische Entscheidung wahrscheinlich wirklich verändert.</p>
          <p class="muted">Weiterlesen: <a href="https://www.healthknowledge.org.uk/content/pre-and-post-test-probability" target="_blank" rel="noopener noreferrer">Health Knowledge</a> und <a href="https://ebm.bmj.com/content/18/4/125" target="_blank" rel="noopener noreferrer">BMJ Evidence-Based Medicine</a>.</p>
        </div>
      </section>

      <section class="card diagnostic-chain-card" id="diagnosticChainCard" aria-labelledby="diagnosticChainTitle">
        <div class="section-heading-row chain-title-row">
          <h2 id="diagnosticChainTitle">Diagnostikketten</h2>
          <label class="chain-select-label" for="diagnosticChainSelect">
            <span>Beispiel wählen</span>
            <select id="diagnosticChainSelect"></select>
          </label>
        </div>
        <p class="muted">Vordefinierte Beispiele zeigen, wie eine Posttestwahrscheinlichkeit zur neuen Prätestwahrscheinlichkeit des nächsten Tests wird.</p>
        <div id="diagnosticChainsPanel"></div>
      </section>

      <aside class="side-column">
        <section class="card" id="detailsCard" aria-labelledby="detailsTitle">
          <h2 id="detailsTitle">Zahlen, Herkunft und Begründung</h2>
          <div class="details" id="details"></div>
          <div class="evidence-divider" aria-hidden="true"></div>
          <div id="evidencePanel"></div>
        </section>
        <section class="card condition-guidance-card" id="conditionGuidanceCard" aria-labelledby="conditionGuidanceTitle">
          <h2 id="conditionGuidanceTitle">Weiterführende Informationen</h2>
          <div id="conditionGuidanceContent"></div>
        </section>
      </aside>
      </div>
    </section>

    <section class="calculator-grid hidden" id="physicalExamGrid" aria-label="Likelihood-Ratio-Rechner für körperliche Untersuchung">
      <div class="calculator-column calculator-column-primary">
        <section class="card settings-card" aria-labelledby="physicalSettingsTitle">
          <h2 id="physicalSettingsTitle">Körperliche Untersuchung</h2>
          <p class="physical-source-note">Diese Ansicht beruht auf McGee, <em>Evidence-Based Physical Diagnosis</em>, 6. Auflage. Sie fasst dort berichtete Likelihood-Ratios zu Lern- und Visualisierungszwecken knapp zusammen. Für die klinische Einordnung und die vollständigen Erläuterungen sollte das Buch selbst herangezogen werden; es ist dafür eine sehr empfehlenswerte Quelle.</p>
          <div class="field">
            <label for="physicalSystemSelect">Körpersystem wählen</label>
            <select id="physicalSystemSelect"></select>
          </div>
          <div class="field">
            <label for="physicalConditionSelect">Fragestellung wählen</label>
            <select id="physicalConditionSelect"></select>
          </div>
          <div class="field">
            <label for="physicalFindingSelect">Befund wählen</label>
            <select id="physicalFindingSelect"></select>
            <p class="muted" id="physicalFindingHint">Quelle: McGee, Evidence-Based Physical Diagnosis. Die Werte sind redaktionell kuratiert und als needs-review markiert.</p>
          </div>
          <div class="field">
            <label for="physicalPretestRange">Prätestwahrscheinlichkeit (%)</label>
            <div class="pretest-control">
              <input id="physicalPretestRange" type="range" min="0.1" max="99.9" step="0.1">
              <input id="physicalPretestNumber" class="pretest-number-input" type="text" inputmode="decimal" autocomplete="off" maxlength="5" aria-label="Prätestwahrscheinlichkeit in Prozent">
            </div>
            <p class="pretest-suggestion-hint" id="physicalPretestHint"></p>
          </div>
          <div class="metric-grid" aria-label="Likelihood-Ratios körperlicher Befunde">
            <div class="metric"><span class="label">LR bei Befund vorhanden</span><span class="value" id="physicalLrPositive">–</span></div>
            <div class="metric"><span class="label">LR bei Befund fehlend</span><span class="value" id="physicalLrNegative">–</span></div>
          </div>
          <p class="message hidden" id="physicalActionMessage" role="status"></p>
        </section>

        <section class="card" id="physicalResultsCard" aria-labelledby="physicalResultsTitle" aria-live="polite">
          <h2 id="physicalResultsTitle">Ergebnisse</h2>
          <div class="bars">
            <div>
              <div class="bar-heading"><span>Prätest</span><span id="physicalPretestValue">–</span></div>
              <div class="bar-track" aria-hidden="true"><div class="bar pretest" id="physicalPretestBar"></div></div>
            </div>
            <div>
              <div class="bar-heading"><span>Befund vorhanden</span><span id="physicalPostPositiveValue">–</span></div>
              <div class="bar-track" aria-hidden="true"><div class="bar positive" id="physicalPostPositiveBar"></div></div>
            </div>
            <div>
              <div class="bar-heading"><span>Befund fehlend</span><span id="physicalPostNegativeValue">–</span></div>
              <div class="bar-track" aria-hidden="true"><div class="bar negative" id="physicalPostNegativeBar"></div></div>
            </div>
          </div>
          <div class="interpretation" id="physicalInterpretation">–</div>
        </section>
      </div>

      <div class="calculator-column calculator-column-secondary">
        <section class="card nomogram-card" aria-labelledby="physicalNomogramTitle">
          <h2 id="physicalNomogramTitle">Nomogramm</h2>
          <div class="nomogram-panels">
            <section class="nomogram-panel" aria-labelledby="physicalNomogramPositiveTitle">
              <h3 id="physicalNomogramPositiveTitle">Befund vorhanden (LR+)</h3>
              <canvas id="physicalNomogramPositive" width="720" height="405" aria-label="Fagan-Nomogramm für vorhandenen körperlichen Befund"></canvas>
            </section>
            <section class="nomogram-panel" aria-labelledby="physicalNomogramNegativeTitle">
              <h3 id="physicalNomogramNegativeTitle">Befund fehlend (LR−)</h3>
              <canvas id="physicalNomogramNegative" width="720" height="405" aria-label="Fagan-Nomogramm für fehlenden körperlichen Befund"></canvas>
            </section>
          </div>
          <div class="nomogram-guide">
            <h3>Körperliche Befunde interpretieren</h3>
            <p>Die Darstellung zeigt, wie ein einzelner Untersuchungsbefund die Ausgangswahrscheinlichkeit verändert. Ein vorhandener Befund nutzt LR+, ein fehlender Befund nutzt LR−. Der in McGee angegebene Prätestbereich dient nur als Orientierung.</p>
          </div>
        </section>

        <aside class="side-column">
          <section class="card" aria-labelledby="physicalEvidenceTitle">
            <h2 id="physicalEvidenceTitle">Befund, Evidenz und Quelle</h2>
            <div class="details" id="physicalDetails"></div>
          </section>
        </aside>
      </div>
    </section>

    <div id="drawerBackdrop" class="drawer-backdrop hidden"></div>
    <aside id="adminDrawer" class="admin-drawer" aria-labelledby="drawerTitle" aria-hidden="true">
      <div class="drawer-header">
        <div>
          <h2 id="drawerTitle">Daten verwalten</h2>
          <p class="muted">Eigene Inhalte bleiben lokal im Browser, bis du sie exportierst.</p>
        </div>
        <button id="drawerCloseButton" type="button" aria-label="Datenverwaltung schließen">×</button>
      </div>

      <nav class="admin-tabs" aria-label="Verwaltungsbereiche">
        <button type="button" data-admin-mode="data">Übersicht</button>
        <button type="button" data-admin-mode="catalog">Datenkatalog</button>
        <button type="button" data-admin-mode="test">Test</button>
        <button type="button" data-admin-mode="profile">Evidenzprofil</button>
        <button type="button" data-admin-mode="assumption">Prätest</button>
        <button type="button" data-admin-mode="modifier">Modifikator</button>
        <button type="button" data-admin-mode="scenario">Szenario</button>
      </nav>

      <section class="admin-panel" data-panel="data">
        <h3>Datenübersicht</h3>
        <p class="muted">Hier kannst du kuratierte und eigene Werte ansehen. Änderungen werden als lokale eigene Daten gespeichert, nicht als stilles Überschreiben kuratierter Quellen.</p>
        <div class="admin-filter-grid">
          <div class="field"><label for="adminSettingSelect">Setting</label><select id="adminSettingSelect"></select></div>
          <div class="field"><label for="adminConditionSelect">Erkrankung</label><select id="adminConditionSelect"></select></div>
          <div class="field"><label for="adminTestSelect">Diagnostischer Test</label><select id="adminTestSelect"></select></div>
          <div class="field"><label for="adminProfileSelect">Evidenzprofil</label><select id="adminProfileSelect"></select></div>
        </div>
        <div id="adminOverview" class="admin-overview"></div>
        <div class="button-row">
          <button id="useOverviewSelectionButton" class="secondary-button" type="button">Auswahl im Rechner nutzen</button>
          <button id="copyPretestToFormButton" type="button">Prätest-Annahme korrigieren</button>
          <button id="copyTestToFormButton" type="button">Test kopieren</button>
          <button id="copyProfileToFormButton" type="button">Evidenzprofil korrigieren</button>
        </div>
        <div class="evidence-divider" aria-hidden="true"></div>
        <h3>Import, Export und lokale Daten</h3>
        <p id="customDataSummary" class="muted"></p>
        <div class="button-row">
          <button id="exportButton" class="secondary-button" type="button">JSON exportieren</button>
          <button id="importButton" type="button">JSON importieren</button>
          <input id="importFile" class="hidden" type="file" accept="application/json,.json">
          <button id="clearCustomButton" class="danger-button" type="button">Eigene Daten löschen</button>
        </div>
      </section>

      <section class="admin-panel" data-panel="catalog">
        <div class="section-heading-row">
          <h3>Datenkatalog</h3>
          <button id="catalogFullscreenButton" class="secondary-button compact-button" type="button">Vollbildmodus</button>
        </div>
        <p class="muted">Zusammenführung von Setting, Erkrankung, Prätest-Annahmen, klinischen Modifikatoren, Tests, Evidenzprofilen, Quellen und Fallstricken. Korrekturen werden als lokale Vorschläge angelegt.</p>
        <div class="admin-filter-grid">
          <div class="field full"><label for="catalogSearchInput">Textsuche</label><input id="catalogSearchInput" type="search" placeholder="Erkrankung, Test, Quelle, Setting, Begründung ..."></div>
          <div class="field"><label for="catalogDomainFilter">Datenbereich</label><select id="catalogDomainFilter"><option value="all">Alle</option><option value="diagnostic-tests">Diagnostische Tests</option><option value="physical-exam">Körperliche Untersuchung</option></select></div>
          <div class="field"><label for="catalogConditionFilter">Erkrankung</label><select id="catalogConditionFilter"></select></div>
          <div class="field"><label for="catalogSettingFilter">Setting</label><select id="catalogSettingFilter"></select></div>
          <div class="field"><label for="catalogTestFilter">Test</label><select id="catalogTestFilter"></select></div>
          <div class="field"><label for="catalogStatusFilter">Datenstatus</label><select id="catalogStatusFilter"><option value="all">Alle</option><option value="curated">Kuratierte Daten</option><option value="custom">Eigene Daten</option><option value="scenario">Szenarien</option></select></div>
          <div class="field"><label for="catalogReviewFilter">Review</label><select id="catalogReviewFilter"><option value="all">Alle</option><option value="needs-review">Needs review</option><option value="reviewed">Reviewed</option><option value="draft">Draft</option></select></div>
          <div class="field"><label for="catalogQualityFilter">Evidenzqualität</label><select id="catalogQualityFilter"><option value="all">Alle</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="expert-opinion">Expert opinion</option><option value="unclear">Unclear</option></select></div>
          <div class="field"><label for="catalogCompletenessFilter">Vollständigkeit</label><select id="catalogCompletenessFilter"><option value="all">Alle</option><option value="complete">Complete</option><option value="partial">Partial</option><option value="minimal">Minimal</option></select></div>
          <div class="field"><label for="catalogSortSelect">Sortierung</label><select id="catalogSortSelect"><option value="condition">Erkrankung</option><option value="setting">Setting</option><option value="test">Test</option><option value="lrPositive">LR+</option><option value="lrNegative">LR−</option><option value="reviewStatus">Reviewstatus</option></select></div>
        </div>
        <div class="catalog-table-wrap">
          <table class="catalog-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Erkrankung</th>
                <th>Setting</th>
                <th>Prätest</th>
                <th>Modifikator</th>
                <th>Test</th>
                <th>Evidenzprofil</th>
                <th>Cut-off</th>
                <th>Sens.</th>
                <th>Spez.</th>
                <th>LR+</th>
                <th>LR−</th>
                <th>PPV/NPV</th>
                <th>Review</th>
                <th>Qualität</th>
                <th>Vollst.</th>
                <th>Quelle</th>
                <th>Begründung / Grenzen</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody id="catalogTableBody"></tbody>
          </table>
        </div>
        <aside id="catalogDetailPanel" class="catalog-detail-panel" aria-live="polite"></aside>
        <div class="button-row">
          <button id="markCatalogNeedsReviewButton" type="button">Als needs-review markieren</button>
          <button id="markCatalogReviewedButton" class="secondary-button" type="button">Lokal als reviewed markieren</button>
        </div>
      </section>

      <section class="admin-panel" data-panel="test">
        <h3>Neuen Test anlegen</h3>
        <p class="muted">Ein Test beschreibt das diagnostische Verfahren. Testgüte wird separat als Evidenzprofil gespeichert.</p>
        <div class="editor-grid">
          <div class="field full"><label for="customTestName">Name</label><input id="customTestName" value="Eigener Test"></div>
          <div class="field"><label for="customTestCategory">Kategorie</label><input id="customTestCategory" value="Eigene Tests"></div>
          <div class="field"><label for="customTestCondition">Krankheitsbild</label><input id="customTestCondition" value="Eigene Fragestellung"></div>
          <div class="field full"><label for="customTestDescription">Beschreibung</label><textarea id="customTestDescription">Bitte beschreiben, wofür dieser Test genutzt wird.</textarea></div>
        </div>
        <button id="saveCustomTestButton" class="primary-button" type="button">Test speichern</button>
        <p class="message hidden" id="customTestMessage" role="status"></p>
      </section>

      <section class="admin-panel" data-panel="profile">
        <h3>Evidenzprofil hinzufügen</h3>
        <p class="muted">Nutze diese Option, wenn eine Quelle, Population, Methode oder ein Cut-off eigene Testgütewerte liefert.</p>
        <div class="editor-grid">
          <div class="field full"><label for="profileTestSelect">Zu welchem Test?</label><select id="profileTestSelect"></select></div>
          <div class="field full"><label for="profileLabel">Profilname</label><input id="profileLabel" value="Eigenes Evidenzprofil"></div>
          <div class="field"><label for="profileMethod">Methode</label><input id="profileMethod" value="Lokale Methode"></div>
          <div class="field"><label for="profileCutoff">Cut-off</label><input id="profileCutoff" value="Lokal definiert"></div>
          <div class="field full"><label for="profileProcedure">Kurz-Durchführung</label><input id="profileProcedure" value="Nach lokalem Laborprotokoll durchführen."></div>
          <div class="field"><label for="profileSensitivity">Sensitivität (%)</label><input id="profileSensitivity" type="number" min="0" max="100" step="0.1" value="90"></div>
          <div class="field"><label for="profileSpecificity">Spezifität (%)</label><input id="profileSpecificity" type="number" min="0" max="100" step="0.1" value="80"></div>
          <div class="field full"><label for="profilePopulation">Population</label><textarea id="profilePopulation">Bitte Population beschreiben.</textarea></div>
          <div class="field full"><label for="profileRationale">Begründung</label><textarea id="profileRationale">Bitte begründen, warum dieses Evidenzprofil verwendet wird.</textarea></div>
          <div class="field full"><label for="profileLimitations">Grenzen</label><textarea id="profileLimitations">Bitte Grenzen, Präanalytik und Cut-off-Abhängigkeit beschreiben.</textarea></div>
          <div class="field"><label for="profileSourceTitle">Quellentitel</label><input id="profileSourceTitle" value="Eigene Quelle"></div>
          <div class="field"><label for="profileSourceYear">Jahr</label><input id="profileSourceYear" type="number" value="2026"></div>
          <div class="field full"><label for="profileSourceUrl">Quellen-URL</label><input id="profileSourceUrl" value="https://example.com/local-source"></div>
          <div class="field full"><label for="profileSourceNote">Quellennotiz</label><textarea id="profileSourceNote">Bitte Quelle und Übertragbarkeit kurz erklären.</textarea></div>
        </div>
        <p class="preview-box" id="profilePreview"></p>
        <button id="saveProfileButton" class="primary-button" type="button">Evidenzprofil speichern</button>
        <p class="message hidden" id="profileMessage" role="status"></p>
      </section>

      <section class="admin-panel" data-panel="assumption">
        <h3>Prätest-Annahme hinzufügen</h3>
        <div class="editor-grid">
          <div class="field"><label for="customAssumptionCondition">Krankheitsbild</label><input id="customAssumptionCondition" value="Eigene Fragestellung"></div>
          <div class="field"><label for="customAssumptionSetting">Setting</label><input id="customAssumptionSetting" value="Eigene Praxis"></div>
          <div class="field"><label for="customAssumptionSettingId">Setting-ID</label><input id="customAssumptionSettingId" value="eigene-praxis"></div>
          <div class="field"><label for="customAssumptionEvidenceLevel">Evidenzlevel</label><select id="customAssumptionEvidenceLevel"><option value="direct">Direkte Setting-Daten</option><option value="fallback">Allgemeine Erkrankungsannahme</option></select></div>
          <div class="field"><label for="customAssumptionProbability">Wahrscheinlichkeit (%)</label><input id="customAssumptionProbability" type="number" min="0.1" max="99.9" step="0.1" value="10"></div>
          <div class="field"><label for="customAssumptionRange">Spanne (%)</label><input id="customAssumptionRange" value="5-20"></div>
          <div class="field full"><label for="customAssumptionPopulation">Population</label><textarea id="customAssumptionPopulation">Bitte Patientengruppe beschreiben.</textarea></div>
          <div class="field full"><label for="customAssumptionRationale">Begründung</label><textarea id="customAssumptionRationale">Bitte erklären, warum diese Ausgangswahrscheinlichkeit plausibel ist.</textarea></div>
          <div class="field full"><label for="customAssumptionLimitations">Grenzen</label><textarea id="customAssumptionLimitations">Bitte Grenzen und Übertragbarkeit beschreiben.</textarea></div>
          <div class="field"><label for="customAssumptionSourceTitle">Quellentitel</label><input id="customAssumptionSourceTitle" value="Lokale Annahme"></div>
          <div class="field"><label for="customAssumptionSourceYear">Jahr</label><input id="customAssumptionSourceYear" type="number" value="2026"></div>
          <div class="field full"><label for="customAssumptionSourceUrl">Quellen-URL</label><input id="customAssumptionSourceUrl" value="https://example.com/local-assumption"></div>
          <div class="field full"><label for="customAssumptionSourceNote">Quellennotiz</label><textarea id="customAssumptionSourceNote">Bitte Quelle, lokale Daten oder Expertenschätzung kurz erklären.</textarea></div>
        </div>
        <button id="saveCustomAssumptionButton" class="primary-button" type="button">Prätest-Annahme speichern</button>
        <p class="message hidden" id="customAssumptionMessage" role="status"></p>
      </section>

      <section class="admin-panel" data-panel="modifier">
        <h3>Klinischen Modifikator hinzufügen</h3>
        <p class="muted">Modifikatoren beschreiben Symptome, Zeichen oder Anamnesefaktoren. Sie ändern die Rechnung nur, wenn ein belastbarer Faktor oder LR hinterlegt und aktiv übernommen wird.</p>
        <div class="editor-grid">
          <div class="field full"><label for="modifierConditionSelect">Erkrankung</label><select id="modifierConditionSelect"></select></div>
          <div class="field full"><label for="modifierLabel">Bezeichnung</label><input id="modifierLabel" value="Eigener klinischer Modifikator"></div>
          <div class="field"><label for="modifierCategory">Kategorie</label><select id="modifierCategory"><option>Symptom</option><option>Klinisches Zeichen</option><option>Anamnese</option><option>Kontext</option><option>Labor/Vorbefund</option></select></div>
          <div class="field"><label for="modifierDirection">Richtung</label><select id="modifierDirection"><option value="increases">Erhöht Wahrscheinlichkeit</option><option value="decreases">Senkt Wahrscheinlichkeit</option><option value="uncertain">Unklar</option></select></div>
          <div class="field"><label for="modifierLikelihoodRatio">Optionaler LR</label><input id="modifierLikelihoodRatio" type="number" min="0.01" step="0.01" placeholder="leer lassen"></div>
          <div class="field"><label for="modifierProbabilityFactor">Optionaler Faktor</label><input id="modifierProbabilityFactor" type="number" min="0.01" step="0.01" placeholder="leer lassen"></div>
          <div class="field full"><label for="modifierRationale">Begründung</label><textarea id="modifierRationale">Bitte erklären, warum dieser Modifikator die Prätestwahrscheinlichkeit verändert.</textarea></div>
          <div class="field full"><label for="modifierLimitations">Grenzen</label><textarea id="modifierLimitations">Bitte Grenzen und Übertragbarkeit beschreiben.</textarea></div>
          <div class="field"><label for="modifierSourceTitle">Quellentitel</label><input id="modifierSourceTitle" value="Lokale Annahme"></div>
          <div class="field"><label for="modifierSourceYear">Jahr</label><input id="modifierSourceYear" type="number" value="2026"></div>
          <div class="field full"><label for="modifierSourceUrl">Quellen-URL</label><input id="modifierSourceUrl" value="https://example.com/local-modifier"></div>
          <div class="field full"><label for="modifierSourceNote">Quellennotiz</label><textarea id="modifierSourceNote">Bitte Quelle oder klinische Begründung kurz erklären.</textarea></div>
        </div>
        <button id="saveModifierButton" class="primary-button" type="button">Modifikator speichern</button>
        <p class="message hidden" id="modifierMessage" role="status"></p>
      </section>

      <section class="admin-panel" data-panel="scenario">
        <h3>Abweichendes Szenario speichern</h3>
        <p class="muted">Ein Szenario überschreibt keine Quelle. Es markiert bewusst, warum du andere Werte als das aktive Evidenzprofil nutzt.</p>
        <div class="editor-grid">
          <div class="field full"><label for="scenarioLabel">Szenarioname</label><input id="scenarioLabel" value="Eigenes Szenario"></div>
          <div class="field"><label for="scenarioSensitivity">Sensitivität (%)</label><input id="scenarioSensitivity" type="number" min="0" max="100" step="0.1" value="90"></div>
          <div class="field"><label for="scenarioSpecificity">Spezifität (%)</label><input id="scenarioSpecificity" type="number" min="0" max="100" step="0.1" value="80"></div>
          <div class="field full"><label for="scenarioProcedure">Kurz-Durchführung</label><input id="scenarioProcedure" value="Wie aktives Evidenzprofil, lokal angepasst."></div>
          <div class="field full"><label for="scenarioReason">Grund der Abweichung</label><textarea id="scenarioReason">Bitte beschreiben, warum dieses Szenario vom gewählten Evidenzprofil abweicht.</textarea></div>
        </div>
        <p class="preview-box" id="scenarioPreview"></p>
        <button id="saveScenarioButton" class="primary-button" type="button">Szenario speichern</button>
        <p class="message hidden" id="scenarioMessage" role="status"></p>
      </section>
    </aside>
  </main>
`;

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(() => {
        // Offline-Funktion ist ein Komfortmerkmal; die App bleibt ohne sichtbare Meldung nutzbar.
      });
  });
}

registerServiceWorker();

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} not found.`);
  return element as T;
};

const controls = {
  diagnosticModeTab: $<HTMLButtonElement>('diagnosticModeTab'),
  physicalModeTab: $<HTMLButtonElement>('physicalModeTab'),
  physicalExamGrid: $('physicalExamGrid'),
  settingSelect: $<HTMLSelectElement>('settingSelect'),
  disclaimerToggleButton: $<HTMLButtonElement>('disclaimerToggleButton'),
  disclaimerToggleIcon: $('disclaimerToggleIcon'),
  disclaimerToggleLabel: $('disclaimerToggleLabel'),
  disclaimerContent: $('disclaimerContent'),
  conditionSelect: $<HTMLSelectElement>('conditionSelect'),
  testSelect: $<HTMLSelectElement>('testSelect'),
  profileSelect: $<HTMLSelectElement>('profileSelect'),
  profileHint: $('profileHint'),
  scenarioBanner: $('scenarioBanner'),
  mismatchWarning: $('mismatchWarning'),
  pretestStatus: $('pretestStatus'),
  pretestRange: $<HTMLInputElement>('pretestRange'),
  pretestRangeWrap: $('pretestRangeWrap'),
  pretestNumber: $<HTMLInputElement>('pretestNumber'),
  pretestSuggestionMarker: $<HTMLButtonElement>('pretestSuggestionMarker'),
  pretestSuggestionHint: $('pretestSuggestionHint'),
  modifierOptions: $('modifierOptions'),
  modifierSummary: $('modifierSummary'),
  toggleModifierListButton: $<HTMLButtonElement>('toggleModifierListButton'),
  applyModifiedPretestButton: $<HTMLButtonElement>('applyModifiedPretestButton'),
  lrPositive: $('lrPositive'),
  lrNegative: $('lrNegative'),
  pretestValue: $('pretestValue'),
  postPositiveValue: $('postPositiveValue'),
  postNegativeValue: $('postNegativeValue'),
  pretestBar: $('pretestBar'),
  postPositiveBar: $('postPositiveBar'),
  postNegativeBar: $('postNegativeBar'),
  interpretation: $('interpretation'),
  resultModifierImpact: $('resultModifierImpact'),
  nomogramModifierImpact: $('nomogramModifierImpact'),
  calculatorGrid: $('calculatorGrid'),
  resultsCard: $('resultsCard'),
  nomogramCard: $('nomogramCard'),
  details: $('details'),
  evidencePanel: $('evidencePanel'),
  conditionGuidanceTitle: $('conditionGuidanceTitle'),
  conditionGuidanceContent: $('conditionGuidanceContent'),
  actionMessage: $('actionMessage'),
  nomogramPositive: $<HTMLCanvasElement>('nomogramPositive'),
  nomogramNegative: $<HTMLCanvasElement>('nomogramNegative'),
  nomogramSizeToggle: $<HTMLInputElement>('nomogramSizeToggle'),
  diagnosticChainSelect: $<HTMLSelectElement>('diagnosticChainSelect'),
  diagnosticChainsPanel: $('diagnosticChainsPanel'),
  drawer: $('adminDrawer'),
  drawerBackdrop: $('drawerBackdrop'),
  drawerOpenButton: $('drawerOpenButton'),
  drawerCloseButton: $('drawerCloseButton'),
  customDataSummary: $('customDataSummary'),
  adminSettingSelect: $<HTMLSelectElement>('adminSettingSelect'),
  adminConditionSelect: $<HTMLSelectElement>('adminConditionSelect'),
  adminTestSelect: $<HTMLSelectElement>('adminTestSelect'),
  adminProfileSelect: $<HTMLSelectElement>('adminProfileSelect'),
  catalogSearchInput: $<HTMLInputElement>('catalogSearchInput'),
  catalogDomainFilter: $<HTMLSelectElement>('catalogDomainFilter'),
  catalogConditionFilter: $<HTMLSelectElement>('catalogConditionFilter'),
  catalogSettingFilter: $<HTMLSelectElement>('catalogSettingFilter'),
  catalogTestFilter: $<HTMLSelectElement>('catalogTestFilter'),
  catalogStatusFilter: $<HTMLSelectElement>('catalogStatusFilter'),
  catalogReviewFilter: $<HTMLSelectElement>('catalogReviewFilter'),
  catalogQualityFilter: $<HTMLSelectElement>('catalogQualityFilter'),
  catalogCompletenessFilter: $<HTMLSelectElement>('catalogCompletenessFilter'),
  catalogSortSelect: $<HTMLSelectElement>('catalogSortSelect'),
  catalogFullscreenButton: $<HTMLButtonElement>('catalogFullscreenButton'),
  markCatalogNeedsReviewButton: $<HTMLButtonElement>('markCatalogNeedsReviewButton'),
  markCatalogReviewedButton: $<HTMLButtonElement>('markCatalogReviewedButton'),
  catalogTableBody: $('catalogTableBody'),
  catalogDetailPanel: $('catalogDetailPanel'),
  adminOverview: $('adminOverview'),
  profileTestSelect: $<HTMLSelectElement>('profileTestSelect'),
  modifierConditionSelect: $<HTMLSelectElement>('modifierConditionSelect')
};

const physicalControls = {
  systemSelect: $<HTMLSelectElement>('physicalSystemSelect'),
  conditionSelect: $<HTMLSelectElement>('physicalConditionSelect'),
  findingSelect: $<HTMLSelectElement>('physicalFindingSelect'),
  findingHint: $('physicalFindingHint'),
  pretestRange: $<HTMLInputElement>('physicalPretestRange'),
  pretestNumber: $<HTMLInputElement>('physicalPretestNumber'),
  pretestHint: $('physicalPretestHint'),
  lrPositive: $('physicalLrPositive'),
  lrNegative: $('physicalLrNegative'),
  pretestValue: $('physicalPretestValue'),
  postPositiveValue: $('physicalPostPositiveValue'),
  postNegativeValue: $('physicalPostNegativeValue'),
  pretestBar: $('physicalPretestBar'),
  postPositiveBar: $('physicalPostPositiveBar'),
  postNegativeBar: $('physicalPostNegativeBar'),
  interpretation: $('physicalInterpretation'),
  nomogramPositive: $<HTMLCanvasElement>('physicalNomogramPositive'),
  nomogramNegative: $<HTMLCanvasElement>('physicalNomogramNegative'),
  details: $('physicalDetails'),
  actionMessage: $('physicalActionMessage')
};

function allTests(): DiagnosticTest[] {
  return [...curatedTests, ...state.customTests];
}

function allProfiles(): EvidenceProfile[] {
  return [...curatedTests.flatMap(test => test.evidenceProfiles), ...state.customEvidenceProfiles];
}

function profilesForTest(testId: string): EvidenceProfile[] {
  return allProfiles().filter(profile => profile.testId === testId);
}

function testMatchesCondition(test: DiagnosticTest, conditionId: string): boolean {
  return conditionIdForTest(test) === conditionId;
}

function preferredTestForCondition(conditionId: string): DiagnosticTest | undefined {
  const tests = allTests();
  const preferredId = DEFAULT_TEST_BY_CONDITION[conditionId];
  return (
    tests.find(test => test.id === preferredId && testMatchesCondition(test, conditionId)) ??
    tests.find(test => testMatchesCondition(test, conditionId))
  );
}

function selectDefaultTestForCondition(conditionId: string): void {
  const preferredTest = preferredTestForCondition(conditionId);
  if (!preferredTest) return;
  state.selectedTestId = preferredTest.id;
  const profiles = profilesForTest(preferredTest.id);
  state.selectedEvidenceProfileId = profiles.find(profile => profile.isDefault)?.id ?? profiles[0]?.id ?? state.selectedEvidenceProfileId;
}

function allAssumptions(): PretestAssumption[] {
  return [...curatedAssumptions, ...state.customAssumptions];
}

function allModifiers(): ClinicalModifier[] {
  return [...curatedModifiers, ...state.customModifiers];
}

function modifiersForCondition(conditionId: string): ClinicalModifier[] {
  return allModifiers().filter(modifier => modifier.conditionId === conditionId);
}

function selectedModifiers(): ClinicalModifier[] {
  const availableIds = new Set(modifiersForCondition(state.selectedConditionId).map(modifier => modifier.id));
  state.selectedModifierIds = state.selectedModifierIds.filter(id => availableIds.has(id));
  return modifiersForCondition(state.selectedConditionId).filter(modifier => state.selectedModifierIds.includes(modifier.id));
}

function conditionIdForLabel(condition: string): string {
  return clinicalConditions.find(candidate => candidate.label === condition)?.id ?? clinicalIdFromLabel(condition);
}

function settingIdForLabel(setting: string): string {
  const normalized = setting.toLowerCase();
  if (normalized.includes('hausarzt')) return 'hausarztpraxis';
  if (normalized.includes('notaufnahme')) return 'klinik-notaufnahme';
  if (normalized.includes('kardiologie')) return 'ambulant-kardiologie';
  if (normalized.includes('endokrinologie')) return 'ambulant-endokrinologie';
  if (normalized.includes('diabetologie')) return 'ambulant-diabetologie';
  if (normalized.includes('nephrologie') || normalized.includes('hypertonie')) return 'ambulant-nephrologie';
  return clinicalIdFromLabel(setting || 'eigene-praxis');
}

function normalizeAssumption(assumption: PretestAssumption): PretestAssumption {
  return {
    ...assumption,
    conditionId: assumption.conditionId ?? conditionIdForLabel(assumption.condition),
    settingId: assumption.settingId ?? settingIdForLabel(assumption.setting),
    evidenceLevel: assumption.evidenceLevel ?? 'direct'
  };
}

function normalizedAssumptions(): PretestAssumption[] {
  return allAssumptions().map(normalizeAssumption);
}

function allSettings(): ClinicalSetting[] {
  const settings = new Map<string, ClinicalSetting>();
  clinicalSettings.forEach(setting => settings.set(setting.id, setting));
  normalizedAssumptions()
    .filter(assumption => assumption.settingId !== 'general')
    .forEach(assumption => {
      settings.set(assumption.settingId ?? settingIdForLabel(assumption.setting), {
        id: assumption.settingId ?? settingIdForLabel(assumption.setting),
        label: assumption.setting
      });
    });
  return [...settings.values()];
}

function allConditions(): ClinicalCondition[] {
  return mergeConditions(clinicalConditions, allTests(), normalizedAssumptions());
}

function getSelectedCondition(): ClinicalCondition {
  return allConditions().find(condition => condition.id === state.selectedConditionId) ?? allConditions()[0];
}

function getSelectedSetting(): ClinicalSetting {
  return allSettings().find(setting => setting.id === state.selectedSettingId) ?? allSettings()[0];
}

function getSelectedTest(): DiagnosticTest {
  return allTests().find(test => test.id === state.selectedTestId) ?? curatedTests[0];
}

function getSelectedProfile(): EvidenceProfile {
  const profiles = profilesForTest(getSelectedTest().id);
  return profiles.find(profile => profile.id === state.selectedEvidenceProfileId) ?? profiles.find(profile => profile.isDefault) ?? profiles[0];
}

interface PretestResolution {
  assumption: PretestAssumption;
  probability: number;
  status: 'direct' | 'fallback' | 'manual';
  title: string;
  message: string;
}

function resolvePretestAssumption(): PretestResolution {
  const assumptions = normalizedAssumptions();
  const direct = assumptions.find(
    assumption =>
      assumption.conditionId === state.selectedConditionId &&
      assumption.settingId === state.selectedSettingId &&
      assumption.evidenceLevel === 'direct'
  );
  if (direct) {
    state.selectedAssumptionId = direct.id;
    return {
      assumption: direct,
      probability: direct.probability,
      status: 'direct',
      title: 'Direkte Setting-Daten verwendet',
      message: `Für ${getSelectedCondition().label} im Setting ${getSelectedSetting().label} ist eine kuratierte Prätest-Annahme hinterlegt.`
    };
  }

  const fallback = assumptions.find(
    assumption => assumption.conditionId === state.selectedConditionId && assumption.evidenceLevel === 'fallback'
  ) ?? assumptions.find(assumption => assumption.evidenceLevel === 'fallback');
  const selectedFallback = fallback ?? assumptions[0];
  state.selectedAssumptionId = selectedFallback.id;
  return {
    assumption: selectedFallback,
    probability: selectedFallback.probability,
    status: 'fallback',
    title: 'Allgemeine Erkrankungsannahme verwendet',
    message: `Für ${getSelectedCondition().label} im Setting ${getSelectedSetting().label} liegt keine spezifische Prätest-Annahme vor. Es wird eine allgemeine Erkrankungsannahme genutzt.`
  };
}

function selectedTestMatchesCondition(test: DiagnosticTest): boolean {
  return conditionIdForTest(test) === state.selectedConditionId;
}

function directionLabel(direction: ClinicalModifierDirection): string {
  if (direction === 'increases') return 'erhöht';
  if (direction === 'decreases') return 'senkt';
  return 'unklar';
}

function modifierPreviewProbability(baseProbability: number, modifiers: ClinicalModifier[]): number | null {
  const quantified = modifiers.filter(modifier => modifier.likelihoodRatio != null || modifier.probabilityFactor != null);
  if (quantified.length === 0) return null;
  return quantified.reduce((probability, modifier) => {
    if (modifier.likelihoodRatio != null) {
      return calculateResult(
        {
          id: 'modifier-preview',
          testId: 'modifier-preview',
          label: 'Modifier preview',
          kind: 'custom',
          method: 'Modifier preview',
          cutoff: 'Modifier preview',
          sensitivity: null,
          specificity: null,
          lrPositive: modifier.likelihoodRatio,
          lrNegative: modifier.likelihoodRatio,
          population: 'Modifier preview',
          rationale: 'Modifier preview',
          limitations: 'Modifier preview',
          sources: [],
          lastReviewed: new Date().toISOString().slice(0, 10),
          ...localReviewMetadata('unclear', 'minimal')
        },
        probability
      ).postPositiveProbability;
    }
    return clampProbabilityPercent(probability * 100 * (modifier.probabilityFactor ?? 1)) / 100;
  }, baseProbability);
}

type ModifierImpactDirection = 'higher' | 'lower' | 'mixed' | 'uncertain' | 'none';

interface ModifierImpact {
  direction: ModifierImpactDirection;
  text: string;
  previewResult: CalculationResult | null;
}

function modifierImpact(profile: EvidenceProfile, result: CalculationResult): ModifierImpact {
  const modifiers = selectedModifiers();
  if (modifiers.length === 0) {
    return {
      direction: 'none',
      text: '',
      previewResult: null
    };
  }

  const previewProbability = modifierPreviewProbability(result.pretestProbability, modifiers);
  const previewResult = previewProbability == null ? null : calculateResult(profile, previewProbability);
  if (previewResult) {
    const delta = previewResult.pretestProbability - result.pretestProbability;
    const direction: ModifierImpactDirection = Math.abs(delta) < 0.001 ? 'uncertain' : delta > 0 ? 'higher' : 'lower';
    return {
      direction,
      previewResult,
      text: `Klinische Modifikatoren ${direction === 'higher' ? 'erhöhen' : direction === 'lower' ? 'senken' : 'verändern'} die Prätestwahrscheinlichkeit in der quantifizierten Vorschau auf ${formatPercent(previewResult.pretestProbability)}. Daraus ergäben sich Posttestwerte von ${formatPercent(previewResult.postPositiveProbability)} nach positivem und ${formatPercent(previewResult.postNegativeProbability)} nach negativem Ergebnis.`
    };
  }

  const increases = modifiers.some(modifier => modifier.direction === 'increases');
  const decreases = modifiers.some(modifier => modifier.direction === 'decreases');
  const uncertain = modifiers.some(modifier => modifier.direction === 'uncertain');
  const direction: ModifierImpactDirection =
    increases && decreases ? 'mixed' : increases ? 'higher' : decreases ? 'lower' : uncertain ? 'uncertain' : 'none';
  const directionText =
    direction === 'higher'
      ? 'eher höher'
      : direction === 'lower'
        ? 'eher niedriger'
        : direction === 'mixed'
          ? 'je nach Gewichtung höher oder niedriger'
          : 'nicht eindeutig verändert';
  return {
    direction,
    previewResult: null,
    text: `Ausgewählte klinische Modifikatoren sind nicht quantifiziert. Die Rechnung bleibt unverändert; die tatsächlichen Posttestwahrscheinlichkeiten liegen klinisch ${directionText}, weil die Prätestwahrscheinlichkeit dadurch beeinflusst wird.`
  };
}

function snapPretestPercent(percent: number, suggestedPercent = resolvePretestAssumption().probability * 100): number {
  const clamped = clampProbabilityPercent(percent);
  return Math.abs(clamped - suggestedPercent) <= 1 ? clampProbabilityPercent(suggestedPercent) : clamped;
}

function parsePretestPercentInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || normalized === '.' || normalized === '-') return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPretestPercentInput(percent: number): string {
  return clampProbabilityPercent(percent).toFixed(1).replace('.', ',');
}

function commitPretestNumberInput(options: { snap: boolean; render: boolean }): void {
  const parsed = parsePretestPercentInput(controls.pretestNumber.value);
  if (parsed == null) {
    controls.pretestNumber.value = formatPretestPercentInput(state.manualPretestPercent);
    return;
  }
  state.manualPretestPercent = options.snap ? snapPretestPercent(parsed) : clampProbabilityPercent(parsed);
  if (options.render) {
    saveAndRender();
  }
}

function useSuggestedPretest(): void {
  state.manualPretestPercent = clampProbabilityPercent(resolvePretestAssumption().probability * 100);
  saveAndRender();
}

function setMessage(element: HTMLElement, message: string, isError = false): void {
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.classList.remove('hidden');
}

function clearMessage(element: HTMLElement): void {
  element.textContent = '';
  element.classList.add('hidden');
}

function sourceFromForm(prefix: string, kind: SourceKind): EvidenceSource {
  return {
    title: $<HTMLInputElement>(`${prefix}SourceTitle`).value.trim(),
    year: Number.parseInt($<HTMLInputElement>(`${prefix}SourceYear`).value, 10),
    url: $<HTMLInputElement>(`${prefix}SourceUrl`).value.trim(),
    kind,
    note: $<HTMLTextAreaElement>(`${prefix}SourceNote`).value.trim()
  };
}

function localReviewMetadata(
  evidenceQuality: EvidenceQuality = 'expert-opinion',
  dataCompleteness: DataCompleteness = 'partial',
  reviewStatus: ReviewStatus = 'draft'
): ReviewMetadata {
  return {
    reviewStatus,
    evidenceQuality,
    dataCompleteness,
    reviewNote: 'Lokaler Vorschlag; vor Übernahme in die kuratierten Daten fachlich prüfen.'
  };
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function saveAndRender(): void {
  saveState(state);
  render();
}

function populateSelect(select: HTMLSelectElement, options: { value: string; label: string }[], selected: string): void {
  select.textContent = '';
  options.forEach(optionData => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.append(option);
  });
  select.value = selected;
}

function conditionGroupLabel(condition: ClinicalCondition): 'Endokrinologie' | 'Internistisch' {
  return ['herzinsuffizienz', 'zoliakie', 'tiefe-venenthrombose', 'lungenembolie'].includes(condition.id) ? 'Internistisch' : 'Endokrinologie';
}

function populateConditionSelect(select: HTMLSelectElement, conditions: ClinicalCondition[], selected: string): void {
  select.textContent = '';
  (['Endokrinologie', 'Internistisch'] as const).forEach(groupLabel => {
    const groupConditions = conditions
      .filter(condition => conditionGroupLabel(condition) === groupLabel)
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
    if (!groupConditions.length) return;
    const group = document.createElement('optgroup');
    group.label = groupLabel;
    groupConditions.forEach(condition => {
      const option = document.createElement('option');
      option.value = condition.id;
      option.textContent = condition.label;
      group.append(option);
    });
    select.append(group);
  });
  select.value = selected;
}

function orderedTestsForCondition(conditionId: string): DiagnosticTest[] {
  const preferredId = DEFAULT_TEST_BY_CONDITION[conditionId];
  return [...allTests()].sort((a, b) => {
    const aPreferred = a.id === preferredId ? 0 : 1;
    const bPreferred = b.id === preferredId ? 0 : 1;
    const aMatch = testMatchesCondition(a, conditionId) ? 0 : 1;
    const bMatch = testMatchesCondition(b, conditionId) ? 0 : 1;
    return aPreferred - bPreferred || aMatch - bMatch || a.name.localeCompare(b.name, 'de');
  });
}

function populateSelectors(): void {
  const selectedCondition = getSelectedCondition();
  const selectedTest = getSelectedTest();
  const profiles = profilesForTest(selectedTest.id);
  const selectedProfile = getSelectedProfile();
  const orderedTests = orderedTestsForCondition(selectedCondition.id);

  populateSelect(
    controls.settingSelect,
    allSettings().map(setting => ({ value: setting.id, label: setting.label })),
    getSelectedSetting().id
  );
  populateConditionSelect(controls.conditionSelect, allConditions(), selectedCondition.id);

  populateSelect(
    controls.testSelect,
    orderedTests.map(test => ({
      value: test.id,
      label: `${test.id === DEFAULT_TEST_BY_CONDITION[selectedCondition.id] ? 'Standard: ' : ''}${selectedTestMatchesCondition(test) ? '' : 'Nicht passend: '}${test.custom ? 'Eigener Test: ' : ''}${test.name}`
    })),
    selectedTest.id
  );
  populateSelect(
    controls.profileSelect,
    profiles.map(profile => ({
      value: profile.id,
      label: `${profile.kind === 'scenario' ? 'Szenario: ' : profile.kind === 'custom' ? 'Eigenes Profil: ' : ''}${profile.label}`
    })),
    selectedProfile.id
  );
  populateSelect(
    controls.profileTestSelect,
    allTests().map(test => ({ value: test.id, label: test.name })),
    selectedTest.id
  );
  populateSelect(
    controls.modifierConditionSelect,
    allConditions().map(condition => ({ value: condition.id, label: condition.label })),
    selectedCondition.id
  );
  populateSelect(
    controls.diagnosticChainSelect,
    diagnosticChains.map(chain => ({ value: chain.id, label: chain.label })),
    state.selectedDiagnosticChainId ?? diagnosticChains[0]?.id ?? ''
  );
  controls.profileHint.textContent =
    profiles.length > 1
      ? `${profiles.length} Profile verfügbar. Passend zu Population/Cut-off wählen.`
      : '1 Profil verfügbar.';
}

function populateAdminSelectors(): void {
  const selectedCondition = getSelectedCondition();
  const selectedTest = getSelectedTest();
  const profiles = profilesForTest(selectedTest.id);
  const selectedProfile = getSelectedProfile();
  const orderedTests = orderedTestsForCondition(selectedCondition.id);
  populateSelect(
    controls.adminSettingSelect,
    allSettings().map(setting => ({ value: setting.id, label: setting.label })),
    getSelectedSetting().id
  );
  populateConditionSelect(controls.adminConditionSelect, allConditions(), selectedCondition.id);
  populateSelect(
    controls.adminTestSelect,
    orderedTests.map(test => ({
      value: test.id,
      label: `${test.id === DEFAULT_TEST_BY_CONDITION[selectedCondition.id] ? 'Standard: ' : ''}${selectedTestMatchesCondition(test) ? '' : 'Nicht passend: '}${test.name}`
    })),
    selectedTest.id
  );
  populateSelect(
    controls.adminProfileSelect,
    profiles.map(profile => ({
      value: profile.id,
      label: `${profile.kind === 'scenario' ? 'Szenario: ' : profile.kind === 'custom' ? 'Eigenes Profil: ' : ''}${profile.label}`
    })),
    selectedProfile.id
  );
  populateSelect(
    controls.catalogConditionFilter,
    [
      { value: 'all', label: 'Alle Erkrankungen' },
      ...allConditions().map(condition => ({ value: condition.id, label: condition.label })),
      ...physicalConditions.map(condition => ({ value: condition.id, label: `Körperlich: ${condition.label}` }))
    ],
    controls.catalogConditionFilter.value || 'all'
  );
  populateSelect(
    controls.catalogSettingFilter,
    [{ value: 'all', label: 'Alle Settings' }, ...allSettings().map(setting => ({ value: setting.id, label: setting.label }))],
    controls.catalogSettingFilter.value || 'all'
  );
  populateSelect(
    controls.catalogTestFilter,
    [
      { value: 'all', label: 'Alle Tests und Befunde' },
      ...allTests().map(test => ({ value: test.id, label: test.name })),
      ...physicalFindings.map(finding => ({ value: finding.id, label: `Befund: ${finding.findingLabel}` }))
    ],
    controls.catalogTestFilter.value || 'all'
  );
  if (!catalogFiltersLoaded) {
    loadCatalogFilters();
    catalogFiltersLoaded = true;
  }
}

function loadCatalogFilters(): void {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CATALOG_FILTER_KEY) ?? '{}') as Record<string, string>;
    controls.catalogSearchInput.value = parsed.search ?? controls.catalogSearchInput.value;
    controls.catalogDomainFilter.value = parsed.domain ?? controls.catalogDomainFilter.value;
    controls.catalogConditionFilter.value = parsed.conditionId ?? controls.catalogConditionFilter.value;
    controls.catalogSettingFilter.value = parsed.settingId ?? controls.catalogSettingFilter.value;
    controls.catalogTestFilter.value = parsed.testId ?? controls.catalogTestFilter.value;
    controls.catalogStatusFilter.value = parsed.status ?? controls.catalogStatusFilter.value;
    controls.catalogReviewFilter.value = parsed.reviewStatus ?? controls.catalogReviewFilter.value;
    controls.catalogQualityFilter.value = parsed.evidenceQuality ?? controls.catalogQualityFilter.value;
    controls.catalogCompletenessFilter.value = parsed.dataCompleteness ?? controls.catalogCompletenessFilter.value;
    controls.catalogSortSelect.value = parsed.sortBy ?? controls.catalogSortSelect.value;
  } catch {
    window.localStorage.removeItem(CATALOG_FILTER_KEY);
  }
}

function saveCatalogFilters(): void {
  window.localStorage.setItem(CATALOG_FILTER_KEY, JSON.stringify({
    search: controls.catalogSearchInput.value,
    domain: controls.catalogDomainFilter.value,
    conditionId: controls.catalogConditionFilter.value,
    settingId: controls.catalogSettingFilter.value,
    testId: controls.catalogTestFilter.value,
    status: controls.catalogStatusFilter.value,
    reviewStatus: controls.catalogReviewFilter.value,
    evidenceQuality: controls.catalogQualityFilter.value,
    dataCompleteness: controls.catalogCompletenessFilter.value,
    sortBy: controls.catalogSortSelect.value
  }));
}

function setBar(element: HTMLElement, probability: number): void {
  element.style.width = `${clamp(probability * 100, 0, 100).toFixed(1)}%`;
}

function renderScenarioBanner(profile: EvidenceProfile): void {
  if (profile.kind !== 'scenario') {
    controls.scenarioBanner.classList.add('hidden');
    controls.scenarioBanner.textContent = '';
    return;
  }
  const sourceProfile = profile.deviationFromProfileId
    ? allProfiles().find(candidate => candidate.id === profile.deviationFromProfileId)
    : null;
  controls.scenarioBanner.textContent = `Eigene Abweichung${sourceProfile ? ` von „${sourceProfile.label}“` : ''}. Grund: ${profile.deviationReason ?? 'nicht angegeben'}`;
  controls.scenarioBanner.classList.remove('hidden');
}

function renderMismatchWarning(test: DiagnosticTest): void {
  if (selectedTestMatchesCondition(test)) {
    controls.mismatchWarning.classList.add('hidden');
    controls.mismatchWarning.textContent = '';
    return;
  }
  const selectedCondition = getSelectedCondition();
  controls.mismatchWarning.textContent = `⚠ Test passt nicht zur gewählten Erkrankung: hinterlegt für „${test.condition}“, berechnet für „${selectedCondition.label}“.`;
  controls.mismatchWarning.classList.remove('hidden');
}

function renderPretestStatus(resolution: PretestResolution): void {
  controls.pretestStatus.className = `pretest-status ${resolution.status}`;
  const source = resolution.assumption.sources[0];
  const selectedCondition = getSelectedCondition().label;
  const selectedSetting = getSelectedSetting().label;
  const statusLabel =
    resolution.status === 'direct'
      ? 'Setting-Daten'
      : resolution.status === 'fallback'
        ? 'Allgemeine Annahme'
        : 'Manuell';
  const statusIcon = resolution.status === 'direct' ? '✓' : resolution.status === 'fallback' ? '!' : '';
  const statusMessage =
    resolution.status === 'direct'
      ? `Für ${selectedCondition} im Setting ${selectedSetting} ist eine kuratierte Annahme hinterlegt.`
      : resolution.status === 'fallback'
        ? `Keine spezifischen Setting-Daten für ${selectedCondition} im Setting ${selectedSetting}; allgemeine Annahme genutzt.`
        : resolution.message;
  controls.pretestStatus.textContent = `${statusIcon ? `${statusIcon} ` : ''}${statusLabel}: ${formatPercent(resolution.probability)}. ${statusMessage}${source ? ` Quelle: ${source.title} (${source.year}).` : ''}`;
  const suggestedPercent = clampProbabilityPercent(resolution.probability * 100);
  const markerLeft = ((suggestedPercent - 0.1) / (99.9 - 0.1)) * 100;
  const suggestionContext = resolution.status === 'direct' ? 'Setting' : resolution.status === 'fallback' ? 'allgemein' : 'manuell';
  controls.pretestRangeWrap.style.setProperty('--pretest-suggestion-left', `${markerLeft}%`);
  controls.pretestSuggestionMarker.title = `Vorschlag übernehmen: ${suggestedPercent.toFixed(1).replace('.', ',')} %`;
  controls.pretestSuggestionMarker.setAttribute('aria-label', `Vorgeschlagene Prätestwahrscheinlichkeit ${suggestedPercent.toFixed(1).replace('.', ',')} Prozent übernehmen`);
  controls.pretestSuggestionMarker.textContent = `Vorschlag ${formatPercent(resolution.probability)} (${suggestionContext})`;
  controls.pretestSuggestionHint.textContent = '';
}

function renderModifierSelector(result: CalculationResult): void {
  const modifiers = modifiersForCondition(state.selectedConditionId);
  const visibleModifiers = state.modifierListExpanded ? modifiers : modifiers.slice(0, 6);
  const selected = selectedModifiers();
  controls.modifierOptions.textContent = '';
  if (modifiers.length === 0) {
    controls.modifierOptions.textContent = 'Für diese Erkrankung sind noch keine klinischen Modifikatoren hinterlegt.';
    controls.modifierSummary.textContent = '';
    controls.toggleModifierListButton.classList.add('hidden');
    controls.applyModifiedPretestButton.classList.add('hidden');
    return;
  }

  visibleModifiers.forEach(modifier => {
    const label = document.createElement('label');
    label.className = `modifier-option ${modifier.direction}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = modifier.id;
    input.checked = state.selectedModifierIds.includes(modifier.id);
    const text = document.createElement('span');
    text.textContent = `${modifier.label} (${directionLabel(modifier.direction)})`;
    label.append(input, text);
    controls.modifierOptions.append(label);
  });

  controls.toggleModifierListButton.classList.toggle('hidden', modifiers.length <= 6);
  controls.toggleModifierListButton.textContent = state.modifierListExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen';

  const preview = modifierPreviewProbability(result.pretestProbability, selected);
  const qualitative = selected.filter(modifier => modifier.likelihoodRatio == null && modifier.probabilityFactor == null);
  const directions = selected.map(modifier => `${modifier.label}: ${directionLabel(modifier.direction)}`).join('; ');
  if (selected.length === 0) {
    controls.modifierSummary.textContent = 'Keine Modifikatoren ausgewählt. Die Prätestwahrscheinlichkeit bleibt eine klinische Einschätzung.';
  } else if (preview != null) {
    controls.modifierSummary.textContent = `Ausgewählt: ${directions}. Quantifizierte Vorschau: ${formatPercent(preview)}. Qualitative Modifikatoren werden zusätzlich nur als Hinweis gewertet.`;
  } else {
    const higher = selected.some(modifier => modifier.direction === 'increases');
    const lower = selected.some(modifier => modifier.direction === 'decreases');
    const directionText = higher && lower ? 'höher oder niedriger' : higher ? 'höher' : lower ? 'niedriger' : 'anders';
    controls.modifierSummary.textContent = `Ausgewählt: ${directions}. Die Rechnung bleibt unverändert; klinisch kann die wahre Posttestwahrscheinlichkeit ${directionText} liegen.`;
  }
  controls.applyModifiedPretestButton.classList.toggle('hidden', preview == null);
  if (preview != null) {
    controls.applyModifiedPretestButton.textContent = `Modifizierte Prätestwahrscheinlichkeit ${formatPercent(preview)} übernehmen`;
  }
  if (qualitative.length > 0 && preview != null) {
    controls.modifierSummary.textContent += ` Nicht quantifiziert: ${qualitative.map(modifier => modifier.label).join(', ')}.`;
  }
}

function renderModifierImpact(profile: EvidenceProfile, result: CalculationResult): ModifierImpact {
  const impact = modifierImpact(profile, result);
  [controls.resultModifierImpact, controls.nomogramModifierImpact].forEach(element => {
    element.className = `modifier-impact ${impact.direction}`;
    element.textContent = '';
    if (impact.direction === 'none') {
      element.classList.add('hidden');
      return;
    }
    const arrow = document.createElement('span');
    arrow.className = 'modifier-impact-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = impact.direction === 'higher' ? '↑' : impact.direction === 'lower' ? '↓' : '↕';
    const text = document.createElement('span');
    text.textContent = impact.text;
    element.append(arrow, text);
  });
  return impact;
}

function detailRow(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'detail-row';
  const labelElement = document.createElement('strong');
  labelElement.className = 'detail-label';
  const valueElement = document.createElement('span');
  valueElement.className = 'detail-value';
  labelElement.textContent = label;
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  return row;
}

function renderDetails(test: DiagnosticTest, profile: EvidenceProfile, assumption: PretestAssumption, result: CalculationResult, pretestResolution: PretestResolution): void {
  const selectedCondition = getSelectedCondition();
  const selectedSetting = getSelectedSetting();
  const modifiers = selectedModifiers();
  const rows = [
    ['Setting', selectedSetting.label],
    ['Geprüfte Erkrankung', selectedCondition.label],
    ['Prätest-Status', pretestResolution.title],
    ['Prätest-Begründung', assumption.rationale],
    ['Test', test.name],
    ['Evidenzprofil', profile.label],
    ['Typ', profile.kind === 'scenario' ? 'Szenario' : profile.kind === 'custom' ? 'Eigenes Profil' : 'Kuratierte Quelle'],
    ['Test-Erkrankung', test.condition],
    ['Krankheitsbild-Match', selectedTestMatchesCondition(test) ? 'Ja' : 'Nein, Kontext-Mismatch'],
    ['Methode', profile.method],
    ['Zweck', profile.purpose ?? 'Nicht separat hinterlegt'],
    ['Material', profile.specimen ?? 'Nicht separat hinterlegt'],
    ['Kurz-Durchführung', profile.procedure ?? 'Nach lokalem Laborprotokoll durchführen.'],
    ['Cut-off', profile.cutoff],
    ['Präanalytik', joinedList(profile.preanalytics)],
    ['Interferenzen', joinedList(profile.medicationInterferences)],
    ['Falsch positiv', joinedList(profile.falsePositiveReasons)],
    ['Falsch negativ', joinedList(profile.falseNegativeReasons)],
    ['Interpretation', joinedList(profile.interpretationCautions)],
    ['Sensitivität', formatPercent(profile.sensitivity)],
    ['Spezifität', formatPercent(profile.specificity)],
    ['PPV', formatPercent(result.ppv)],
    ['NPV', formatPercent(result.npv)],
    ['Prätest-Setting', assumption.setting],
    ['Aktuell verwendete Prätestwahrscheinlichkeit', formatPercent(result.pretestProbability)],
    ['Vorgeschlagene Prätestwahrscheinlichkeit', formatPercent(pretestResolution.probability)],
    ['Klinische Modifikatoren', modifiers.length > 0 ? modifiers.map(modifier => `${modifier.label} (${directionLabel(modifier.direction)})`).join('; ') : 'Keine ausgewählt'],
    ['Letzte Prüfung', profile.lastReviewed]
  ];
  controls.details.textContent = '';
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'detail-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'detail-value';
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    controls.details.append(row);
  });
}

function renderSources(title: string, item: EvidenceProfile | PretestAssumption): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = title;
  const meta = document.createElement('p');
  meta.className = 'muted';
  meta.textContent = `Population: ${item.population}`;
  const rationale = document.createElement('p');
  rationale.textContent = `Begründung: ${item.rationale}`;
  const limitations = document.createElement('p');
  limitations.textContent = `Grenzen: ${item.limitations}`;
  const structuredNotes = 'preanalytics' in item ? profileStructuredNotes(item) : '';
  const notes = document.createElement('p');
  notes.className = 'muted';
  notes.textContent = structuredNotes ? `Praktische Hinweise: ${structuredNotes}` : '';
  const list = document.createElement('ul');
  list.className = 'source-list';
  item.sources.forEach(source => {
    const sourceItem = document.createElement('li');
    sourceItem.className = 'source-item';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = source.kind;
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.title} (${source.year})`;
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = source.note;
    sourceItem.append(badge, link, note);
    list.append(sourceItem);
  });
  section.append(heading, meta, rationale, limitations);
  if (structuredNotes) section.append(notes);
  section.append(list);
  return section;
}

function createAdminCard(title: string, badge: string, badgeClass: string, rows: [string, string][], sources: EvidenceSource[] = []): HTMLElement {
  const card = document.createElement('section');
  card.className = 'admin-data-card';
  const headingRow = document.createElement('div');
  headingRow.className = 'admin-data-card-heading';
  const heading = document.createElement('h4');
  heading.textContent = title;
  const badgeEl = document.createElement('span');
  badgeEl.className = `badge ${badgeClass}`;
  badgeEl.textContent = badge;
  headingRow.append(heading, badgeEl);
  const list = document.createElement('dl');
  list.className = 'admin-data-list';
  rows.forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    list.append(term, detail);
  });
  card.append(headingRow, list);
  if (sources.length > 0) {
    const sourceList = document.createElement('ul');
    sourceList.className = 'admin-source-list';
    sources.forEach(source => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${source.title} (${source.year})`;
      const note = document.createElement('span');
      note.textContent = ` - ${source.note}`;
      item.append(link, note);
      sourceList.append(item);
    });
    card.append(sourceList);
  }
  return card;
}

function renderAdminOverview(): void {
  const { test, profile, assumption, pretestResolution, result } = currentCalculation();
  const selectedSetting = getSelectedSetting();
  const selectedCondition = getSelectedCondition();
  controls.adminOverview.textContent = '';
  controls.adminOverview.append(
    createAdminCard(
      'Kontext und Prätest',
      pretestResolution.status === 'direct' ? 'Direktdaten' : pretestResolution.status === 'fallback' ? 'Fallback' : 'Manuell',
      pretestResolution.status === 'direct' ? 'badge-success' : pretestResolution.status === 'fallback' ? 'badge-warning' : 'badge-info',
      [
        ['Setting', selectedSetting.label],
        ['Erkrankung', selectedCondition.label],
        ['Wahrscheinlichkeit', formatPercent(pretestResolution.probability)],
        ['Spanne', assumption.rangeLow != null && assumption.rangeHigh != null ? `${formatPercent(assumption.rangeLow)}-${formatPercent(assumption.rangeHigh)}` : 'Nicht hinterlegt'],
        ['Status', pretestResolution.message]
      ],
      assumption.sources
    ),
    createAdminCard(
      'Prätest-Annahme',
      assumption.custom ? 'Eigene Daten' : 'Kuratierte Daten',
      assumption.custom ? 'badge-warning' : 'badge-info',
      [
        ['Population', assumption.population],
        ['Begründung', assumption.rationale],
        ['Grenzen', assumption.limitations],
        ['Letzte Prüfung', assumption.lastReviewed]
      ],
      assumption.sources
    ),
    createAdminCard(
      'Diagnostischer Test',
      selectedTestMatchesCondition(test) ? 'Passend' : 'Kontext-Warnung',
      selectedTestMatchesCondition(test) ? 'badge-success' : 'badge-danger',
      [
        ['Name', test.name],
        ['Test-Erkrankung', test.condition],
        ['Kategorie', test.category],
        ['Beschreibung', test.description],
        ['Match', selectedTestMatchesCondition(test) ? 'Test passt zur gewählten Erkrankung.' : `Test ist für ${test.condition} hinterlegt, nicht für ${selectedCondition.label}.`]
      ]
    ),
    createAdminCard(
      'Evidenzprofil',
      profile.kind === 'scenario' ? 'Szenario' : profile.kind === 'custom' ? 'Eigenes Profil' : 'Kuratierte Quelle',
      profile.kind === 'curated' ? 'badge-info' : 'badge-warning',
      [
        ['Profil', profile.label],
        ['Methode', profile.method],
        ['Zweck', profile.purpose ?? 'Nicht separat hinterlegt'],
        ['Material', profile.specimen ?? 'Nicht separat hinterlegt'],
        ['Kurz-Durchführung', profile.procedure ?? 'Nach lokalem Laborprotokoll durchführen.'],
        ['Cut-off', profile.cutoff],
        ['Sensitivität / Spezifität', `${formatPercent(profile.sensitivity)} / ${formatPercent(profile.specificity)}`],
        ['LR+ / LR−', `${formatRatio(result.lrPositive)} / ${formatRatio(result.lrNegative)}`],
        ['Population', profile.population],
        ['Begründung', profile.rationale],
        ['Grenzen', profile.limitations],
        ['Präanalytik', joinedList(profile.preanalytics)],
        ['Interferenzen', joinedList(profile.medicationInterferences)],
        ['Falsch positiv', joinedList(profile.falsePositiveReasons)],
        ['Falsch negativ', joinedList(profile.falseNegativeReasons)],
        ['Interpretation', joinedList(profile.interpretationCautions)],
        ['Letzte Prüfung', profile.lastReviewed]
      ],
      profile.sources
    )
  );
}

function sourceSummary(sources: EvidenceSource[]): string {
  return sources.length > 0 ? sources.map(source => `${source.title} (${source.year})`).join('; ') : 'Keine Quelle hinterlegt';
}

function joinedList(values: string[] | undefined, fallback = 'Nicht separat hinterlegt'): string {
  return values && values.length > 0 ? values.join('; ') : fallback;
}

function profileStructuredNotes(profile: EvidenceProfile): string {
  const sections: string[] = [];
  if (profile.preanalytics?.length) sections.push(`Präanalytik: ${joinedList(profile.preanalytics)}`);
  if (profile.medicationInterferences?.length) {
    sections.push(`Medikamentöse/Substanz-Interferenzen: ${joinedList(profile.medicationInterferences)}`);
  }
  if (profile.falsePositiveReasons?.length) sections.push(`Falsch-positive Gründe: ${joinedList(profile.falsePositiveReasons)}`);
  if (profile.falseNegativeReasons?.length) sections.push(`Falsch-negative Gründe: ${joinedList(profile.falseNegativeReasons)}`);
  if (profile.interpretationCautions?.length) {
    sections.push(`Interpretationshinweise: ${joinedList(profile.interpretationCautions)}`);
  }
  if (profile.implementationNotes) sections.push(`Implementierung: ${profile.implementationNotes}`);
  return sections.join(' ');
}

function conditionLabelForId(conditionId: string): string {
  return conditionLabel(conditionId, allConditions());
}

function settingLabelForId(settingId: string | undefined, fallback = 'Alle Settings'): string {
  if (!settingId) return fallback;
  if (settingId === 'general') return 'Allgemeine Erkrankungsannahme';
  return allSettings().find(setting => setting.id === settingId)?.label ?? settingId;
}

function assumptionsForCondition(conditionId: string): PretestAssumption[] {
  return normalizedAssumptions().filter(assumption => assumption.conditionId === conditionId);
}

function modifierSummaryForCondition(conditionId: string): string {
  const modifiers = modifiersForCondition(conditionId);
  if (modifiers.length === 0) return 'Keine hinterlegt';
  return modifiers.map(modifier => `${modifier.label} (${directionLabel(modifier.direction)})`).join('; ');
}

function reviewLabel(value: ReviewStatus): string {
  if (value === 'needs-review') return 'needs-review';
  if (value === 'reviewed') return 'reviewed';
  return 'draft';
}

function qualityLabel(value: EvidenceQuality): string {
  if (value === 'expert-opinion') return 'expert opinion';
  return value;
}

function completenessLabel(value: DataCompleteness): string {
  return value;
}

function textSearchValue(values: unknown[]): string {
  return values
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .filter(value => value != null)
    .map(value => String(value).toLowerCase())
    .join(' ');
}

function catalogMetadataCells(item: ReviewMetadata): string[] {
  return [reviewLabel(item.reviewStatus), qualityLabel(item.evidenceQuality), completenessLabel(item.dataCompleteness)];
}

function catalogRows(): CatalogRow[] {
  const assumptionRows: CatalogRow[] = normalizedAssumptions().map(assumption => {
    const conditionId = assumption.conditionId ?? conditionIdForLabel(assumption.condition);
    const cells = [
      'Prätest-Annahme',
      assumption.condition,
      assumption.setting,
      `${formatPercent(assumption.probability)}${assumption.rangeLow != null && assumption.rangeHigh != null ? ` (${formatPercent(assumption.rangeLow)}-${formatPercent(assumption.rangeHigh)})` : ''}`,
      modifierSummaryForCondition(conditionId),
      '–',
      '–',
      '–',
      '–',
      '–',
      '–',
      '–',
      '–',
      ...catalogMetadataCells(assumption),
      sourceSummary(assumption.sources),
      `${assumption.rationale} Grenzen: ${assumption.limitations}`
    ];
    return {
      key: `assumption:${assumption.id}`,
      kind: 'assumption',
      domain: 'diagnostic-tests',
      id: assumption.id,
      status: assumption.kind,
      reviewStatus: assumption.reviewStatus,
      evidenceQuality: assumption.evidenceQuality,
      dataCompleteness: assumption.dataCompleteness,
      conditionId,
      settingId: assumption.settingId,
      cells,
      searchText: textSearchValue([...cells, assumption.population, assumption.sources.map(source => source.note), assumption.reviewNote]),
      sortValues: {
        condition: assumption.condition,
        setting: assumption.setting,
        test: '',
        lrPositive: null,
        lrNegative: null,
        reviewStatus: assumption.reviewStatus
      },
      detail: {
        title: `Prätest-Annahme: ${assumption.condition} / ${assumption.setting}`,
        sources: sourceSummary(assumption.sources),
        population: assumption.population,
        rationale: assumption.rationale,
        limitations: assumption.limitations,
        reviewNote: assumption.reviewNote
      }
    };
  });
  const modifierRows: CatalogRow[] = allModifiers().map(modifier => {
    const cells = [
      'Klinischer Modifikator',
      conditionLabelForId(modifier.conditionId),
      '–',
      'wirkt auf Prätest',
      `${modifier.label}; ${modifier.category}; Richtung: ${directionLabel(modifier.direction)}; ${modifier.quantificationStatus}${modifier.likelihoodRatio != null ? `; LR ${formatRatio(modifier.likelihoodRatio)}` : ''}${modifier.probabilityFactor != null ? `; Faktor ${formatRatio(modifier.probabilityFactor)}` : ''}`,
      '–',
      '–',
      '–',
      '–',
      '–',
      modifier.likelihoodRatio != null ? formatRatio(modifier.likelihoodRatio) : '–',
      modifier.likelihoodRatio != null ? formatRatio(modifier.likelihoodRatio) : '–',
      '–',
      ...catalogMetadataCells(modifier),
      sourceSummary(modifier.sources),
      `${modifier.rationale}${modifier.overlapWarning ? ` Doppelzählung: ${modifier.overlapWarning}` : ''} Grenzen: ${modifier.limitations}`
    ];
    return {
      key: `modifier:${modifier.id}`,
      kind: 'modifier',
      domain: 'diagnostic-tests',
      id: modifier.id,
      status: modifier.kind,
      reviewStatus: modifier.reviewStatus,
      evidenceQuality: modifier.evidenceQuality,
      dataCompleteness: modifier.dataCompleteness,
      conditionId: modifier.conditionId,
      cells,
      searchText: textSearchValue([...cells, modifier.sources.map(source => source.note), modifier.reviewNote]),
      sortValues: {
        condition: conditionLabelForId(modifier.conditionId),
        setting: '',
        test: '',
        lrPositive: modifier.likelihoodRatio ?? null,
        lrNegative: modifier.likelihoodRatio ?? null,
        reviewStatus: modifier.reviewStatus
      },
      detail: {
        title: `Klinischer Modifikator: ${modifier.label}`,
        sources: sourceSummary(modifier.sources),
        population: conditionLabelForId(modifier.conditionId),
        rationale: `${modifier.rationale}${modifier.overlapWarning ? ` Doppelzählung beachten: ${modifier.overlapWarning}` : ''}`,
        limitations: modifier.limitations,
        reviewNote: modifier.reviewNote
      }
    };
  });
  const profileRows: CatalogRow[] = allProfiles().flatMap(profile => {
    const test = allTests().find(candidate => candidate.id === profile.testId);
    if (!test) return [];
    const conditionId = conditionIdForTest(test);
    const assumptions = assumptionsForCondition(conditionId);
    const assumptionsForRows = assumptions.length > 0 ? assumptions : [undefined];
    return assumptionsForRows.map(assumption => {
      const result = assumption ? calculateResult(profile, assumption.probability) : null;
      const ratios = resolveLikelihoodRatios(profile);
      const cells = [
        'Test / Evidenzprofil',
        test.condition,
        settingLabelForId(assumption?.settingId, 'Keine Prätest-Annahme'),
        assumption ? formatPercent(assumption.probability) : '–',
        modifierSummaryForCondition(conditionId),
        test.name,
        profile.label,
        profile.cutoff,
        formatPercent(profile.sensitivity),
        formatPercent(profile.specificity),
        formatRatio(ratios.lrPositive),
        formatRatio(ratios.lrNegative),
        result ? `${formatPercent(result.ppv)} / ${formatPercent(result.npv)}` : '–',
        ...catalogMetadataCells(profile),
        sourceSummary(profile.sources),
        `Methode: ${profile.method}. Durchführung: ${profile.procedure ?? 'Nach Laborprotokoll.'} Begründung: ${profile.rationale} Grenzen: ${profile.limitations} ${profileStructuredNotes(profile)}`
      ];
      return {
        key: `profile:${profile.id}:${assumption?.settingId ?? 'none'}`,
        kind: 'profile',
        domain: 'diagnostic-tests',
        id: profile.id,
        status: profile.kind,
        reviewStatus: profile.reviewStatus,
        evidenceQuality: profile.evidenceQuality,
        dataCompleteness: profile.dataCompleteness,
        conditionId,
        settingId: assumption?.settingId,
        testId: test.id,
        cells,
        searchText: textSearchValue([
          ...cells,
          test.description,
          profile.population,
          profileStructuredNotes(profile),
          profile.sources.map(source => source.note),
          profile.reviewNote,
          assumption?.population,
          assumption?.rationale
        ]),
        sortValues: {
          condition: test.condition,
          setting: settingLabelForId(assumption?.settingId, ''),
          test: test.name,
          lrPositive: ratios.lrPositive,
          lrNegative: ratios.lrNegative,
          reviewStatus: profile.reviewStatus
        },
        detail: {
          title: `${test.name}: ${profile.label}`,
          sources: sourceSummary(profile.sources),
          population: profile.population,
          rationale: `Test: ${profile.rationale}${assumption ? ` Prätest: ${assumption.rationale}` : ''}`,
          limitations: `${profile.limitations} ${profileStructuredNotes(profile)}${assumption ? ` Prätest-Grenzen: ${assumption.limitations}` : ''}`,
          reviewNote: profile.reviewNote
        }
      };
    });
  });
  const physicalRows: CatalogRow[] = physicalFindings.map(finding => {
    const condition = physicalConditions.find(candidate => candidate.id === finding.conditionId);
    const system = physicalSystems.find(candidate => candidate.id === finding.systemId);
    const midpointPretest = clampProbabilityPercent((finding.pretestRange.low + finding.pretestRange.high) / 2) / 100;
    const result = calculateResult(physicalProfileFromFinding(finding), midpointPretest);
    const source = `${finding.source.title}; ${finding.source.sourceBox}; S. ${finding.source.sourcePage}`;
    const cells = [
      'Körperlicher Befund',
      condition?.label ?? finding.conditionId,
      system?.label ?? finding.systemId,
      `McGee: ${formatPhysicalPretestRange(finding)}`,
      '–',
      finding.findingLabel,
      'McGee-Faktenzeile',
      finding.positiveCriterion,
      '–',
      '–',
      formatPhysicalLr(finding.lrPositive),
      formatPhysicalLr(finding.lrNegative),
      `${formatPercent(result.ppv)} / ${formatPercent(result.npv)} bei Bereichsmitte`,
      reviewLabel(finding.reviewStatus),
      'moderate',
      'partial',
      source,
      `${finding.limitations} Originalbezeichnung: ${finding.originalFindingLabel}. ${finding.reviewNote ?? ''}`
    ];
    return {
      key: `physical-finding:${finding.id}`,
      kind: 'physical-finding',
      domain: 'physical-exam',
      id: finding.id,
      status: 'curated',
      reviewStatus: finding.reviewStatus,
      evidenceQuality: 'moderate',
      dataCompleteness: 'partial',
      conditionId: finding.conditionId,
      settingId: finding.systemId,
      testId: finding.id,
      cells,
      searchText: textSearchValue([cells, finding.originalFindingLabel, finding.source.note]),
      sortValues: {
        condition: condition?.label ?? finding.conditionId,
        setting: system?.label ?? finding.systemId,
        test: finding.findingLabel,
        lrPositive: finding.lrPositive.value,
        lrNegative: finding.lrNegative.value,
        reviewStatus: finding.reviewStatus
      },
      detail: {
        title: `Körperlicher Befund: ${finding.findingLabel}`,
        sources: source,
        population: `Prätestbereich nach McGee: ${formatPhysicalPretestRange(finding)}.`,
        rationale: `Befund vorhanden nutzt LR+: ${formatPhysicalLr(finding.lrPositive)}. Befund fehlend nutzt LR−: ${formatPhysicalLr(finding.lrNegative)}.`,
        limitations: finding.limitations,
        reviewNote: finding.reviewNote
      }
    };
  });
  return [...assumptionRows, ...modifierRows, ...profileRows, ...physicalRows];
}

function renderDataCatalog(): void {
  const testFilter = controls.catalogTestFilter.value || 'all';
  const testFilterConditionId = testFilter === 'all'
    ? null
    : (() => {
        const test = allTests().find(candidate => candidate.id === testFilter);
        return test ? conditionIdForTest(test) : '';
      })();
  const rows = sortCatalogRows(
    filterCatalogRows(
      catalogRows(),
      {
        conditionId: controls.catalogConditionFilter.value || 'all',
        settingId: controls.catalogSettingFilter.value || 'all',
        testId: testFilter,
        status: controls.catalogStatusFilter.value || 'all',
        reviewStatus: controls.catalogReviewFilter.value || 'all',
        evidenceQuality: controls.catalogQualityFilter.value || 'all',
        dataCompleteness: controls.catalogCompletenessFilter.value || 'all',
        search: controls.catalogSearchInput.value,
        domain: controls.catalogDomainFilter.value || 'all',
        sortBy: (controls.catalogSortSelect.value || 'condition') as CatalogSortKey
      },
      testFilterConditionId
    ),
    (controls.catalogSortSelect.value || 'condition') as CatalogSortKey
  );
  if (selectedCatalogRowKey && !rows.some(row => row.key === selectedCatalogRowKey)) selectedCatalogRowKey = '';
  if (!selectedCatalogRowKey && rows[0]) selectedCatalogRowKey = rows[0].key;
  controls.catalogTableBody.textContent = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.kind = row.kind;
    tr.dataset.id = row.id;
    tr.dataset.key = row.key;
    if (row.settingId) tr.dataset.settingId = row.settingId;
    tr.classList.toggle('is-selected', row.key === selectedCatalogRowKey);
    row.cells.forEach((value, index) => {
      const td = document.createElement('td');
      td.textContent = value;
      if (index === 13) {
        td.textContent = '';
        td.append(reviewBadge(row.reviewStatus));
      }
      if (index === 14) {
        td.textContent = '';
        td.append(qualityBadge(row.evidenceQuality));
      }
      if (index === 15) {
        td.textContent = '';
        td.append(completenessBadge(row.dataCompleteness));
      }
      tr.append(td);
    });
    const actions = document.createElement('td');
    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'compact-button';
    selectButton.dataset.catalogAction = 'select';
    selectButton.textContent = 'Im Rechner auswählen';
    const correctButton = document.createElement('button');
    correctButton.type = 'button';
    correctButton.className = 'compact-button';
    correctButton.dataset.catalogAction = 'correct';
    correctButton.textContent = 'Als Korrektur öffnen';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'compact-button secondary-button';
    exportButton.dataset.catalogAction = 'export';
    exportButton.textContent = 'JSON-Vorschlag';
    actions.append(selectButton, correctButton, exportButton);
    tr.append(actions);
    controls.catalogTableBody.append(tr);
  });
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 19;
    td.textContent = 'Keine Einträge für diese Filter.';
    tr.append(td);
    controls.catalogTableBody.append(tr);
  }
  renderCatalogDetail(rows.find(row => row.key === selectedCatalogRowKey) ?? rows[0]);
}

function badge(text: string, className: string): HTMLElement {
  const element = document.createElement('span');
  element.className = `catalog-badge ${className}`;
  element.textContent = text;
  return element;
}

function reviewBadge(value: ReviewStatus): HTMLElement {
  return badge(reviewLabel(value), `review-${value}`);
}

function qualityBadge(value: EvidenceQuality): HTMLElement {
  return badge(qualityLabel(value), `quality-${value}`);
}

function completenessBadge(value: DataCompleteness): HTMLElement {
  return badge(completenessLabel(value), `complete-${value}`);
}

function renderCatalogDetail(row: CatalogRow | undefined): void {
  controls.catalogDetailPanel.textContent = '';
  if (!row) {
    controls.catalogDetailPanel.textContent = 'Kein Eintrag ausgewählt.';
    return;
  }
  const heading = document.createElement('h4');
  heading.textContent = row.detail.title;
  const meta = document.createElement('div');
  meta.className = 'catalog-detail-meta';
  meta.append(reviewBadge(row.reviewStatus), qualityBadge(row.evidenceQuality), completenessBadge(row.dataCompleteness));
  const list = document.createElement('dl');
  [
    ['Population / Kontext', row.detail.population],
    ['Quellen', row.detail.sources],
    ['Begründung', row.detail.rationale],
    ['Grenzen / Fallstricke', row.detail.limitations],
    ['Review-Notiz', row.detail.reviewNote ?? 'Keine Review-Notiz hinterlegt.']
  ].forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  });
  const actions = document.createElement('div');
  actions.className = 'button-row';
  const selectButton = document.createElement('button');
  selectButton.type = 'button';
  selectButton.className = 'compact-button';
  selectButton.dataset.catalogAction = 'select';
  selectButton.dataset.kind = row.kind;
  selectButton.dataset.id = row.id;
  selectButton.dataset.settingId = row.settingId ?? '';
  selectButton.textContent = 'Im Rechner öffnen';
  const correctButton = document.createElement('button');
  correctButton.type = 'button';
  correctButton.className = 'compact-button';
  correctButton.dataset.catalogAction = 'correct';
  correctButton.dataset.kind = row.kind;
  correctButton.dataset.id = row.id;
  correctButton.textContent = 'Korrekturformular öffnen';
  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'compact-button secondary-button';
  exportButton.dataset.catalogAction = 'export';
  exportButton.dataset.kind = row.kind;
  exportButton.dataset.id = row.id;
  exportButton.textContent = 'JSON-Vorschlag exportieren';
  actions.append(selectButton, correctButton, exportButton);
  controls.catalogDetailPanel.append(heading, meta, list, actions);
}

function renderEvidence(profile: EvidenceProfile, assumption: PretestAssumption, pretestResolution: PretestResolution): void {
  controls.evidencePanel.textContent = '';
  const modifiers = selectedModifiers();
  if (profile.kind === 'scenario') {
    const scenario = document.createElement('p');
    scenario.className = 'scenario-note';
    scenario.textContent = `Szenario: ${profile.deviationReason ?? 'Abweichung ohne Begründung'}`;
    controls.evidencePanel.append(scenario);
  }
  controls.evidencePanel.append(
    renderSources('Testgüte / Evidenzprofil', profile),
    renderSources(pretestResolution.status === 'manual' ? 'Manuelle Prätestwahrscheinlichkeit' : 'Prätest-Annahme', assumption)
  );
  if (modifiers.length > 0) {
    const modifierSection = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = 'Klinische Modifikatoren';
    modifierSection.append(heading);
    modifiers.forEach(modifier => {
      const paragraph = document.createElement('p');
      paragraph.textContent = `${modifier.label} (${directionLabel(modifier.direction)}): ${modifier.rationale} Grenzen: ${modifier.limitations}`;
      modifierSection.append(paragraph);
    });
    controls.evidencePanel.append(modifierSection);
  }
}

function guidanceForCondition(conditionId: string): ConditionGuidance | undefined {
  return conditionGuidance.find(guidance => guidance.conditionId === conditionId);
}

function appendGuidanceList(parent: HTMLElement, title: string, items: string[]): void {
  if (items.length === 0) return;
  const section = document.createElement('section');
  section.className = 'guidance-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const list = document.createElement('ul');
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  });
  section.append(heading, list);
  parent.append(section);
}

function renderGuidanceLinks(parent: HTMLElement, links: EvidenceSource[]): void {
  const section = document.createElement('section');
  section.className = 'guidance-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Leitlinien und Quellen';
  const list = document.createElement('ul');
  list.className = 'source-list guidance-link-list';
  links.forEach(source => {
    const item = document.createElement('li');
    item.className = 'source-item';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = source.kind;
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.title} (${source.year})`;
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = source.note;
    item.append(badge, link, note);
    list.append(item);
  });
  section.append(heading, list);
  parent.append(section);
}

function renderConditionGuidance(): void {
  const selectedCondition = getSelectedCondition();
  const guidance = guidanceForCondition(selectedCondition.id);
  controls.conditionGuidanceTitle.textContent = `Weiterführende Informationen: ${selectedCondition.label}`;
  controls.conditionGuidanceContent.textContent = '';

  if (!guidance) {
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'Für diese Erkrankung ist noch keine kuratierte Kurznotiz hinterlegt. Die testbezogenen Quellen bleiben in „Zahlen, Herkunft und Begründung“ sichtbar.';
    controls.conditionGuidanceContent.append(note);
    return;
  }

  const summary = document.createElement('p');
  summary.className = 'guidance-summary';
  summary.textContent = guidance.summary;
  controls.conditionGuidanceContent.append(summary);
  appendGuidanceList(controls.conditionGuidanceContent, 'Wann testen?', guidance.whenToTest);
  appendGuidanceList(controls.conditionGuidanceContent, 'Geeignete Tests', guidance.recommendedTests);
  appendGuidanceList(controls.conditionGuidanceContent, 'Wichtige Fallstricke', guidance.pitfalls);
  appendGuidanceList(controls.conditionGuidanceContent, 'Setting-Hinweise', guidance.settingNotes);
  renderGuidanceLinks(controls.conditionGuidanceContent, guidance.links);
}

function describeResult(result: CalculationResult): string {
  const gain = result.postPositiveProbability - result.pretestProbability;
  const drop = result.pretestProbability - result.postNegativeProbability;
  const ruleIn = result.lrPositive >= 10 ? 'stark' : result.lrPositive >= 5 ? 'moderat' : 'begrenzt';
  const ruleOut = result.lrNegative <= 0.1 ? 'stark' : result.lrNegative <= 0.2 ? 'moderat' : 'begrenzt';
  return `Ein positives Ergebnis zeigt einen ${ruleIn}en Rule-in-Effekt (${formatPercent(gain)} absolute Zunahme). Ein negatives Ergebnis zeigt einen ${ruleOut}en Rule-out-Effekt (${formatPercent(drop)} absolute Abnahme).`;
}

function drawNomogram(result: CalculationResult): void {
  const impact = modifierImpact(getSelectedProfile(), result);
  drawNomogramCanvases({ positive: controls.nomogramPositive, negative: controls.nomogramNegative }, result, impact);
}

function currentCalculation(): {
  test: DiagnosticTest;
  profile: EvidenceProfile;
  assumption: PretestAssumption;
  pretestResolution: PretestResolution;
  result: CalculationResult;
} {
  const test = getSelectedTest();
  const profile = getSelectedProfile();
  const pretestResolution = resolvePretestAssumption();
  const manualProbability = clampProbabilityPercent(state.manualPretestPercent) / 100;
  return {
    test,
    profile,
    assumption: pretestResolution.assumption,
    pretestResolution,
    result: calculateResult(profile, manualProbability)
  };
}

function physicalConditionsForSystem(systemId: string): PhysicalCondition[] {
  return physicalConditions
    .filter(condition => condition.systemId === systemId)
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

function physicalFindingsForCondition(conditionId: string): PhysicalFinding[] {
  return physicalFindings
    .filter(finding => finding.conditionId === conditionId)
    .sort((a, b) => {
      const aScore = (a.lrPositive.value ?? 1) + (a.lrNegative.value ? 1 / a.lrNegative.value : 0);
      const bScore = (b.lrPositive.value ?? 1) + (b.lrNegative.value ? 1 / b.lrNegative.value : 0);
      return bScore - aScore || a.findingLabel.localeCompare(b.findingLabel, 'de');
    });
}

function ensurePhysicalSelection(): void {
  const system = physicalSystems.find(candidate => candidate.id === state.selectedPhysicalSystemId) ?? physicalSystems[0];
  state.selectedPhysicalSystemId = system.id;
  const conditions = physicalConditionsForSystem(system.id);
  const condition = conditions.find(candidate => candidate.id === state.selectedPhysicalConditionId) ?? conditions[0] ?? physicalConditions[0];
  state.selectedPhysicalConditionId = condition.id;
  const findings = physicalFindingsForCondition(condition.id);
  const finding = findings.find(candidate => candidate.id === state.selectedPhysicalFindingId) ?? findings[0] ?? physicalFindings[0];
  state.selectedPhysicalFindingId = finding.id;
  state.physicalPretestPercent = clampProbabilityPercent(state.physicalPretestPercent ?? Math.max(0.1, finding.pretestRange.low));
}

function physicalProfileFromFinding(finding: PhysicalFinding): EvidenceProfile {
  return {
    id: `physical-${finding.id}`,
    testId: 'physical-exam',
    label: finding.findingLabel,
    kind: 'curated',
    method: 'Körperlicher Untersuchungsbefund',
    cutoff: finding.positiveCriterion,
    sensitivity: null,
    specificity: null,
    lrPositive: finding.lrPositive.value ?? 1,
    lrNegative: finding.lrNegative.value ?? 1,
    population: `McGee-Prätestbereich: ${formatPhysicalPretestRange(finding)}.`,
    rationale: 'Likelihood-Ratio eines körperlichen Untersuchungsbefunds aus McGee.',
    limitations: finding.limitations,
    sources: [],
    lastReviewed: '2026-05-19',
    reviewStatus: 'needs-review',
    evidenceQuality: 'moderate',
    dataCompleteness: 'partial'
  };
}

function formatPhysicalLr(lr: PhysicalFinding['lrPositive']): string {
  if (lr.notReported || lr.value == null) return 'nicht berichtet';
  const ci = lr.ciLow != null && lr.ciHigh != null ? ` (${formatRatio(lr.ciLow)}-${formatRatio(lr.ciHigh)})` : '';
  return `${formatRatio(lr.value)}${ci}`;
}

function formatPhysicalPretestRange(finding: PhysicalFinding): string {
  const low = finding.pretestRange.low.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const high = finding.pretestRange.high.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return low === high ? `${low} %` : `${low}-${high} %`;
}

function currentPhysicalCalculation(): { finding: PhysicalFinding; condition: PhysicalCondition; result: CalculationResult } {
  ensurePhysicalSelection();
  const finding = physicalFindings.find(candidate => candidate.id === state.selectedPhysicalFindingId) ?? physicalFindings[0];
  const condition = physicalConditions.find(candidate => candidate.id === finding.conditionId) ?? physicalConditions[0];
  const pretest = clampProbabilityPercent(state.physicalPretestPercent ?? finding.pretestRange.low) / 100;
  return {
    finding,
    condition,
    result: calculateResult(physicalProfileFromFinding(finding), pretest)
  };
}

function populatePhysicalSelectors(): void {
  ensurePhysicalSelection();
  populateSelect(
    physicalControls.systemSelect,
    physicalSystems
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(system => ({ value: system.id, label: system.label })),
    state.selectedPhysicalSystemId ?? physicalSystems[0].id
  );
  populateSelect(
    physicalControls.conditionSelect,
    physicalConditionsForSystem(state.selectedPhysicalSystemId ?? physicalSystems[0].id).map(condition => ({
      value: condition.id,
      label: condition.label
    })),
    state.selectedPhysicalConditionId ?? physicalConditions[0].id
  );
  populateSelect(
    physicalControls.findingSelect,
    physicalFindingsForCondition(state.selectedPhysicalConditionId ?? physicalConditions[0].id).map(finding => ({
      value: finding.id,
      label: finding.findingLabel
    })),
    state.selectedPhysicalFindingId ?? physicalFindings[0].id
  );
}

function renderPhysicalMain(): void {
  populatePhysicalSelectors();
  const { finding, condition, result } = currentPhysicalCalculation();
  const pretestPercent = clampProbabilityPercent(result.pretestProbability * 100);
  physicalControls.pretestRange.value = String(pretestPercent);
  if (document.activeElement !== physicalControls.pretestNumber) {
    physicalControls.pretestNumber.value = formatPretestPercentInput(pretestPercent);
  }
  physicalControls.lrPositive.textContent = formatPhysicalLr(finding.lrPositive);
  physicalControls.lrNegative.textContent = formatPhysicalLr(finding.lrNegative);
  physicalControls.pretestValue.textContent = formatPercent(result.pretestProbability);
  physicalControls.postPositiveValue.textContent = finding.lrPositive.value == null ? '–' : formatPercent(result.postPositiveProbability);
  physicalControls.postNegativeValue.textContent = finding.lrNegative.value == null ? '–' : formatPercent(result.postNegativeProbability);
  setBar(physicalControls.pretestBar, result.pretestProbability);
  setBar(physicalControls.postPositiveBar, finding.lrPositive.value == null ? 0 : result.postPositiveProbability);
  setBar(physicalControls.postNegativeBar, finding.lrNegative.value == null ? 0 : result.postNegativeProbability);
  physicalControls.pretestHint.textContent = `McGee-Prätestbereich in den Studien: ${formatPhysicalPretestRange(finding)}. Dieser Bereich wird nicht automatisch übernommen.`;
  const gain = result.postPositiveProbability - result.pretestProbability;
  const drop = result.pretestProbability - result.postNegativeProbability;
  physicalControls.interpretation.textContent =
    `Für „${finding.findingLabel}“ bei ${condition.label}: Befund vorhanden verändert die Wahrscheinlichkeit um ${finding.lrPositive.value == null ? 'nicht berechenbar' : formatPercent(gain)} absolut, Befund fehlend um ${finding.lrNegative.value == null ? 'nicht berechenbar' : formatPercent(drop)} absolut.`;
  physicalControls.findingHint.textContent = `${finding.source.sourceBox}, Referenzseite ${finding.source.sourcePage}. Original: ${finding.originalFindingLabel}.`;
  physicalControls.details.innerHTML = '';
  physicalControls.details.append(
    detailRow('Körpersystem', physicalSystems.find(system => system.id === finding.systemId)?.label ?? finding.systemId),
    detailRow('Fragestellung', condition.label),
    detailRow('Befund', finding.findingLabel),
    detailRow('LR+', formatPhysicalLr(finding.lrPositive)),
    detailRow('LR−', formatPhysicalLr(finding.lrNegative)),
    detailRow('Prätestbereich', formatPhysicalPretestRange(finding)),
    detailRow('Quelle', `${finding.source.title}; ${finding.source.sourceBox}, Seite ${finding.source.sourcePage}`),
    detailRow('Status', finding.reviewStatus),
    detailRow('Grenzen', finding.limitations)
  );
  drawNomogramCanvases(
    { positive: physicalControls.nomogramPositive, negative: physicalControls.nomogramNegative },
    result,
    { direction: 'none' }
  );
}

function renderMode(): void {
  const physicalMode = state.appMode === 'physical-exam';
  controls.calculatorGrid.classList.toggle('hidden', physicalMode);
  controls.physicalExamGrid.classList.toggle('hidden', !physicalMode);
  controls.diagnosticModeTab.classList.toggle('is-active', !physicalMode);
  controls.physicalModeTab.classList.toggle('is-active', physicalMode);
  controls.diagnosticModeTab.setAttribute('aria-selected', String(!physicalMode));
  controls.physicalModeTab.setAttribute('aria-selected', String(physicalMode));
}

function renderMain(): void {
  populateSelectors();
  const { test, profile, assumption, pretestResolution, result } = currentCalculation();
  const pretestPercent = clampProbabilityPercent(result.pretestProbability * 100);
  state.selectedEvidenceProfileId = profile.id;
  controls.pretestRange.value = String(pretestPercent);
  if (document.activeElement !== controls.pretestNumber) {
    controls.pretestNumber.value = formatPretestPercentInput(pretestPercent);
  }
  controls.lrPositive.textContent = formatRatio(result.lrPositive);
  controls.lrNegative.textContent = formatRatio(result.lrNegative);
  controls.pretestValue.textContent = formatPercent(result.pretestProbability);
  controls.postPositiveValue.textContent = formatPercent(result.postPositiveProbability);
  controls.postNegativeValue.textContent = formatPercent(result.postNegativeProbability);
  setBar(controls.pretestBar, result.pretestProbability);
  setBar(controls.postPositiveBar, result.postPositiveProbability);
  setBar(controls.postNegativeBar, result.postNegativeProbability);
  controls.interpretation.textContent = describeResult(result);
  renderScenarioBanner(profile);
  renderMismatchWarning(test);
  renderPretestStatus(pretestResolution);
  renderModifierSelector(result);
  renderModifierImpact(profile, result);
  renderDetails(test, profile, assumption, result, pretestResolution);
  renderEvidence(profile, assumption, pretestResolution);
  renderConditionGuidance();
  const selectedChain = diagnosticChains.find(chain => chain.id === state.selectedDiagnosticChainId) ?? diagnosticChains[0];
  state.selectedDiagnosticChainId = selectedChain?.id;
  const chainViewModels = selectedChain
    ? [calculateDiagnosticChain(selectedChain, allTests(), allProfiles(), result.pretestProbability)].filter(
        (chain): chain is NonNullable<typeof chain> => chain != null
      )
    : [];
  renderDiagnosticChains(controls.diagnosticChainsPanel, chainViewModels, result.pretestProbability);
  drawNomogram(result);
}

function renderDrawer(): void {
  populateAdminSelectors();
  controls.drawer.classList.toggle('is-open', state.drawerOpen);
  controls.drawer.classList.toggle('is-fullscreen', Boolean(state.catalogFullscreen && state.adminMode === 'catalog'));
  controls.drawer.setAttribute('aria-hidden', String(!state.drawerOpen));
  controls.drawerBackdrop.classList.toggle('hidden', !state.drawerOpen);
  controls.drawerOpenButton.setAttribute('aria-expanded', String(state.drawerOpen));
  document.querySelectorAll<HTMLButtonElement>('[data-admin-mode]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.adminMode === state.adminMode);
  });
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== state.adminMode);
  });
  controls.customDataSummary.textContent = `${state.customTests.length} eigene Tests, ${state.customEvidenceProfiles.length} eigene Evidenzprofile/Szenarien, ${state.customAssumptions.length} eigene Prätest-Annahmen und ${state.customModifiers.length} eigene Modifikatoren lokal gespeichert.`;
  controls.catalogFullscreenButton.textContent = state.catalogFullscreen ? 'Normalbreite' : 'Vollbildmodus';
  renderAdminOverview();
  renderDataCatalog();
  renderProfilePreview();
  renderScenarioPreview();
}

function render(): void {
  renderMode();
  renderMain();
  renderPhysicalMain();
  renderDrawer();
}

function openDrawer(mode: CalculatorState['adminMode'] = state.adminMode): void {
  lastFocusBeforeDrawer = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.drawerOpen = true;
  state.adminMode = mode;
  renderDrawer();
  controls.drawerCloseButton.focus();
}

function closeDrawer(): void {
  state.drawerOpen = false;
  renderDrawer();
  lastFocusBeforeDrawer?.focus();
}

function toggleDisclaimer(): void {
  const expanded = controls.disclaimerToggleButton.getAttribute('aria-expanded') === 'true';
  const nextExpanded = !expanded;
  controls.disclaimerToggleButton.setAttribute('aria-expanded', String(nextExpanded));
  controls.disclaimerContent.classList.toggle('hidden', !nextExpanded);
  controls.disclaimerToggleIcon.textContent = nextExpanded ? '−' : '+';
  controls.disclaimerToggleLabel.textContent = nextExpanded ? 'Details ausblenden' : 'Details anzeigen';
}

function handleNomogramSizeToggle(): void {
  const expanded = controls.nomogramSizeToggle.checked;
  controls.calculatorGrid.classList.toggle('nomogram-focus', expanded);
  controls.nomogramCard.classList.toggle('is-focused', expanded);
  window.requestAnimationFrame(() => drawNomogram(currentCalculation().result));
  if (expanded) {
    controls.nomogramCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function parseRangePercent(value: string): { rangeLow?: number; rangeHigh?: number } {
  const parts = value.split('-').map(part => Number.parseFloat(part.trim().replace(',', '.')));
  if (parts.length !== 2 || parts.some(part => !Number.isFinite(part))) return {};
  return {
    rangeLow: clamp(parts[0], 0, 100) / 100,
    rangeHigh: clamp(parts[1], 0, 100) / 100
  };
}

function profileFromForm(kind: 'custom' | 'scenario'): EvidenceProfile {
  const sensitivity = clamp(Number.parseFloat($<HTMLInputElement>(kind === 'custom' ? 'profileSensitivity' : 'scenarioSensitivity').value), 0, 100) / 100;
  const specificity = clamp(Number.parseFloat($<HTMLInputElement>(kind === 'custom' ? 'profileSpecificity' : 'scenarioSpecificity').value), 0, 100) / 100;
  const ratios = likelihoodRatiosFromSensitivitySpecificity(sensitivity, specificity);
  const baseProfile = getSelectedProfile();
  if (kind === 'scenario') {
    return {
      ...baseProfile,
      id: uniqueId('scenario-profile'),
      label: $<HTMLInputElement>('scenarioLabel').value.trim(),
      kind: 'scenario',
      sensitivity,
      specificity,
      lrPositive: ratios.lrPositive,
      lrNegative: ratios.lrNegative,
      procedure: $<HTMLInputElement>('scenarioProcedure').value.trim() || baseProfile.procedure,
      intendedUse: baseProfile.intendedUse ?? baseProfile.purpose ?? 'scenario',
      preanalyticRisk: baseProfile.preanalyticRisk ?? 'unclear',
      applicabilityWarning: baseProfile.applicabilityWarning ?? baseProfile.limitations,
      reviewPriority: 'medium',
      rationale: `Abweichendes Szenario zu ${baseProfile.label}.`,
      limitations: baseProfile.limitations,
      deviationFromProfileId: baseProfile.id,
      deviationReason: $<HTMLTextAreaElement>('scenarioReason').value.trim(),
      lastReviewed: new Date().toISOString().slice(0, 10),
      isDefault: false,
      sources: baseProfile.sources,
      ...localReviewMetadata('expert-opinion', 'partial')
    };
  }
  const testId = controls.profileTestSelect.value || getSelectedTest().id;
  return {
    id: uniqueId('custom-profile'),
    testId,
    label: $<HTMLInputElement>('profileLabel').value.trim(),
    kind: 'custom',
    method: $<HTMLInputElement>('profileMethod').value.trim(),
    cutoff: $<HTMLInputElement>('profileCutoff').value.trim(),
    procedure: $<HTMLInputElement>('profileProcedure').value.trim(),
    intendedUse: 'lokales Evidenzprofil',
    preanalyticRisk: 'unclear',
    applicabilityWarning: $<HTMLTextAreaElement>('profileLimitations').value.trim(),
    reviewPriority: 'medium',
    sensitivity,
    specificity,
    lrPositive: ratios.lrPositive,
    lrNegative: ratios.lrNegative,
    population: $<HTMLTextAreaElement>('profilePopulation').value.trim(),
    rationale: $<HTMLTextAreaElement>('profileRationale').value.trim(),
    limitations: $<HTMLTextAreaElement>('profileLimitations').value.trim(),
    sources: [sourceFromForm('profile', 'Lokale Annahme')],
    lastReviewed: new Date().toISOString().slice(0, 10),
    isDefault: false,
    ...localReviewMetadata('expert-opinion', 'partial')
  };
}

function renderProfilePreview(): void {
  const profile = profileFromForm('custom');
  const issues = validateEvidenceProfile(profile);
  $('profilePreview').textContent = issues.length
    ? `Bitte prüfen: ${issues.map(issue => issue.message).join(' ')}`
    : `Vorschau: LR+ ${formatRatio(profile.lrPositive ?? null)}, LR− ${formatRatio(profile.lrNegative ?? null)}.`;
}

function renderScenarioPreview(): void {
  const profile = profileFromForm('scenario');
  const issues = validateEvidenceProfile(profile);
  $('scenarioPreview').textContent = issues.length
    ? `Bitte prüfen: ${issues.map(issue => issue.message).join(' ')}`
    : `Vorschau: Szenario zu „${getSelectedProfile().label}“ mit LR+ ${formatRatio(profile.lrPositive ?? null)}, LR− ${formatRatio(profile.lrNegative ?? null)}.`;
}

function saveCustomTest(): void {
  clearMessage($('customTestMessage'));
  const test: DiagnosticTest = {
    id: uniqueId('custom-test'),
    name: $<HTMLInputElement>('customTestName').value.trim(),
    category: $<HTMLInputElement>('customTestCategory').value.trim(),
    condition: $<HTMLInputElement>('customTestCondition').value.trim(),
    conditionId: conditionIdForLabel($<HTMLInputElement>('customTestCondition').value.trim()),
    description: $<HTMLTextAreaElement>('customTestDescription').value.trim(),
    evidenceProfiles: [],
    custom: true
  };
  if (!test.name || !test.category || !test.condition || !test.description) {
    setMessage($('customTestMessage'), 'Bitte Name, Kategorie, Krankheitsbild und Beschreibung ausfüllen.', true);
    return;
  }
  state.customTests = [...state.customTests, test];
  state.selectedTestId = test.id;
  setMessage($('customTestMessage'), 'Test gespeichert. Lege nun ein Evidenzprofil für diesen Test an.');
  state.adminMode = 'profile';
  saveAndRender();
}

function saveProfile(kind: 'custom' | 'scenario'): void {
  const messageEl = $(kind === 'custom' ? 'profileMessage' : 'scenarioMessage');
  clearMessage(messageEl);
  const profile = profileFromForm(kind);
  const issues = validateEvidenceProfile(profile);
  if (issues.length > 0) {
    setMessage(messageEl, issues.map(issue => issue.message).join(' '), true);
    return;
  }
  state.customEvidenceProfiles = [...state.customEvidenceProfiles, profile];
  state.selectedTestId = profile.testId;
  state.selectedEvidenceProfileId = profile.id;
  setMessage(messageEl, kind === 'scenario' ? 'Szenario gespeichert.' : 'Evidenzprofil gespeichert.');
  saveAndRender();
}

function saveCustomAssumption(): void {
  clearMessage($('customAssumptionMessage'));
  const range = parseRangePercent($<HTMLInputElement>('customAssumptionRange').value);
  const condition = $<HTMLInputElement>('customAssumptionCondition').value.trim();
  const setting = $<HTMLInputElement>('customAssumptionSetting').value.trim();
  const settingId = $<HTMLInputElement>('customAssumptionSettingId').value.trim() || settingIdForLabel(setting);
  const evidenceLevel = $<HTMLSelectElement>('customAssumptionEvidenceLevel').value as 'direct' | 'fallback';
  const assumption: PretestAssumption = {
    id: uniqueId('custom-pretest'),
    condition,
    conditionId: conditionIdForLabel(condition),
    setting,
    settingId: evidenceLevel === 'fallback' ? 'general' : settingId,
    evidenceLevel,
    population: $<HTMLTextAreaElement>('customAssumptionPopulation').value.trim(),
    probability: clampProbabilityPercent(Number.parseFloat($<HTMLInputElement>('customAssumptionProbability').value)) / 100,
    ...range,
    rationale: $<HTMLTextAreaElement>('customAssumptionRationale').value.trim(),
    limitations: $<HTMLTextAreaElement>('customAssumptionLimitations').value.trim(),
    sources: [sourceFromForm('customAssumption', 'Lokale Annahme')],
    lastReviewed: new Date().toISOString().slice(0, 10),
    kind: 'custom',
    custom: true,
    ...localReviewMetadata('expert-opinion', 'partial')
  };
  const issues = validatePretestAssumption(assumption);
  if (issues.length > 0) {
    setMessage($('customAssumptionMessage'), issues.map(issue => issue.message).join(' '), true);
    return;
  }
  state.customAssumptions = [...state.customAssumptions, assumption];
  state.selectedAssumptionId = assumption.id;
  state.selectedConditionId = assumption.conditionId ?? state.selectedConditionId;
  if (assumption.settingId !== 'general') state.selectedSettingId = assumption.settingId ?? state.selectedSettingId;
  state.manualPretestPercent = clampProbabilityPercent(assumption.probability * 100);
  setMessage($('customAssumptionMessage'), 'Prätest-Annahme gespeichert.');
  saveAndRender();
}

function modifierFromForm(): ClinicalModifier {
  const likelihoodRatio = Number.parseFloat($<HTMLInputElement>('modifierLikelihoodRatio').value);
  const probabilityFactor = Number.parseFloat($<HTMLInputElement>('modifierProbabilityFactor').value);
  const hasLikelihoodRatio = Number.isFinite(likelihoodRatio);
  const hasProbabilityFactor = Number.isFinite(probabilityFactor);
  const quantificationStatus = hasLikelihoodRatio ? 'likelihood-ratio' : hasProbabilityFactor ? 'probability-factor' : 'qualitative';
  return {
    id: uniqueId('custom-modifier'),
    conditionId: controls.modifierConditionSelect.value,
    label: $<HTMLInputElement>('modifierLabel').value.trim(),
    category: $<HTMLSelectElement>('modifierCategory').value as ClinicalModifier['category'],
    direction: $<HTMLSelectElement>('modifierDirection').value as ClinicalModifierDirection,
    ...(hasLikelihoodRatio ? { likelihoodRatio } : {}),
    ...(hasProbabilityFactor && !hasLikelihoodRatio ? { probabilityFactor } : {}),
    quantificationStatus,
    rationale: $<HTMLTextAreaElement>('modifierRationale').value.trim(),
    limitations: $<HTMLTextAreaElement>('modifierLimitations').value.trim(),
    sources: [sourceFromForm('modifier', 'Lokale Annahme')],
    lastReviewed: new Date().toISOString().slice(0, 10),
    kind: 'custom',
    custom: true,
    ...localReviewMetadata('expert-opinion', quantificationStatus === 'qualitative' ? 'partial' : 'complete')
  };
}

function saveModifier(): void {
  clearMessage($('modifierMessage'));
  const modifier = modifierFromForm();
  const issues = validateClinicalModifier(modifier);
  if (issues.length > 0) {
    setMessage($('modifierMessage'), issues.map(issue => issue.message).join(' '), true);
    return;
  }
  state.customModifiers = [...state.customModifiers, modifier];
  state.selectedConditionId = modifier.conditionId;
  state.selectedModifierIds = [...new Set([...state.selectedModifierIds, modifier.id])];
  setMessage($('modifierMessage'), 'Klinischer Modifikator gespeichert.');
  saveAndRender();
}

function fillSourceForm(prefix: string, source: EvidenceSource | undefined): void {
  if (!source) return;
  $<HTMLInputElement>(`${prefix}SourceTitle`).value = source.title;
  $<HTMLInputElement>(`${prefix}SourceYear`).value = String(source.year);
  $<HTMLInputElement>(`${prefix}SourceUrl`).value = source.url;
  $<HTMLTextAreaElement>(`${prefix}SourceNote`).value = source.note;
}

function copyCurrentPretestToForm(): void {
  const { assumption, pretestResolution } = currentCalculation();
  const selectedSetting = getSelectedSetting();
  const selectedCondition = getSelectedCondition();
  fillAssumptionForm(assumption, selectedCondition.label, selectedSetting.label, selectedSetting.id, pretestResolution.probability);
  state.adminMode = 'assumption';
  renderDrawer();
}

function fillAssumptionForm(
  assumption: PretestAssumption,
  conditionLabel = assumption.condition,
  settingLabel = assumption.setting,
  settingId = assumption.settingId ?? settingIdForLabel(assumption.setting),
  probability = assumption.probability
): void {
  $<HTMLInputElement>('customAssumptionCondition').value = conditionLabel;
  $<HTMLInputElement>('customAssumptionSetting').value = settingLabel;
  $<HTMLInputElement>('customAssumptionSettingId').value = settingId;
  $<HTMLSelectElement>('customAssumptionEvidenceLevel').value = assumption.evidenceLevel ?? 'direct';
  $<HTMLInputElement>('customAssumptionProbability').value = String((probability * 100).toFixed(1));
  $<HTMLInputElement>('customAssumptionRange').value =
    assumption.rangeLow != null && assumption.rangeHigh != null
      ? `${(assumption.rangeLow * 100).toFixed(1)}-${(assumption.rangeHigh * 100).toFixed(1)}`
      : '';
  $<HTMLTextAreaElement>('customAssumptionPopulation').value = assumption.population;
  $<HTMLTextAreaElement>('customAssumptionRationale').value = `Lokale Korrektur: ${assumption.rationale}`;
  $<HTMLTextAreaElement>('customAssumptionLimitations').value = assumption.limitations;
  fillSourceForm('customAssumption', assumption.sources[0]);
}

function copyCurrentTestToForm(): void {
  const test = getSelectedTest();
  $<HTMLInputElement>('customTestName').value = `${test.name} (lokale Kopie)`;
  $<HTMLInputElement>('customTestCategory').value = test.category;
  $<HTMLInputElement>('customTestCondition').value = test.condition;
  $<HTMLTextAreaElement>('customTestDescription').value = test.description;
  state.adminMode = 'test';
  renderDrawer();
}

function copyCurrentProfileToForm(): void {
  fillProfileForm(getSelectedProfile());
  state.adminMode = 'profile';
  renderDrawer();
}

function fillProfileForm(profile: EvidenceProfile): void {
  controls.profileTestSelect.value = profile.testId;
  $<HTMLInputElement>('profileLabel').value = `${profile.label} (lokale Korrektur)`;
  $<HTMLInputElement>('profileMethod').value = profile.method;
  $<HTMLInputElement>('profileCutoff').value = profile.cutoff;
  $<HTMLInputElement>('profileProcedure').value = profile.procedure ?? 'Nach lokalem Laborprotokoll durchführen.';
  $<HTMLInputElement>('profileSensitivity').value = profile.sensitivity == null ? '' : String((profile.sensitivity * 100).toFixed(1));
  $<HTMLInputElement>('profileSpecificity').value = profile.specificity == null ? '' : String((profile.specificity * 100).toFixed(1));
  $<HTMLTextAreaElement>('profilePopulation').value = profile.population;
  $<HTMLTextAreaElement>('profileRationale').value = `Lokale Korrektur: ${profile.rationale}`;
  $<HTMLTextAreaElement>('profileLimitations').value = profile.limitations;
  fillSourceForm('profile', profile.sources[0]);
}

function fillModifierForm(modifier: ClinicalModifier): void {
  controls.modifierConditionSelect.value = modifier.conditionId;
  $<HTMLInputElement>('modifierLabel').value = `${modifier.label} (lokale Korrektur)`;
  $<HTMLSelectElement>('modifierCategory').value = modifier.category;
  $<HTMLSelectElement>('modifierDirection').value = modifier.direction;
  $<HTMLInputElement>('modifierLikelihoodRatio').value = modifier.likelihoodRatio == null ? '' : String(modifier.likelihoodRatio);
  $<HTMLInputElement>('modifierProbabilityFactor').value = modifier.probabilityFactor == null ? '' : String(modifier.probabilityFactor);
  $<HTMLTextAreaElement>('modifierRationale').value = `Lokale Korrektur: ${modifier.rationale}`;
  $<HTMLTextAreaElement>('modifierLimitations').value = modifier.limitations;
  fillSourceForm('modifier', modifier.sources[0]);
}

function catalogItem(kind: CatalogRowKind, id: string): PretestAssumption | ClinicalModifier | EvidenceProfile | PhysicalFinding | undefined {
  if (kind === 'assumption') return allAssumptions().find(item => item.id === id);
  if (kind === 'modifier') return allModifiers().find(item => item.id === id);
  if (kind === 'physical-finding') return physicalFindings.find(item => item.id === id);
  return allProfiles().find(item => item.id === id);
}

function selectCatalogItem(kind: CatalogRowKind, id: string, settingId?: string): void {
  const item = catalogItem(kind, id);
  if (!item) return;
  if (kind === 'assumption') {
    const assumption = normalizeAssumption(item as PretestAssumption);
    state.selectedConditionId = assumption.conditionId ?? state.selectedConditionId;
    if (assumption.settingId && assumption.settingId !== 'general') state.selectedSettingId = assumption.settingId;
    state.manualPretestPercent = clampProbabilityPercent(assumption.probability * 100);
    state.selectedAssumptionId = assumption.id;
  } else if (kind === 'modifier') {
    const modifier = item as ClinicalModifier;
    state.selectedConditionId = modifier.conditionId;
    state.selectedModifierIds = [...new Set([...state.selectedModifierIds, modifier.id])];
  } else if (kind === 'physical-finding') {
    const finding = item as PhysicalFinding;
    state.appMode = 'physical-exam';
    state.selectedPhysicalSystemId = finding.systemId;
    state.selectedPhysicalConditionId = finding.conditionId;
    state.selectedPhysicalFindingId = finding.id;
    state.physicalPretestPercent = clampProbabilityPercent((finding.pretestRange.low + finding.pretestRange.high) / 2);
  } else {
    const profile = item as EvidenceProfile;
    const test = allTests().find(candidate => candidate.id === profile.testId);
    state.selectedTestId = profile.testId;
    state.selectedEvidenceProfileId = profile.id;
    if (test) state.selectedConditionId = conditionIdForTest(test);
    if (settingId && settingId !== 'general') {
      state.selectedSettingId = settingId;
      const assumption = normalizedAssumptions().find(candidate => candidate.conditionId === state.selectedConditionId && candidate.settingId === settingId);
      if (assumption) {
        state.selectedAssumptionId = assumption.id;
        state.manualPretestPercent = clampProbabilityPercent(assumption.probability * 100);
      }
    }
  }
  setMessage(controls.actionMessage, 'Katalogeintrag im Rechner ausgewählt.');
  saveAndRender();
}

function openCatalogItemForCorrection(kind: CatalogRowKind, id: string): void {
  const item = catalogItem(kind, id);
  if (!item) return;
  if (kind === 'assumption') {
    fillAssumptionForm(normalizeAssumption(item as PretestAssumption));
    state.adminMode = 'assumption';
  } else if (kind === 'modifier') {
    fillModifierForm(item as ClinicalModifier);
    state.adminMode = 'modifier';
  } else if (kind === 'physical-finding') {
    setMessage(controls.actionMessage, 'Korrekturen für McGee-Befunde bitte als JSON-Vorschlag exportieren oder im Repository bearbeiten.');
  } else {
    fillProfileForm(item as EvidenceProfile);
    state.adminMode = 'profile';
  }
  renderDrawer();
}

function cloneAsProposal<T extends PretestAssumption | ClinicalModifier | EvidenceProfile>(item: T): T {
  return {
    ...item,
    id: uniqueId(`proposal-${item.id}`),
    kind: 'custom',
    custom: true,
    isDefault: 'isDefault' in item ? false : undefined,
    rationale: `Vorschlag/Korrektur: ${item.rationale}`,
    lastReviewed: new Date().toISOString().slice(0, 10),
    ...localReviewMetadata(item.evidenceQuality ?? 'expert-opinion', item.dataCompleteness ?? 'partial')
  } as T;
}

function exportCatalogProposal(kind: CatalogRowKind, id: string): void {
  const item = catalogItem(kind, id);
  if (!item) return;
  if (kind === 'physical-finding') {
    const finding = item as PhysicalFinding;
    downloadJson('mcgee-befund-vorschlag.json', {
      schemaVersion: 1,
      type: 'physical-finding-proposal',
      finding: {
        ...finding,
        reviewStatus: 'needs-review',
        reviewNote: `Vorschlag/Korrektur exportiert am ${new Date().toISOString().slice(0, 10)}.`
      }
    });
    setMessage(controls.actionMessage, 'JSON-Vorschlag für körperlichen Befund exportiert.');
    return;
  }
  const proposal = cloneAsProposal(item as PretestAssumption | ClinicalModifier | EvidenceProfile);
  const payload = buildExport(
    [],
    kind === 'profile' ? [proposal as EvidenceProfile] : [],
    kind === 'assumption' ? [proposal as PretestAssumption] : [],
    kind === 'modifier' ? [proposal as ClinicalModifier] : []
  );
  downloadJson('likelihood-ratio-vorschlag-v5.json', payload);
  setMessage(controls.actionMessage, 'JSON-Vorschlag exportiert.');
}

function selectedCatalogParts(): { kind: CatalogRowKind; id: string } | null {
  if (!selectedCatalogRowKey) return null;
  const [kind, id] = selectedCatalogRowKey.split(':');
  if ((kind === 'assumption' || kind === 'modifier' || kind === 'profile' || kind === 'physical-finding') && id) return { kind, id };
  return null;
}

function markSelectedCatalogReviewStatus(reviewStatus: ReviewStatus): void {
  const parts = selectedCatalogParts();
  if (!parts) return;
  const item = catalogItem(parts.kind, parts.id);
  if (!item) return;
  if (parts.kind === 'physical-finding') {
    const finding = item as PhysicalFinding;
    downloadJson('mcgee-review-vorschlag.json', {
      schemaVersion: 1,
      type: 'physical-finding-review-proposal',
      finding: {
        ...finding,
        reviewStatus,
        reviewNote: `Lokale Review-Markierung: ${reviewStatus}. Vor Übernahme in kuratierte Daten fachlich prüfen.`
      }
    });
    setMessage(controls.actionMessage, `Review-Vorschlag für körperlichen Befund als JSON exportiert.`);
    return;
  }
  const proposal = {
    ...cloneAsProposal(item as PretestAssumption | ClinicalModifier | EvidenceProfile),
    reviewStatus,
    reviewNote: `Lokale Review-Markierung: ${reviewStatus}. Vor Übernahme in kuratierte Daten fachlich prüfen.`
  };
  if (parts.kind === 'assumption') state.customAssumptions = [...state.customAssumptions, proposal as PretestAssumption];
  if (parts.kind === 'modifier') state.customModifiers = [...state.customModifiers, proposal as ClinicalModifier];
  if (parts.kind === 'profile') state.customEvidenceProfiles = [...state.customEvidenceProfiles, proposal as EvidenceProfile];
  setMessage(controls.actionMessage, `Katalogeintrag lokal als ${reviewStatus} vorgeschlagen.`);
  saveAndRender();
}

async function copySummary(): Promise<void> {
  const { test, profile, assumption, pretestResolution, result } = currentCalculation();
  const selectedCondition = getSelectedCondition();
  const selectedSetting = getSelectedSetting();
  const mismatch = selectedTestMatchesCondition(test)
    ? ''
    : `Warnung: Test für ${test.condition}, Prätestwahrscheinlichkeit für ${selectedCondition.label}.`;
  const lines = [
    `Setting: ${selectedSetting.label}`,
    `Geprüfte Erkrankung: ${selectedCondition.label}`,
    `Test: ${test.name}`,
    `Evidenzprofil: ${profile.label}`,
    mismatch,
    profile.kind === 'scenario' ? `Szenario-Begründung: ${profile.deviationReason ?? '–'}` : '',
    `Quellen: ${profile.sources.map(source => `${source.title} (${source.year})`).join('; ')}`,
    `Prätest: ${formatPercent(result.pretestProbability)} (${pretestResolution.title}; ${assumption.setting})`,
    `LR+: ${formatRatio(result.lrPositive)} | LR−: ${formatRatio(result.lrNegative)}`,
    `Posttest positiv: ${formatPercent(result.postPositiveProbability)}`,
    `Posttest negativ: ${formatPercent(result.postNegativeProbability)}`,
    `PPV: ${formatPercent(result.ppv)} | NPV: ${formatPercent(result.npv)}`
  ].filter(Boolean);
  await navigator.clipboard.writeText(lines.join('\n'));
  setMessage(controls.actionMessage, 'Kurzbericht kopiert.');
}

async function importUserData(file: File): Promise<void> {
  const parsed = parseUserDataExport(await file.text());
  const testIssues = parsed.customTests.flatMap(test => test.evidenceProfiles.length ? validateDiagnosticTest(test) : []);
  const profileIssues = parsed.customEvidenceProfiles.flatMap(validateEvidenceProfile);
  const assumptionIssues = parsed.customAssumptions.flatMap(validatePretestAssumption);
  const modifierIssues = parsed.customModifiers.flatMap(validateClinicalModifier);
  if (testIssues.length + profileIssues.length + assumptionIssues.length + modifierIssues.length > 0) {
    throw new Error('Import enthält unvollständige oder ungültige Einträge.');
  }
  state.customTests = parsed.customTests;
  state.customEvidenceProfiles = parsed.customEvidenceProfiles;
  state.customAssumptions = parsed.customAssumptions;
  state.customModifiers = parsed.customModifiers;
  state.selectedTestId = parsed.customTests[0]?.id ?? parsed.customEvidenceProfiles[0]?.testId ?? state.selectedTestId;
  state.selectedEvidenceProfileId = parsed.customEvidenceProfiles[0]?.id ?? state.selectedEvidenceProfileId;
  state.selectedAssumptionId = parsed.customAssumptions[0]?.id ?? state.selectedAssumptionId;
  state.selectedModifierIds = parsed.customModifiers[0] ? [parsed.customModifiers[0].id] : state.selectedModifierIds;
  state.selectedConditionId = parsed.customAssumptions[0]?.conditionId ?? parsed.customModifiers[0]?.conditionId ?? state.selectedConditionId;
  state.selectedSettingId =
    parsed.customAssumptions[0]?.settingId && parsed.customAssumptions[0].settingId !== 'general'
      ? parsed.customAssumptions[0].settingId
      : state.selectedSettingId;
  saveAndRender();
}

controls.drawerOpenButton.addEventListener('click', () => openDrawer('data'));
controls.disclaimerToggleButton.addEventListener('click', toggleDisclaimer);
controls.drawerCloseButton.addEventListener('click', closeDrawer);
controls.drawerBackdrop.addEventListener('click', closeDrawer);
controls.catalogFullscreenButton.addEventListener('click', () => {
  state.catalogFullscreen = !state.catalogFullscreen;
  saveAndRender();
});
controls.markCatalogNeedsReviewButton.addEventListener('click', () => markSelectedCatalogReviewStatus('needs-review'));
controls.markCatalogReviewedButton.addEventListener('click', () => markSelectedCatalogReviewStatus('reviewed'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.drawerOpen) closeDrawer();
});
document.querySelectorAll<HTMLButtonElement>('[data-admin-mode]').forEach(button => {
  button.addEventListener('click', () => {
    state.adminMode = button.dataset.adminMode as CalculatorState['adminMode'];
    renderDrawer();
  });
});

controls.diagnosticModeTab.addEventListener('click', () => {
  state.appMode = 'diagnostic-tests';
  saveAndRender();
});
controls.physicalModeTab.addEventListener('click', () => {
  state.appMode = 'physical-exam';
  saveAndRender();
});
physicalControls.systemSelect.addEventListener('change', () => {
  state.selectedPhysicalSystemId = physicalControls.systemSelect.value;
  state.selectedPhysicalConditionId = physicalConditionsForSystem(state.selectedPhysicalSystemId)[0]?.id;
  state.selectedPhysicalFindingId = physicalFindingsForCondition(state.selectedPhysicalConditionId ?? '')[0]?.id;
  saveAndRender();
});
physicalControls.conditionSelect.addEventListener('change', () => {
  state.selectedPhysicalConditionId = physicalControls.conditionSelect.value;
  state.selectedPhysicalFindingId = physicalFindingsForCondition(state.selectedPhysicalConditionId)[0]?.id;
  saveAndRender();
});
physicalControls.findingSelect.addEventListener('change', () => {
  state.selectedPhysicalFindingId = physicalControls.findingSelect.value;
  saveAndRender();
});
physicalControls.pretestRange.addEventListener('input', () => {
  state.physicalPretestPercent = clampProbabilityPercent(Number.parseFloat(physicalControls.pretestRange.value));
  saveAndRender();
});
physicalControls.pretestNumber.addEventListener('input', () => {
  const parsed = parsePretestPercentInput(physicalControls.pretestNumber.value);
  if (parsed == null) return;
  state.physicalPretestPercent = clampProbabilityPercent(parsed);
  saveAndRender();
});
physicalControls.pretestNumber.addEventListener('change', () => {
  const parsed = parsePretestPercentInput(physicalControls.pretestNumber.value);
  state.physicalPretestPercent = parsed == null ? state.physicalPretestPercent : clampProbabilityPercent(parsed);
  saveAndRender();
});
physicalControls.pretestNumber.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const parsed = parsePretestPercentInput(physicalControls.pretestNumber.value);
  state.physicalPretestPercent = parsed == null ? state.physicalPretestPercent : clampProbabilityPercent(parsed);
  physicalControls.pretestNumber.blur();
  saveAndRender();
});

controls.testSelect.addEventListener('change', () => {
  state.selectedTestId = controls.testSelect.value;
  const profiles = profilesForTest(state.selectedTestId);
  state.selectedEvidenceProfileId = profiles.find(profile => profile.isDefault)?.id ?? profiles[0]?.id ?? state.selectedEvidenceProfileId;
  saveAndRender();
});
controls.settingSelect.addEventListener('change', () => {
  state.selectedSettingId = controls.settingSelect.value;
  state.manualPretestPercent = clampProbabilityPercent(resolvePretestAssumption().probability * 100);
  saveAndRender();
});
controls.conditionSelect.addEventListener('change', () => {
  state.selectedConditionId = controls.conditionSelect.value;
  selectDefaultTestForCondition(state.selectedConditionId);
  state.selectedModifierIds = [];
  state.manualPretestPercent = clampProbabilityPercent(resolvePretestAssumption().probability * 100);
  saveAndRender();
});
controls.adminSettingSelect.addEventListener('change', () => {
  state.selectedSettingId = controls.adminSettingSelect.value;
  state.manualPretestPercent = clampProbabilityPercent(resolvePretestAssumption().probability * 100);
  saveAndRender();
});
controls.adminConditionSelect.addEventListener('change', () => {
  state.selectedConditionId = controls.adminConditionSelect.value;
  selectDefaultTestForCondition(state.selectedConditionId);
  state.selectedModifierIds = [];
  state.manualPretestPercent = clampProbabilityPercent(resolvePretestAssumption().probability * 100);
  saveAndRender();
});
controls.adminTestSelect.addEventListener('change', () => {
  state.selectedTestId = controls.adminTestSelect.value;
  const profiles = profilesForTest(state.selectedTestId);
  state.selectedEvidenceProfileId = profiles.find(profile => profile.isDefault)?.id ?? profiles[0]?.id ?? state.selectedEvidenceProfileId;
  saveAndRender();
});
controls.adminProfileSelect.addEventListener('change', () => {
  state.selectedEvidenceProfileId = controls.adminProfileSelect.value;
  saveAndRender();
});
[
  controls.catalogSearchInput,
  controls.catalogDomainFilter,
  controls.catalogConditionFilter,
  controls.catalogSettingFilter,
  controls.catalogTestFilter,
  controls.catalogStatusFilter,
  controls.catalogReviewFilter,
  controls.catalogQualityFilter,
  controls.catalogCompletenessFilter,
  controls.catalogSortSelect
].forEach(control => {
  control.addEventListener(control instanceof HTMLInputElement ? 'input' : 'change', () => {
    saveCatalogFilters();
    selectedCatalogRowKey = '';
    renderDataCatalog();
  });
});

function handleCatalogAction(button: HTMLButtonElement, row?: HTMLTableRowElement): void {
  const kind = (button.dataset.kind ?? row?.dataset.kind) as CatalogRowKind;
  const id = button.dataset.id ?? row?.dataset.id ?? '';
  const settingId = button.dataset.settingId ?? row?.dataset.settingId;
  if (!kind || !id) return;
  if (button.dataset.catalogAction === 'select') selectCatalogItem(kind, id, settingId);
  if (button.dataset.catalogAction === 'correct') openCatalogItemForCorrection(kind, id);
  if (button.dataset.catalogAction === 'export') exportCatalogProposal(kind, id);
}

controls.catalogTableBody.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-catalog-action]');
  const row = (event.target as HTMLElement).closest<HTMLTableRowElement>('tr[data-kind][data-id]');
  if (button && row) {
    handleCatalogAction(button, row);
    return;
  }
  if (!row) return;
  selectedCatalogRowKey = row.dataset.key ?? '';
  renderDataCatalog();
});
controls.catalogDetailPanel.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-catalog-action]');
  if (!button) return;
  handleCatalogAction(button);
});
controls.profileSelect.addEventListener('change', () => {
  state.selectedEvidenceProfileId = controls.profileSelect.value;
  saveAndRender();
});
controls.pretestRange.addEventListener('input', () => {
  state.manualPretestPercent = snapPretestPercent(Number.parseFloat(controls.pretestRange.value));
  saveAndRender();
});
controls.pretestNumber.addEventListener('input', () => {
  const parsed = parsePretestPercentInput(controls.pretestNumber.value);
  if (parsed == null) return;
  state.manualPretestPercent = clampProbabilityPercent(parsed);
  saveAndRender();
});
controls.pretestNumber.addEventListener('change', () => {
  commitPretestNumberInput({ snap: false, render: true });
});
controls.pretestNumber.addEventListener('blur', () => {
  commitPretestNumberInput({ snap: false, render: true });
});
controls.pretestNumber.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitPretestNumberInput({ snap: false, render: true });
    controls.pretestNumber.blur();
  }
});
controls.pretestSuggestionMarker.addEventListener('click', useSuggestedPretest);
controls.diagnosticChainSelect.addEventListener('change', () => {
  state.selectedDiagnosticChainId = controls.diagnosticChainSelect.value;
  saveAndRender();
});
controls.modifierOptions.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (input.type !== 'checkbox') return;
  state.selectedModifierIds = input.checked
    ? [...new Set([...state.selectedModifierIds, input.value])]
    : state.selectedModifierIds.filter(id => id !== input.value);
  saveAndRender();
});
controls.toggleModifierListButton.addEventListener('click', () => {
  state.modifierListExpanded = !state.modifierListExpanded;
  saveAndRender();
});
controls.applyModifiedPretestButton.addEventListener('click', () => {
  const preview = modifierPreviewProbability(currentCalculation().result.pretestProbability, selectedModifiers());
  if (preview == null) return;
  state.manualPretestPercent = clampProbabilityPercent(preview * 100);
  setMessage(controls.actionMessage, 'Modifizierte Prätestwahrscheinlichkeit übernommen.');
  saveAndRender();
});

$('copySummaryButton').addEventListener('click', () => {
  copySummary().catch(() => setMessage(controls.actionMessage, 'Kopieren nicht möglich.', true));
});
controls.nomogramSizeToggle.addEventListener('change', handleNomogramSizeToggle);
$('resetButton').addEventListener('click', () => {
  state = resetStoredState();
  setMessage(controls.actionMessage, 'Rechner zurückgesetzt.');
  render();
});
$('exportButton').addEventListener('click', () => {
  downloadJson(
    'likelihood-ratio-eigene-daten-v4.json',
    buildExport(state.customTests, state.customEvidenceProfiles, state.customAssumptions, state.customModifiers)
  );
  setMessage(controls.actionMessage, 'Eigene Daten exportiert.');
});
$('importButton').addEventListener('click', () => $<HTMLInputElement>('importFile').click());
$<HTMLInputElement>('importFile').addEventListener('change', event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  importUserData(file)
    .then(() => setMessage(controls.actionMessage, 'Eigene Daten importiert.'))
    .catch(error => setMessage(controls.actionMessage, error instanceof Error ? error.message : 'Import fehlgeschlagen.', true));
});
$('clearCustomButton').addEventListener('click', () => {
  state.customTests = [];
  state.customEvidenceProfiles = [];
  state.customAssumptions = [];
  state.customModifiers = [];
  state.selectedModifierIds = [];
  state.selectedTestId = defaultState.selectedTestId;
  state.selectedEvidenceProfileId = defaultState.selectedEvidenceProfileId;
  state.selectedAssumptionId = defaultState.selectedAssumptionId;
  state.selectedSettingId = defaultState.selectedSettingId;
  state.selectedConditionId = defaultState.selectedConditionId;
  setMessage(controls.actionMessage, 'Eigene Daten gelöscht.');
  saveAndRender();
});
$('useOverviewSelectionButton').addEventListener('click', () => {
  setMessage(controls.actionMessage, 'Auswahl ist im Rechner aktiv.');
  saveAndRender();
});
$('copyPretestToFormButton').addEventListener('click', copyCurrentPretestToForm);
$('copyTestToFormButton').addEventListener('click', copyCurrentTestToForm);
$('copyProfileToFormButton').addEventListener('click', copyCurrentProfileToForm);
$('saveCustomTestButton').addEventListener('click', saveCustomTest);
$('saveProfileButton').addEventListener('click', () => saveProfile('custom'));
$('saveScenarioButton').addEventListener('click', () => saveProfile('scenario'));
$('saveCustomAssumptionButton').addEventListener('click', saveCustomAssumption);
$('saveModifierButton').addEventListener('click', saveModifier);
['profileSensitivity', 'profileSpecificity', 'scenarioSensitivity', 'scenarioSpecificity', 'scenarioReason'].forEach(id => {
  $(id).addEventListener('input', () => {
    renderProfilePreview();
    renderScenarioPreview();
  });
});

window.addEventListener('resize', () => {
  drawNomogram(currentCalculation().result);
  renderPhysicalMain();
});

render();
