/* =============================================================
   script.js — Calculadora Estadística (Datos Agrupados)
   ============================================================= */

'use strict';

const $ = (id) => document.getElementById(id);
const tableBody    = $('tableBody');
const resultN      = $('resultN');
const resultMedia  = $('resultMedia');
const resultMediana = $('resultMediana');
const resultModa   = $('resultModa');
const resultRango  = $('resultRango');
const pasoContent  = $('pasoContent');
const interpContent  = $('interpretationContent');
const errorContainer = $('errorContainer');
const verifiedBadge  = $('verifiedBadge');

const btnExample   = $('btnExample');
const btnAddRow    = $('btnAddRow');
const btnDeleteRow = $('btnDeleteRow');
const btnClear     = $('btnClear');
const btnPDF       = $('btnPDF');
const btnTutorial  = $('btnTutorial');
const themeToggle  = $('themeToggle');

const EXAMPLE_DATA = [
  { li: 2, ls: 4, fi: 6  }, { li: 5, ls: 7, fi: 9  },
  { li: 8, ls: 10, fi: 15 }, { li: 11, ls: 13, fi: 12 },
  { li: 14, ls: 16, fi: 8  },
];

let prevValues = {};

function init() {
  initCanvas();
  loadSavedData();
  bindEvents();
  applyTheme();
  initTutorial();
}

function bindEvents() {
  btnExample.addEventListener('click', loadExample);
  btnAddRow.addEventListener('click', () => addRow());
  btnDeleteRow.addEventListener('click', deleteLastRow);
  btnClear.addEventListener('click', clearTable);
  btnPDF.addEventListener('click', exportPDF);
  btnTutorial.addEventListener('click', showTutorial);
  themeToggle.addEventListener('click', toggleTheme);
  window.addEventListener('resize', () => { if (window.canvas) resizeCanvas(); });
}

/* ===== Animated Background (lightweight) ===== */
let canvas, ctx, particles = [];

function initCanvas() {
  canvas = $('mathCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  const count = window.innerWidth < 600 ? 25 : 50;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.3 + 0.05,
    });
  }
  animateCanvas();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const color = isDark ? '37, 99, 235' : '37, 99, 235';

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
    ctx.fill();
  });

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(${color}, ${(1 - dist / 100) * 0.08})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animateCanvas);
}

/* ===== Table Management ===== */
function createRow(li = '', ls = '', fi = '') {
  const tr = document.createElement('tr');
  const sanitize = (v) => { if (v === '' || v == null) return ''; const n = Number(v); return !isNaN(n) && isFinite(n) ? String(n) : String(v); };

  [
    { t: 'input', v: sanitize(li), cls: 'input-li' },
    { t: 'input', v: sanitize(ls), cls: 'input-ls' },
    { t: 'input', v: sanitize(fi), cls: 'input-fi' },
    { t: 'ro', v: '0' }, { t: 'ro', v: '0' },
  ].forEach(cell => {
    const td = document.createElement('td');
    if (cell.t === 'input') {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'decimal';
      inp.className = cell.cls; inp.value = cell.v;
      inp.addEventListener('input', onCellInput);
      inp.addEventListener('keydown', preventNonNumeric);
      td.appendChild(inp);
    } else {
      td.className = 'readonly';
      td.textContent = cell.v;
    }
    tr.appendChild(td);
  });
  return tr;
}

function addRow(li, ls, fi) {
  tableBody.appendChild(createRow(li, ls, fi));
  computeAll();
}

function deleteLastRow() {
  if (!tableBody.children.length) return;
  tableBody.removeChild(tableBody.lastElementChild);
  computeAll();
}

function clearTable() {
  tableBody.innerHTML = '';
  renderEmptyState();
  saveToStorage();
}

function loadExample() {
  tableBody.innerHTML = '';
  EXAMPLE_DATA.forEach(d => tableBody.appendChild(createRow(d.li, d.ls, d.fi)));
  computeAll();
}

