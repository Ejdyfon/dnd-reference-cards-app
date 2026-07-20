import { fetchClassSpells, searchSpells, normalizeSpell, normalizeCustomSpell } from './api.js';
import { CLASS_LIST, getThemeForClass } from './class-themes.js';
import { renderSpellCards, renderCardBack } from './card-renderer.js';

const STORAGE_KEY = 'dnd-custom-spells';

let allLoadedSpells = [];
let customSpells = loadCustomSpells();
let selectedKeys = new Set();
let activeClassKey = CLASS_LIST[0].key;
let searchTimer = null;
let editingCustomId = null;

function loadCustomSpells() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}
function saveCustomSpells() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customSpells));
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function setLoading(on) {
  const el = document.getElementById('spell-list-content');
  if (on) {
    el.innerHTML = '<div class="loading-spinner">Loading spells…</div>';
  }
}

function buildSpellList() {
  const container = document.getElementById('spell-list-content');
  container.innerHTML = '';

  const groups = {};
  for (const spell of allLoadedSpells) {
    const g = spell.levelLabel;
    if (!groups[g]) groups[g] = [];
    groups[g].push(spell);
  }

  const levelOrder = ['Cantrip', ...Array.from({length: 9}, (_, i) => {
    const s = ['st','nd','rd'][i] ?? 'th';
    return `${i+1}${s}-level`;
  })];

  for (const grp of levelOrder) {
    if (!groups[grp]) continue;
    const header = document.createElement('div');
    header.className = 'spell-group-header';
    header.textContent = grp;
    container.appendChild(header);

    for (const spell of groups[grp]) {
      container.appendChild(makeSpellItem(spell, false));
    }
  }

  if (customSpells.length > 0) {
    const header = document.createElement('div');
    header.className = 'spell-group-header';
    header.textContent = 'Custom Spells';
    container.appendChild(header);
    for (const spell of customSpells) {
      container.appendChild(makeSpellItem(spell, true));
    }
  }

  updateSpellCount();
}

function makeSpellItem(spell, isCustom) {
  const item = document.createElement('div');
  item.className = 'spell-item';
  item.dataset.key = spell.id;

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = selectedKeys.has(spell.id);
  cb.addEventListener('change', () => {
    if (cb.checked) selectedKeys.add(spell.id);
    else selectedKeys.delete(spell.id);
    updateSpellCount();
  });

  const name = document.createElement('span');
  name.className = 'spell-item-name';
  name.textContent = spell.name;

  const level = document.createElement('span');
  level.className = 'spell-item-level';
  level.textContent = spell.levelLabel;

  item.appendChild(cb);
  item.appendChild(name);
  item.appendChild(level);

  if (isCustom) {
    const badge = document.createElement('span');
    badge.className = 'spell-item-custom';
    badge.textContent = 'custom';
    item.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'spell-item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); editCustomSpell(spell.id); });
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteCustomSpell(spell.id); });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    item.appendChild(actions);
  }

  item.addEventListener('click', (e) => {
    if (e.target === cb || e.target.closest('.spell-item-actions')) return;
    cb.checked = !cb.checked;
    if (cb.checked) selectedKeys.add(spell.id);
    else selectedKeys.delete(spell.id);
    updateSpellCount();
  });

  return item;
}

function updateSpellCount() {
  document.getElementById('spell-count').textContent =
    `${selectedKeys.size} selected`;
}

function getSpellById(id) {
  const api = allLoadedSpells.find((s) => s.id === id);
  if (api) return api;
  return customSpells.find((s) => s.id === id);
}

function appendPairedPrintCards(frontsSheet, backsSheet, spellCards, classKey, customAccent) {
  for (let i = 0; i < spellCards.length; i += 2) {
    frontsSheet.appendChild(spellCards[i]);

    if (i + 1 < spellCards.length) {
      // Next continuation page goes on the reverse of the same physical card
      backsSheet.appendChild(spellCards[i + 1]);
    } else {
      // Odd page out — standard class-themed back
      backsSheet.appendChild(renderCardBack(classKey, customAccent));
    }
  }
}

