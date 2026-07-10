import { chainPathFinalProbability, type DiagnosticChainPath, type DiagnosticChainViewModel } from '../app/diagnosticChains';
import { formatPercent } from '../lib/calculations';

function resultLabel(path: DiagnosticChainPath): string {
  const first = path.firstResultLabel === 'positiv' ? 'Test 1 positiv' : 'Test 1 negativ';
  if (path.secondResultLabel == null) return `${first} → stoppen`;
  const second = path.secondResultLabel === 'positiv' ? 'Test 2 positiv' : 'Test 2 negativ';
  return `${first} → ${second}`;
}

function pathNoteKey(path: DiagnosticChainPath): string {
  const first = path.firstResultLabel === 'positiv' ? 'pos' : 'neg';
  if (path.secondResultLabel == null) return `${first}-stop`;
  const second = path.secondResultLabel === 'positiv' ? 'pos' : 'neg';
  return `${first}-${second}`;
}

export function renderDiagnosticChains(
  container: HTMLElement,
  viewModels: DiagnosticChainViewModel[],
  startPretestProbability: number
): void {
  container.textContent = '';
  if (viewModels.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Für diese Erkrankung und dieses Setting ist noch keine kuratierte Diagnostikkette hinterlegt.';
    container.append(empty);
    return;
  }

  viewModels.forEach(viewModel => {
    const card = document.createElement('article');
    card.className = 'chain-card';

    const heading = document.createElement('div');
    heading.className = 'chain-heading';
    const title = document.createElement('h3');
    title.textContent = viewModel.chain.label;
    const status = document.createElement('span');
    status.className = 'badge badge-warning';
    status.textContent = viewModel.chain.reviewStatus;
    heading.append(title, status);

    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = `${viewModel.chain.description} Start-Prätest: ${formatPercent(startPretestProbability)}.`;

    const stages = document.createElement('ol');
    stages.className = 'chain-stages';
    viewModel.stages.slice(0, 2).forEach(stage => {
      const item = document.createElement('li');
      item.textContent = `${stage.label}: ${stage.test.name} (${stage.profile.label})`;
      stages.append(item);
    });

    const table = document.createElement('table');
    table.className = 'chain-table';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Pfad', 'Posttestwahrscheinlichkeit nach Test 1', 'Posttestwahrscheinlichkeit nach Test 2'].forEach(label => {
      const cell = document.createElement('th');
      cell.textContent = label;
      headRow.append(cell);
    });
    head.append(headRow);
    const body = document.createElement('tbody');
    viewModel.paths.forEach(path => {
      const row = document.createElement('tr');
      const finalProbability = chainPathFinalProbability(path);
      const note = path.note ?? viewModel.chain.pathNotes?.[pathNoteKey(path)];
      const pathCell = document.createElement('td');
      const pathLabel = document.createElement('strong');
      pathLabel.textContent = resultLabel(path);
      pathCell.append(pathLabel);
      if (note) {
        const noteElement = document.createElement('small');
        noteElement.className = 'muted chain-path-note';
        noteElement.textContent = note;
        pathCell.append(noteElement);
      }
      const firstCell = document.createElement('td');
      firstCell.textContent = formatPercent(path.intermediateProbability);
      const secondCell = document.createElement('td');
      secondCell.textContent = path.status === 'stopped'
        ? 'nicht durchgeführt'
        : formatPercent(finalProbability);
      row.classList.toggle('chain-path-stopped', path.status === 'stopped');
      row.append(pathCell, firstCell, secondCell);
      body.append(row);
    });
    table.append(head, body);

    const limitations = document.createElement('p');
    limitations.className = 'chain-limitations';
    limitations.textContent = `Grenzen: ${viewModel.chain.limitations}`;

    card.append(heading, description, stages, table, limitations);
    container.append(card);
  });
}