function getRows() {
  const result = [];
  tableBody.querySelectorAll('tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    if (inputs.length < 3) return;
    const li = parseFloat(inputs[0].value);
    const ls = parseFloat(inputs[1].value);
    const fi = parseFloat(inputs[2].value);
    if (isNaN(li) || isNaN(ls) || isNaN(fi)) return;
    result.push({ li, ls, fi });
  });
  return result;
}

/* ===== Input Validation ===== */
function preventNonNumeric(e) {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'];
  if (allowed.includes(e.key)) return;
  if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e') { e.preventDefault(); return; }
  if (e.key < '0' || e.key > '9') e.preventDefault();
}

function onCellInput() {
  this.value = this.value.replace(/[^0-9.]/g, '');
  const parts = this.value.split('.');
  if (parts.length > 2) this.value = parts[0] + '.' + parts.slice(1).join('');
  computeAll();
}

function fmt(v, d = 2) {
  if (v === null || v === undefined || isNaN(v)) return null;
  return Number(v.toFixed(d));
}

/* ===== Core Computation ===== */
function computeAll() {
  const rawRows = getRows();
  const errors = validateRows(rawRows);

  if (errors.length) {
    renderErrors(errors);
    verifiedBadge.style.display = 'none';
    return;
  }
  errorContainer.style.display = 'none';

  if (!rawRows.length) {
    renderEmptyState();
    return;
  }

  const rows = rawRows.map(r => ({ ...r }));
  rows.forEach(r => { r.mc = (r.li + r.ls) / 2; });
  let acc = 0;
  rows.forEach(r => { acc += r.fi; r.fa = acc; });
  rows.forEach(r => { r.fixmc = r.fi * r.mc; });

  const N = rows.reduce((s, r) => s + r.fi, 0);
  const sumFixMc = rows.reduce((s, r) => s + r.fixmc, 0);
  const media = N !== 0 ? sumFixMc / N : 0;

  const minLi = Math.min(...rows.map(r => r.li));
  const maxLs = Math.max(...rows.map(r => r.ls));
  const rango = maxLs - minLi;

  const gaps = [];
  for (let i = 0; i < rows.length - 1; i++) gaps.push(rows[i + 1].li - rows[i].ls);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const cVals = rows.map(r => r.ls - r.li);
  const c = cVals.length ? cVals.reduce((a, b) => a + b, 0) / cVals.length + avgGap : 0;

  let mediana = null, medianaIdx = -1, medianaPrevFa = 0;
  if (N > 0) {
    const half = N / 2;
    let prevFa = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].fa >= half) {
        mediana = rows[i].li + ((half - prevFa) / rows[i].fi) * c;
        medianaIdx = i;
        medianaPrevFa = prevFa;
        break;
      }
      prevFa = rows[i].fa;
    }
  }

  let moda = null, modaIdx = -1, d1 = 0, d2 = 0, fAntModal = 0, fSigModal = 0;
  const maxFi = Math.max(...rows.map(r => r.fi));
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].fi === maxFi) {
      const fm = rows[i].fi;
      fAntModal = i > 0 ? rows[i - 1].fi : 0;
      fSigModal = i < rows.length - 1 ? rows[i + 1].fi : 0;
      d1 = fm - fAntModal;
      d2 = fm - fSigModal;
      moda = d1 + d2 !== 0 ? rows[i].li + (d1 / (d1 + d2)) * c : rows[i].li;
      modaIdx = i;
      break;
    }
  }

  const result = {
    rows, N, sumFixMc, media, mediana, moda, rango, c,
    medianaIdx, modaIdx, maxLs, minLi,
    medianaPrevFa, d1, d2, fAntModal, fSigModal,
  };

  tableBody.querySelectorAll('tr').forEach((tr, i) => {
    if (i < rows.length) {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 5) {
        tds[3].textContent = rows[i].fa;
        tds[4].textContent = fmt(rows[i].mc, 2) ?? '—';
      }
    }
  });

  renderResults(result);
  renderPasoAPaso(result);
  highlightTableRows(result);
  renderInterpretation(result);
  showVerifiedBadge();
  saveToStorage();
}