function generatePreview() {
  const fronts = document.getElementById('card-sheet-fronts');
  const backs = document.getElementById('card-sheet-backs');
  const printHint = document.getElementById('print-hint');
  fronts.innerHTML = '';
  backs.innerHTML = '';

  const ids = [...selectedKeys];
  if (ids.length === 0) {
    document.getElementById('preview-empty').style.display = 'flex';
    printHint.hidden = true;
    return;
  }
  document.getElementById('preview-empty').style.display = 'none';
  printHint.hidden = false;

  let spellPages = 0;
  let physicalCards = 0;

  for (const id of ids) {
    const spell = getSpellById(id);
    if (!spell) continue;
    const classKey = spell.source === 'custom'
      ? (spell.classKey || 'custom')
      : activeClassKey;
    const spellCards = renderSpellCards(spell, classKey, spell.customAccent);
    spellPages += spellCards.length;
    physicalCards += Math.ceil(spellCards.length / 2);
    appendPairedPrintCards(fronts, backs, spellCards, classKey, spell.customAccent);
  }

  printHint.innerHTML = `
    <strong>Print tips (A4 only)</strong>
    — this layout uses <strong>${physicalCards} physical card${physicalCards === 1 ? '' : 's'}</strong>
    for ${spellPages} spell page${spellPages === 1 ? '' : 's'}
    (multi-page spells are paired front/back to save paper).
    <ul>
      <li><strong>Paper:</strong> A4 only (do not use Letter).</li>
      <li><strong>Margins:</strong> None or Minimum in the browser dialog — the page already uses 8&nbsp;mm. Avoid larger margins or the bottom row may clip.</li>
      <li><strong>Scale:</strong> 100% / Actual size — never “Fit to page.”</li>
      <li><strong>Sides:</strong> Double-sided, flip on <strong>long edge</strong>.</li>
      <li><strong>Background graphics:</strong> On (so parchment and borders print).</li>
      <li>Cut on card edges after printing; optional: cardstock ~200–250&nbsp;gsm.</li>
    </ul>
  `;
}

async function loadClassSpells() {
  const cls = CLASS_LIST.find((c) => c.key === activeClassKey);
  if (!cls) return;
  setLoading(true);
  selectedKeys.clear();
  allLoadedSpells = [];
  try {
    const raw = await fetchClassSpells(cls.apiKey);
    allLoadedSpells = raw.map((r) => normalizeSpell(r));
    allLoadedSpells.forEach((s) => selectedKeys.add(s.id));
  } catch (err) {
    showError(`Failed to load spells: ${err.message}`);
  }
  buildSpellList();
}

async function doSearch(query) {
  if (!query.trim()) {
    buildSpellList();
    return;
  }
  setLoading(true);
  try {
    const raw = await searchSpells(query);
    allLoadedSpells = raw.map((r) => normalizeSpell(r));
  } catch (err) {
    showError(`Search failed: ${err.message}`);
  }
  buildSpellList();
}

function selectAll() {
  const items = document.querySelectorAll('.spell-item input[type="checkbox"]');
  items.forEach((cb) => {
    cb.checked = true;
    selectedKeys.add(cb.closest('.spell-item').dataset.key);
  });
  updateSpellCount();
}

function selectNone() {
  const items = document.querySelectorAll('.spell-item input[type="checkbox"]');
  items.forEach((cb) => {
    cb.checked = false;
    selectedKeys.delete(cb.closest('.spell-item').dataset.key);
  });
  updateSpellCount();
}

/* ── Custom spell form ───────────────────────────────────────── */
function getFormData() {
  return {
    name: document.getElementById('cf-name').value,
    level: document.getElementById('cf-level').value,
    school: document.getElementById('cf-school').value,
    range: document.getElementById('cf-range').value,
    castTime: document.getElementById('cf-casttime').value,
    duration: document.getElementById('cf-duration').value,
    verbal: document.getElementById('cf-verbal').checked,
    somatic: document.getElementById('cf-somatic').checked,
    material: document.getElementById('cf-material').checked,
    materialText: document.getElementById('cf-material-text').value,
    desc: document.getElementById('cf-desc').value,
    higherLevel: document.getElementById('cf-higher').value,
    classKey: document.getElementById('cf-class').value,
    customAccent: document.getElementById('cf-color-override').checked
      ? document.getElementById('cf-color').value
      : null,
    concentration: document.getElementById('cf-concentration').checked,
    ritual: document.getElementById('cf-ritual').checked,
  };
}

function clearForm() {
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-level').value = '0';
  document.getElementById('cf-school').value = 'Evocation';
  document.getElementById('cf-range').value = '';
  document.getElementById('cf-casttime').value = 'Action';
  document.getElementById('cf-duration').value = 'Instantaneous';
  document.getElementById('cf-verbal').checked = false;
  document.getElementById('cf-somatic').checked = false;
  document.getElementById('cf-material').checked = false;
  document.getElementById('cf-material-text').value = '';
  document.getElementById('cf-desc').value = '';
  document.getElementById('cf-higher').value = '';
  document.getElementById('cf-class').value = 'warlock';
  document.getElementById('cf-color-override').checked = false;
  document.getElementById('cf-concentration').checked = false;
  document.getElementById('cf-ritual').checked = false;
  editingCustomId = null;
  document.getElementById('cf-submit').textContent = 'Add to Print Queue';
}