/* ===== Validation ===== */
function validateRows(rows) {
  const errors = [];
  rows.forEach((r, i) => {
    if (r.li > r.ls) errors.push(`Fila ${i + 1}: Li (${r.li}) no puede ser mayor que Ls (${r.ls}).`);
    if (r.fi <= 0) errors.push(`Fila ${i + 1}: fi (${r.fi}) debe ser un número positivo.`);
    if (r.ls < 0) errors.push(`Fila ${i + 1}: Ls (${r.ls}) no puede ser negativo.`);
  });
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].ls >= rows[i + 1].li) {
      errors.push(`Los intervalos de las filas ${i + 1} y ${i + 2} se superponen (${rows[i].ls} ≥ ${rows[i + 1].li}).`);
    }
  }
  return errors;
}

function renderErrors(errors) {
  errorContainer.style.display = 'block';
  errorContainer.innerHTML = errors.map(e =>
    `<div class="error-msg"><i class="fas fa-exclamation-triangle"></i>${e}</div>`
  ).join('');
  [resultN, resultMedia, resultMediana, resultModa, resultRango].forEach(el => el.textContent = '—');
  pasoContent.innerHTML = '<p class="empty-state">Corrige los errores para ver el desarrollo paso a paso.</p>';
  interpContent.innerHTML = '<p class="empty-state">Corrige los errores para ver la interpretación.</p>';
  document.querySelectorAll('#dataTable tbody tr').forEach(tr => tr.classList.remove('row-mediana', 'row-moda'));
  verifiedBadge.style.display = 'none';
}

function renderEmptyState() {
  [resultN, resultMedia, resultMediana, resultModa, resultRango].forEach(el => el.textContent = '—');
  pasoContent.innerHTML = '<p class="empty-state">Ingresa datos en la tabla para ver el desarrollo paso a paso.</p>';
  interpContent.innerHTML = '<p class="empty-state">Ingresa datos en la tabla para ver la interpretación de los resultados.</p>';
  verifiedBadge.style.display = 'none';
}

/* ===== Render Results ===== */
function renderResults(r) {
  const vals = {
    resultN:       fmt(r.N, 0) ?? '—',
    resultMedia:   fmt(r.media) ?? '—',
    resultMediana: fmt(r.mediana) ?? '—',
    resultModa:    fmt(r.moda) ?? '—',
    resultRango:   fmt(r.rango) ?? '—',
  };
  [resultN, resultMedia, resultMediana, resultModa, resultRango].forEach(el => {
    const nv = vals[el.id];
    if (nv !== prevValues[el.id]) {
      el.textContent = nv;
      el.classList.remove('updating');
      void el.offsetWidth;
      el.classList.add('updating');
    }
    prevValues[el.id] = nv;
  });
}

/* ===== Render Desarrollo Paso a Paso ===== */
function renderPasoAPaso(r) {
  const { rows, N, sumFixMc, media, mediana, moda, rango, c, medianaIdx, modaIdx, maxLs, minLi, medianaPrevFa, d1, d2, fAntModal, fSigModal } = r;
  const f = (v) => v !== null && !isNaN(v) ? v.toFixed(2) : '—';
  let html = '';

  /* ---- 1. Media ---- */
  html += `<div class="paso-step">
    <div class="paso-step-title"><span class="step-num">1</span> Media Aritmética</div>`;

  /* List fi×Mc values */
  const fixmcParts = rows.map(r => r.fixmc);
  html += `<div class="paso-line">Valores de f<sub>i</sub> × Mc: <span class="hl-pink">${fixmcParts.map(v => f(v)).join(', ')}</span></div>`;
  html += `<div class="paso-line">Σ(f<sub>i</sub> × Mc) = <span class="hl-pink">${fixmcParts.map(v => f(v)).join(' + ')}</span> = <span class="hl-blue">${f(sumFixMc)}</span></div>`;
  html += `<div class="paso-line">N = Σ f<sub>i</sub> = <span class="hl-blue">${N}</span></div>`;
  html += `<div class="paso-line">Media = <span class="hl-pink">${f(sumFixMc)}</span> ÷ <span class="hl-blue">${N}</span></div>`;
  html += `<div class="paso-result">Media = ${f(media)}</div></div>`;

  /* ---- 2. Mediana ---- */
  const n2 = N / 2;
  html += `<div class="paso-step">
    <div class="paso-step-title"><span class="step-num">2</span> Mediana</div>
    <div class="paso-line">N = <span class="hl-blue">${N}</span></div>
    <div class="paso-line">N/2 = <span class="hl-blue">${f(n2, 1)}</span></div>`;

  if (medianaIdx >= 0) {
    const mcRow = rows[medianaIdx];
    html += `<div class="paso-info median-class"><i class="fas fa-medal"></i> La frecuencia acumulada que contiene el valor ${f(n2, 1)} corresponde a la clase mediana: [${mcRow.li} – ${mcRow.ls}] (fila ${medianaIdx + 1})</div>`;
    html += `<div class="paso-line">Md = L<sub>i</sub> + ((N/2 − F<sub>a-1</sub>) / f<sub>i</sub>) × c</div>`;
    html += `<div class="paso-line">Md = <span class="hl-turquoise">${mcRow.li}</span> + ((<span class="hl-blue">${f(n2, 1)}</span> − <span class="hl-purple">${medianaPrevFa}</span>) / <span class="hl-green">${mcRow.fi}</span>) × <span class="hl-orange">${f(c)}</span></div>`;
    html += `<div class="paso-line">Md = ${mcRow.li} + (<span class="hl-blue">${f(n2 - medianaPrevFa, 1)}</span> / <span class="hl-green">${mcRow.fi}</span>) × ${f(c)}</div>`;
    html += `<div class="paso-result">Md = ${f(mediana)}</div>`;
  }
  html += `</div>`;

  /* ---- 3. Moda ---- */
  html += `<div class="paso-step">
    <div class="paso-step-title"><span class="step-num">3</span> Moda</div>`;
  html += `<div class="paso-line">Frecuencia mayor (f<sub>m</sub>) = <span class="hl-green">${Math.max(...rows.map(r => r.fi))}</span></div>`;

  if (modaIdx >= 0) {
    const moRow = rows[modaIdx];
    html += `<div class="paso-info modal-class"><i class="fas fa-bullseye"></i> Clase modal: [${moRow.li} – ${moRow.ls}] (fila ${modaIdx + 1})</div>`;
    html += `<div class="paso-line">f<sub>m</sub> = <span class="hl-green">${moRow.fi}</span> &nbsp;|&nbsp; f<sub>anterior</sub> = <span class="hl-purple">${fAntModal}</span> &nbsp;|&nbsp; f<sub>siguiente</sub> = <span class="hl-orange">${fSigModal}</span></div>`;
    html += `<div class="paso-line">d₁ = f<sub>m</sub> − f<sub>anterior</sub> = <span class="hl-green">${moRow.fi}</span> − <span class="hl-purple">${fAntModal}</span> = <span class="hl-turquoise">${d1}</span></div>`;
    html += `<div class="paso-line">d₂ = f<sub>m</sub> − f<sub>siguiente</sub> = <span class="hl-green">${moRow.fi}</span> − <span class="hl-orange">${fSigModal}</span> = <span class="hl-turquoise">${d2}</span></div>`;
    html += `<div class="paso-line">M<sub>o</sub> = L<sub>i</sub> + (d₁ / (d₁ + d₂)) × c</div>`;
    html += `<div class="paso-line">M<sub>o</sub> = <span class="hl-turquoise">${moRow.li}</span> + (<span class="hl-turquoise">${d1}</span> / (<span class="hl-turquoise">${d1}</span> + <span class="hl-turquoise">${d2}</span>)) × <span class="hl-orange">${f(c)}</span></div>`;
    html += `<div class="paso-result">M<sub>o</sub> = ${f(moda)}</div>`;
  }
  html += `</div>`;

  /* ---- 4. Rango ---- */
  html += `<div class="paso-step">
    <div class="paso-step-title"><span class="step-num">4</span> Rango</div>
    <div class="paso-line">R = L<sub>s</sub><sup>máx</sup> − L<sub>i</sub><sup>mín</sup></div>
    <div class="paso-line">R = <span class="hl-orange">${maxLs}</span> − <span class="hl-purple">${minLi}</span></div>
    <div class="paso-result">R = ${f(rango)}</div>
  </div>`;

  pasoContent.innerHTML = html;
}