function addCustomSpell() {
  const form = getFormData();
  if (!form.name.trim()) { showError('Spell name is required.'); return; }
  if (!form.desc.trim()) { showError('Description is required.'); return; }

  const normalized = normalizeCustomSpell(form, editingCustomId);
  if (editingCustomId) {
    const idx = customSpells.findIndex((s) => s.id === editingCustomId);
    if (idx >= 0) customSpells[idx] = normalized;
  } else {
    customSpells.push(normalized);
    selectedKeys.add(normalized.id);
  }
  saveCustomSpells();
  clearForm();
  buildSpellList();
}

function editCustomSpell(id) {
  const spell = customSpells.find((s) => s.id === id);
  if (!spell) return;
  editingCustomId = id;

  document.getElementById('cf-name').value = spell.name;
  document.getElementById('cf-level').value = String(spell.level);
  document.getElementById('cf-school').value = spell.school;
  document.getElementById('cf-range').value = spell.range === '—' ? '' : spell.range;
  document.getElementById('cf-casttime').value = spell.castTime;
  document.getElementById('cf-duration').value = spell.duration === '—' ? '' : spell.duration;

  const comp = spell.components || '';
  document.getElementById('cf-verbal').checked = comp.includes('Verbal');
  document.getElementById('cf-somatic').checked = comp.includes('Somatic');
  const matMatch = comp.match(/Material \((.+)\)/);
  document.getElementById('cf-material').checked = comp.includes('Material');
  document.getElementById('cf-material-text').value = matMatch ? matMatch[1] : '';

  document.getElementById('cf-desc').value = spell.desc;
  document.getElementById('cf-higher').value = spell.higherLevel ?? '';
  document.getElementById('cf-class').value = spell.classKey || 'warlock';
  if (spell.customAccent) {
    document.getElementById('cf-color-override').checked = true;
    document.getElementById('cf-color').value = spell.customAccent;
  }
  document.getElementById('cf-concentration').checked = spell.concentration;
  document.getElementById('cf-ritual').checked = spell.ritual;

  document.getElementById('cf-submit').textContent = 'Save Changes';
  document.getElementById('custom-form-toggle').classList.add('open');
  document.getElementById('custom-form').style.display = 'flex';
  document.getElementById('cf-name').focus();
}

function deleteCustomSpell(id) {
  customSpells = customSpells.filter((s) => s.id !== id);
  selectedKeys.delete(id);
  saveCustomSpells();
  buildSpellList();
}

/* ── Class dropdown color dot ────────────────────────────────── */
function updateClassDot(key) {
  const dot = document.getElementById('class-color-dot');
  if (dot) dot.style.background = getThemeForClass(key).accent;
}

/* ── Init ────────────────────────────────────────────────────── */
function init() {
  const classSelect = document.getElementById('class-select');
  CLASS_LIST.forEach((cls) => {
    const opt = document.createElement('option');
    opt.value = cls.key;
    opt.textContent = cls.label;
    classSelect.appendChild(opt);
  });

  classSelect.addEventListener('change', () => {
    activeClassKey = classSelect.value;
    updateClassDot(activeClassKey);
  });
  updateClassDot(activeClassKey);

  document.getElementById('btn-load').addEventListener('click', loadClassSpells);

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(searchInput.value), 400);
  });

  document.getElementById('btn-select-all').addEventListener('click', selectAll);
  document.getElementById('btn-select-none').addEventListener('click', selectNone);
  document.getElementById('btn-preview').addEventListener('click', generatePreview);
  document.getElementById('btn-print').addEventListener('click', () => {
    generatePreview();
    setTimeout(() => window.print(), 100);
  });

  document.getElementById('cf-submit').addEventListener('click', addCustomSpell);
  document.getElementById('cf-clear').addEventListener('click', clearForm);

  const toggle = document.getElementById('custom-form-toggle');
  const form = document.getElementById('custom-form');
  toggle.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    form.style.display = open ? 'flex' : 'none';
  });

  const cfClass = document.getElementById('cf-class');
  CLASS_LIST.forEach((cls) => {
    const opt = document.createElement('option');
    opt.value = cls.key;
    opt.textContent = cls.label;
    cfClass.appendChild(opt);
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom / Other';
  cfClass.appendChild(customOpt);

  document.getElementById('cf-material').addEventListener('change', (e) => {
    document.getElementById('cf-material-text').style.display = e.target.checked ? '' : 'none';
  });

  buildSpellList();
}

document.addEventListener('DOMContentLoaded', init);