/* ===== Highlight Rows ===== */
function highlightTableRows(r) {
  const trs = tableBody.querySelectorAll('tr');
  trs.forEach(tr => tr.classList.remove('row-mediana', 'row-moda'));
  if (r.medianaIdx >= 0 && trs[r.medianaIdx]) trs[r.medianaIdx].classList.add('row-mediana');
  if (r.modaIdx >= 0 && trs[r.modaIdx]) trs[r.modaIdx].classList.add('row-moda');
}

/* ===== Render Interpretation ===== */
function renderInterpretation(r) {
  const f = (v) => v !== null && !isNaN(v) ? v.toFixed(2) : '—';
  const N = r.N;

  const html = `<div class="interp-grid">
    <div class="interp-card">
      <h4><i class="fas fa-database" style="color:var(--electric-blue)"></i> Total de Datos (N)</h4>
      <span class="interp-value" style="color:var(--electric-blue)">${N}</span>
      <p>Se tienen <strong>${N} datos</strong> en total, distribuidos en ${r.rows.length} intervalos.</p>
    </div>
    <div class="interp-card">
      <h4><i class="fas fa-chart-line" style="color:#ec4899"></i> Media Aritmética (x̄)</h4>
      <span class="interp-value" style="color:#ec4899">${f(r.media)}</span>
      <p>El valor promedio de los datos es <strong>${f(r.media)}</strong>. Representa el centro de gravedad de la distribución.</p>
    </div>
    <div class="interp-card">
      <h4><i class="fas fa-medal" style="color:var(--turquoise)"></i> Mediana (Md)</h4>
      <span class="interp-value" style="color:var(--turquoise)">${f(r.mediana)}</span>
      <p>El 50% de los datos están por debajo de <strong>${f(r.mediana)}</strong> y el 50% por encima.</p>
    </div>
    <div class="interp-card">
      <h4><i class="fas fa-bullseye" style="color:#10b981"></i> Moda (Mo)</h4>
      <span class="interp-value" style="color:#10b981">${f(r.moda)}</span>
      <p>El valor más frecuente es <strong>${f(r.moda)}</strong>, correspondiente al intervalo con mayor frecuencia.</p>
    </div>
    <div class="interp-card">
      <h4><i class="fas fa-ruler-combined" style="color:#f59e0b"></i> Rango (R)</h4>
      <span class="interp-value" style="color:#f59e0b">${f(r.rango)}</span>
      <p>La amplitud total de los datos es <strong>${f(r.rango)}</strong>, desde ${r.minLi} hasta ${r.maxLs}.</p>
    </div>
  </div>`;
  interpContent.innerHTML = html;
}

/* ===== Verified Badge ===== */
let badgeTimeout = null;
function showVerifiedBadge() {
  verifiedBadge.style.display = 'flex';
  clearTimeout(badgeTimeout);
  badgeTimeout = setTimeout(() => { verifiedBadge.style.display = 'none'; }, 2500);
}

/* ===== LocalStorage ===== */
function saveToStorage() {
  localStorage.setItem('statCalcData', JSON.stringify(getRows()));
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem('statCalcData');
    if (!saved) { loadExample(); return; }
    const data = JSON.parse(saved);
    if (!data.length) { loadExample(); return; }
    data.forEach(d => tableBody.appendChild(createRow(d.li, d.ls, d.fi)));
    computeAll();
  } catch (_) { loadExample(); }
}

/* ===== Tutorial ===== */
let tutorialStep = 0;
const TUTORIAL_STEPS = 4;

function initTutorial() {
  if (!localStorage.getItem('statCalcTutorial')) {
    setTimeout(showTutorial, 600);
    localStorage.setItem('statCalcTutorial', '1');
  }
}

function showTutorial() {
  $('tutorialOverlay').style.display = 'flex';
  tutorialStep = 0;
  renderTutorialStep();
}

function renderTutorialStep() {
  document.querySelectorAll('.tutorial-step').forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === tutorialStep));
  $('tutorialPrev').style.display = tutorialStep === 0 ? 'none' : 'inline-flex';
  $('tutorialNext').innerHTML = tutorialStep === TUTORIAL_STEPS - 1
    ? 'Comenzar <i class="fas fa-check"></i>'
    : 'Siguiente <i class="fas fa-arrow-right"></i>';

  $('tutorialDots').innerHTML = '';
  for (let i = 0; i < TUTORIAL_STEPS; i++) {
    const d = document.createElement('span');
    d.className = 'tutorial-dot' + (i === tutorialStep ? ' active' : '');
    $('tutorialDots').appendChild(d);
  }
}

$('tutorialNext').addEventListener('click', () => {
  if (tutorialStep < TUTORIAL_STEPS - 1) { tutorialStep++; renderTutorialStep(); }
  else { $('tutorialOverlay').style.display = 'none'; }
});

$('tutorialPrev').addEventListener('click', () => {
  if (tutorialStep > 0) { tutorialStep--; renderTutorialStep(); }
});

$('tutorialSkip').addEventListener('click', () => {
  $('tutorialOverlay').style.display = 'none';
});

/* ===== Theme ===== */
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  $('themeToggle').querySelector('i').className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function applyTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  $('themeToggle').querySelector('i').className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

/* ===== PDF Export ===== */
function exportPDF() {
  const el = document.createElement('div');
  el.style.cssText = 'padding:40px;background:#fff;color:#1e293b;font-family:Inter,sans-serif;';

  let tableRows = '';
  tableBody.querySelectorAll('tr').forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 5) {
        const vals = [];
        tds.forEach(td => { const inp = td.querySelector('input'); vals.push(inp ? inp.value : td.textContent); });
      tableRows += `<tr>${vals.map(v => `<td style="padding:6px 8px;border:1px solid #e2e8f0;">${v}</td>`).join('')}</tr>`;
    }
  });

  el.innerHTML = `
    <h1 style="text-align:center;color:#2563EB;font-size:26px;">Calculadora Estadística</h1>
    <p style="text-align:center;color:#64748B;font-size:14px;">Datos Agrupados en Intervalos</p>
    <hr style="border:1px solid #e2e8f0;margin:16px 0;">
    <h3 style="color:#0F172A;">Integrantes</h3>
    <ul style="color:#334155;">
      <li>José Martín Chirino Simón</li>
      <li>Joshua Emanuel Osorio Franco</li>
      <li>Natanael Molina Fuentes</li>
      <li>Marco Antonio Ramírez Hidalgo</li>
    </ul>
    <p style="color:#94A3B8;"><em>Proyecto Final de Matemáticas</em></p>
    <hr style="border:1px solid #e2e8f0;margin:16px 0;">
    <h3 style="color:#0F172A;">Tabla de Frecuencias</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;text-align:center;font-size:12px;">
      <thead><tr style="background:#2563EB;color:#fff;"><th>Li</th><th>Ls</th><th>fi</th><th>Fa</th><th>Mc</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <hr style="border:1px solid #e2e8f0;margin:16px 0;">
    <h3 style="color:#0F172A;">Resultados</h3>
    <p><b>Media:</b> ${resultMedia.textContent} &nbsp; <b>Mediana:</b> ${resultMediana.textContent} &nbsp; <b>Moda:</b> ${resultModa.textContent} &nbsp; <b>Rango:</b> ${resultRango.textContent}</p>
    <hr style="border:1px solid #e2e8f0;margin:16px 0;">
    <p style="text-align:center;color:#94A3B8;font-size:10px;">Generado por Calculadora Estadística — ${new Date().toLocaleDateString('es-MX')}</p>`;

  document.body.appendChild(el);
  html2pdf().set({ margin: [10,10,10,10], filename: 'resultados_estadisticos.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(el).save().then(() => document.body.removeChild(el)).catch(() => document.body.removeChild(el));
}

document.addEventListener('DOMContentLoaded', init);
