import {
  fetchClassSpells,
  searchSpells,
  normalizeSpell,
  normalizeCustomSpell,
  fetchClasses,
  getSubclassesFor,
  fetchClassFeatures,
  fetchFeats,
  searchFeats,
  normalizeFeat,
  normalizeCustomFeat,
  fetchEquipment,
  searchEquipment,
  normalizeEquipment,
  normalizeCustomEquipment,
  fetchMagicItems,
  searchMagicItems,
  normalizeMagicItem,
  normalizeCustomMagicItem,
  fetchConditions,
  normalizeCustomCondition,
  fetchMonsters,
  searchMonsters,
  normalizeMonster,
  normalizeCustomMonster,
  normalizeCustomClassSkill,
} from './api.js';
import { CLASS_LIST, CARD_TYPES, getThemeForClass, getThemeForCategory } from './class-themes.js';
import { getCategoryIcon } from './icons.js';
import { renderCardsForEntry, renderBackForEntry } from './card-renderer.js';

const STORAGE_PREFIX = 'dnd-custom-';

let activeType = 'spells';
let activeClassKey = CLASS_LIST.find((c) => c.key === 'warlock')?.key || CLASS_LIST[0].key;
let allClasses = [];
let loadedItems = [];
let customByType = {};
let selectedKeys = new Set();
let searchTimer = null;
let editingCustomId = null;
let loadsInFlight = 0;
let loadGeneration = 0;

CARD_TYPES.forEach((t) => {
  customByType[t.key] = loadCustom(t.key);
});

function storageKey(type) {
  return `${STORAGE_PREFIX}${type}`;
}

function loadCustom(type) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(type)) || '[]');
    return (raw || []).map((item) => {
      const next = { ...item, cardType: item.cardType || type };
      if (type === 'spells' && next.id && !String(next.id).startsWith('spell:')) {
        next.id = `spell:${next.id}`;
      }
      return next;
    });
  } catch {
    return [];
  }
}

function saveCustom(type) {
  localStorage.setItem(storageKey(type), JSON.stringify(customByType[type] || []));
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function setLoading(on, msg = 'Loading…') {
  const el = document.getElementById('spell-list-content');
  if (on) el.innerHTML = `<div class="loading-spinner">${msg}</div>`;
}

function typeLabel(type = activeType) {
  return getThemeForCategory(type).label;
}

function updateSpellCount() {
  document.getElementById('spell-count').textContent = `${selectedKeys.size} selected`;
}

function getItemById(id) {
  return loadedItems.find((s) => s.id === id)
    || (customByType[activeType] || []).find((s) => s.id === id);
}

function makeListItem(item, isCustom) {
  const row = document.createElement('div');
  row.className = 'spell-item';
  row.dataset.key = item.id;

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = selectedKeys.has(item.id);
  cb.addEventListener('change', () => {
    if (cb.checked) selectedKeys.add(item.id);
    else selectedKeys.delete(item.id);
    updateSpellCount();
  });

  const name = document.createElement('span');
  name.className = 'spell-item-name';
  name.textContent = item.name;

  const meta = document.createElement('span');
  meta.className = 'spell-item-level';
  meta.textContent = itemMeta(item);

  row.appendChild(cb);
  row.appendChild(name);
  row.appendChild(meta);

  if (isCustom) {
    const badge = document.createElement('span');
    badge.className = 'spell-item-custom';
    badge.textContent = 'custom';
    row.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'spell-item-actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editCustom(item.id);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustom(item.id);
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
  }

  row.addEventListener('click', (e) => {
    if (e.target === cb || e.target.closest('.spell-item-actions')) return;
    cb.checked = !cb.checked;
    if (cb.checked) selectedKeys.add(item.id);
    else selectedKeys.delete(item.id);
    updateSpellCount();
  });

  return row;
}

function itemMeta(item) {
  switch (item.cardType) {
    case 'spells': return item.levelLabel;
    case 'class-skills': return item.levelLabel;
    case 'feats': return item.type;
    case 'equipment': return item.category;
    case 'conditions': return 'Condition';
    case 'magic-items': return item.rarity;
    case 'monsters': return item.crLabel;
    default: return '';
  }
}

function buildList() {
  const container = document.getElementById('spell-list-content');
  container.innerHTML = '';

  if (!loadedItems.length && !(customByType[activeType] || []).length) {
    container.innerHTML = `<div class="loading-spinner" style="color:#5a4a3a;">Load or search ${typeLabel().toLowerCase()}.</div>`;
    updateSpellCount();
    return;
  }

  if (activeType === 'spells') {
    const groups = {};
    for (const spell of loadedItems) {
      const g = spell.levelLabel;
      if (!groups[g]) groups[g] = [];
      groups[g].push(spell);
    }
    const levelOrder = ['Cantrip', ...Array.from({ length: 9 }, (_, i) => {
      const s = ['st', 'nd', 'rd'][i] ?? 'th';
      return `${i + 1}${s}-level`;
    })];
    for (const grp of levelOrder) {
      if (!groups[grp]) continue;
      const header = document.createElement('div');
      header.className = 'spell-group-header';
      header.textContent = grp;
      container.appendChild(header);
      groups[grp].forEach((spell) => container.appendChild(makeListItem(spell, false)));
    }
  } else if (activeType === 'class-skills') {
    const groups = {};
    for (const feat of loadedItems) {
      const g = feat.levelLabel || 'Feature';
      if (!groups[g]) groups[g] = [];
      groups[g].push(feat);
    }
    Object.keys(groups).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10) || 99;
      const nb = parseInt(b.replace(/\D/g, ''), 10) || 99;
      return na - nb || a.localeCompare(b);
    }).forEach((grp) => {
      const header = document.createElement('div');
      header.className = 'spell-group-header';
      header.textContent = grp;
      container.appendChild(header);
      groups[grp].forEach((f) => container.appendChild(makeListItem(f, false)));
    });
  } else {
    const header = document.createElement('div');
    header.className = 'spell-group-header';
    header.textContent = typeLabel();
    container.appendChild(header);
    loadedItems.forEach((item) => container.appendChild(makeListItem(item, false)));
  }

  const customs = customByType[activeType] || [];
  if (customs.length) {
    const header = document.createElement('div');
    header.className = 'spell-group-header';
    header.textContent = `Custom ${typeLabel()}`;
    container.appendChild(header);
    customs.forEach((item) => container.appendChild(makeListItem(item, true)));
  }

  updateSpellCount();
}

function appendPairedPrintCards(frontsSheet, backsSheet, cards, entry) {
  for (let i = 0; i < cards.length; i += 2) {
    frontsSheet.appendChild(cards[i]);
    if (i + 1 < cards.length) {
      backsSheet.appendChild(cards[i + 1]);
    } else {
      backsSheet.appendChild(renderBackForEntry(entry, activeClassKey));
    }
  }
}

/** Screen preview: show every page in reading order (backs sheet unused). */
function appendSequentialPreviewCards(frontsSheet, cards) {
  for (const card of cards) {
    frontsSheet.appendChild(card);
  }
}

/** For duplex long-edge portrait: reverse each grid row so backs align under fronts. */
function mirrorRowsForDuplex(nodes, cols, { isMonster = false } = {}) {
  const out = [];
  for (let i = 0; i < nodes.length; i += cols) {
    const row = nodes.slice(i, i + cols);
    while (row.length < cols) row.push(null);
    row.reverse();
    for (const n of row) {
      if (n) {
        out.push(n);
      } else {
        const spacer = document.createElement('div');
        spacer.className = isMonster
          ? 'spell-card monster-card print-spacer'
          : 'spell-card print-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        out.push(spacer);
      }
    }
  }
  return out;
}

let lastPreviewEntries = [];

function layoutPreview(mode) {
  const fronts = document.getElementById('card-sheet-fronts');
  const backs = document.getElementById('card-sheet-backs');
  fronts.innerHTML = '';
  backs.innerHTML = '';

  const isMonster = activeType === 'monsters';
  fronts.classList.toggle('monster-sheet', isMonster);
  backs.classList.toggle('monster-sheet', isMonster);

  let pages = 0;
  let physicalCards = 0;

  for (const entry of lastPreviewEntries) {
    const cards = renderCardsForEntry(entry, activeClassKey);
    pages += cards.length;
    physicalCards += Math.ceil(cards.length / 2);
    if (mode === 'duplex') {
      appendPairedPrintCards(fronts, backs, cards, entry);
    } else {
      appendSequentialPreviewCards(fronts, cards);
    }
  }

  if (mode === 'duplex') {
    const cols = isMonster ? 2 : 3;
    const mirrored = mirrorRowsForDuplex([...backs.children], cols, { isMonster });
    backs.innerHTML = '';
    mirrored.forEach((n) => backs.appendChild(n));
  }

  return { pages, physicalCards, isMonster };
}

function generatePreview() {
  const printHint = document.getElementById('print-hint');
  const ids = [...selectedKeys];
  if (ids.length === 0) {
    document.getElementById('preview-empty').style.display = 'flex';
    printHint.hidden = true;
    lastPreviewEntries = [];
    document.getElementById('card-sheet-fronts').innerHTML = '';
    document.getElementById('card-sheet-backs').innerHTML = '';
    return;
  }
  document.getElementById('preview-empty').style.display = 'none';
  printHint.hidden = false;

  lastPreviewEntries = [];
  for (const id of ids) {
    const entry = getItemById(id);
    if (entry) lastPreviewEntries.push(entry);
  }

  // Screen: sequential so every continuation page is visible
  const { pages, physicalCards, isMonster } = layoutPreview('sequential');

  const sizeNote = isMonster
    ? 'Monster cards print 4-up (2×2, ~95×135&nbsp;mm) on A4.'
    : 'Sleeve cards print 3×3 (64×89&nbsp;mm) on A4.';

  printHint.innerHTML = `
    <strong>Print tips (A4 only)</strong>
    — <strong>${physicalCards} physical card${physicalCards === 1 ? '' : 's'}</strong>
    for ${pages} page${pages === 1 ? '' : 's'}
    (on screen all pages are shown in order; printing pairs front/back to save paper). ${sizeNote}
    <ul>
      <li><strong>Paper:</strong> A4 only (do not use Letter).</li>
      <li><strong>Margins:</strong> None or Minimum — page uses 8&nbsp;mm.</li>
      <li><strong>Scale:</strong> 100% / Actual size — never “Fit to page.”</li>
      <li><strong>Sides:</strong> Double-sided, flip on <strong>long edge</strong>.</li>
      <li><strong>Background graphics:</strong> On.</li>
      <li>Cut on card edges; optional cardstock ~200–250&nbsp;gsm.</li>
    </ul>
  `;
}

/* ── Load / search per type ──────────────────────────────────── */

async function loadCurrentType() {
  const selectEl = document.getElementById('class-select');
  // Keep state in sync with the visible dropdown (change may never have fired)
  if (selectEl?.value) activeClassKey = selectEl.value;

  const gen = ++loadGeneration;
  loadsInFlight += 1;

  setLoading(true, `Loading ${typeLabel().toLowerCase()}…`);
  selectedKeys.clear();
  loadedItems = [];
  try {
    switch (activeType) {
      case 'spells': {
        const cls = CLASS_LIST.find((c) => c.key === activeClassKey);
        if (!cls) throw new Error(`Unknown class: ${activeClassKey}`);
        const raw = await fetchClassSpells(cls.apiKey);
        if (gen !== loadGeneration) return;
        loadedItems = raw.map(normalizeSpell);
        break;
      }
      case 'class-skills': {
        const subclassSel = document.getElementById('subclass-select');
        const apiKey = subclassSel.value || CLASS_LIST.find((c) => c.key === activeClassKey)?.apiKey;
        if (!apiKey) throw new Error(`Unknown class: ${activeClassKey}`);
        const features = await fetchClassFeatures(apiKey, activeClassKey);
        if (gen !== loadGeneration) return;
        loadedItems = features;
        break;
      }
      case 'feats':
        loadedItems = (await fetchFeats()).map(normalizeFeat);
        break;
      case 'equipment':
        loadedItems = (await fetchEquipment()).map(normalizeEquipment);
        break;
      case 'conditions':
        loadedItems = await fetchConditions();
        break;
      case 'magic-items':
        loadedItems = (await fetchMagicItems()).map(normalizeMagicItem);
        break;
      case 'monsters':
        loadedItems = (await fetchMonsters()).map(normalizeMonster);
        break;
      default:
        break;
    }
    if (gen !== loadGeneration) return;
    loadedItems.forEach((s) => selectedKeys.add(s.id));
  } catch (err) {
    if (gen !== loadGeneration) return;
    showError(`Failed to load: ${err.message}`);
  } finally {
    loadsInFlight = Math.max(0, loadsInFlight - 1);
  }
  if (gen === loadGeneration) buildList();
}

async function doSearch(query) {
  if (!query.trim()) {
    buildList();
    return;
  }
  if (activeType === 'class-skills' || activeType === 'conditions') {
    const q = query.trim().toLowerCase();
    const filtered = loadedItems.filter((i) => i.name.toLowerCase().includes(q));
    const container = document.getElementById('spell-list-content');
    container.innerHTML = '';
    filtered.forEach((item) => container.appendChild(makeListItem(item, false)));
    (customByType[activeType] || [])
      .filter((i) => i.name.toLowerCase().includes(q))
      .forEach((item) => container.appendChild(makeListItem(item, true)));
    updateSpellCount();
    return;
  }

  setLoading(true, 'Searching…');
  try {
    let raw;
    switch (activeType) {
      case 'spells':
        raw = await searchSpells(query);
        loadedItems = raw.map(normalizeSpell);
        break;
      case 'feats':
        raw = await searchFeats(query);
        loadedItems = raw.map(normalizeFeat);
        break;
      case 'equipment':
        raw = await searchEquipment(query);
        loadedItems = raw.map(normalizeEquipment);
        break;
      case 'magic-items':
        raw = await searchMagicItems(query);
        loadedItems = raw.map(normalizeMagicItem);
        break;
      case 'monsters':
        raw = await searchMonsters(query);
        loadedItems = raw.map(normalizeMonster);
        break;
      default:
        break;
    }
  } catch (err) {
    showError(`Search failed: ${err.message}`);
  }
  buildList();
}

function selectAll() {
  document.querySelectorAll('.spell-item input[type="checkbox"]').forEach((cb) => {
    cb.checked = true;
    selectedKeys.add(cb.closest('.spell-item').dataset.key);
  });
  updateSpellCount();
}

function selectNone() {
  document.querySelectorAll('.spell-item input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
    selectedKeys.delete(cb.closest('.spell-item').dataset.key);
  });
  updateSpellCount();
}

/* ── Custom forms ────────────────────────────────────────────── */

function getAccentFromForm() {
  return document.getElementById('cf-color-override').checked
    ? document.getElementById('cf-color').value
    : null;
}

function clearForm() {
  editingCustomId = null;
  document.getElementById('cf-submit').textContent = 'Add to Print Queue';
  document.getElementById('cf-color-override').checked = false;

  document.getElementById('cf-spell-name').value = '';
  document.getElementById('cf-spell-level').value = '0';
  document.getElementById('cf-spell-school').value = 'Evocation';
  document.getElementById('cf-spell-range').value = '';
  document.getElementById('cf-spell-casttime').value = 'Action';
  document.getElementById('cf-spell-duration').value = 'Instantaneous';
  document.getElementById('cf-spell-verbal').checked = false;
  document.getElementById('cf-spell-somatic').checked = false;
  document.getElementById('cf-spell-material').checked = false;
  document.getElementById('cf-spell-material-text').value = '';
  document.getElementById('cf-spell-desc').value = '';
  document.getElementById('cf-spell-higher').value = '';
  document.getElementById('cf-spell-concentration').checked = false;
  document.getElementById('cf-spell-ritual').checked = false;
  document.getElementById('cf-spell-class').value = activeClassKey;

  document.getElementById('cf-skill-name').value = '';
  document.getElementById('cf-skill-level').value = '1';
  document.getElementById('cf-skill-desc').value = '';
  document.getElementById('cf-skill-class').value = activeClassKey;

  document.getElementById('cf-feat-name').value = '';
  document.getElementById('cf-feat-type').value = 'General';
  document.getElementById('cf-feat-prereq').value = '';
  document.getElementById('cf-feat-desc').value = '';

  document.getElementById('cf-eq-name').value = '';
  document.getElementById('cf-eq-category').value = 'Adventuring Gear';
  document.getElementById('cf-eq-cost').value = '';
  document.getElementById('cf-eq-weight').value = '';
  document.getElementById('cf-eq-desc').value = '';

  document.getElementById('cf-cond-name').value = '';
  document.getElementById('cf-cond-desc').value = '';

  document.getElementById('cf-mi-name').value = '';
  document.getElementById('cf-mi-rarity').value = 'Uncommon';
  document.getElementById('cf-mi-category').value = 'Wondrous Item';
  document.getElementById('cf-mi-attune').value = 'No';
  document.getElementById('cf-mi-desc').value = '';

  document.getElementById('cf-mon-name').value = '';
  document.getElementById('cf-mon-typeline').value = '';
  document.getElementById('cf-mon-cr').value = '';
  document.getElementById('cf-mon-ac').value = '';
  document.getElementById('cf-mon-hp').value = '';
  document.getElementById('cf-mon-speed').value = '30 feet';
  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach((a) => {
    document.getElementById(`cf-mon-${a}`).value = '10';
  });
  document.getElementById('cf-mon-traits').value = '';
  document.getElementById('cf-mon-actions').value = '';
}

function buildCustomFromForm() {
  const accent = getAccentFromForm();
  switch (activeType) {
    case 'spells':
      return normalizeCustomSpell({
        name: document.getElementById('cf-spell-name').value,
        level: document.getElementById('cf-spell-level').value,
        school: document.getElementById('cf-spell-school').value,
        range: document.getElementById('cf-spell-range').value,
        castTime: document.getElementById('cf-spell-casttime').value,
        duration: document.getElementById('cf-spell-duration').value,
        verbal: document.getElementById('cf-spell-verbal').checked,
        somatic: document.getElementById('cf-spell-somatic').checked,
        material: document.getElementById('cf-spell-material').checked,
        materialText: document.getElementById('cf-spell-material-text').value,
        desc: document.getElementById('cf-spell-desc').value,
        higherLevel: document.getElementById('cf-spell-higher').value,
        classKey: document.getElementById('cf-spell-class').value,
        customAccent: accent,
        concentration: document.getElementById('cf-spell-concentration').checked,
        ritual: document.getElementById('cf-spell-ritual').checked,
      }, editingCustomId);
    case 'class-skills':
      return normalizeCustomClassSkill({
        name: document.getElementById('cf-skill-name').value,
        level: document.getElementById('cf-skill-level').value,
        classKey: document.getElementById('cf-skill-class').value,
        desc: document.getElementById('cf-skill-desc').value,
        customAccent: accent,
      }, editingCustomId);
    case 'feats':
      return normalizeCustomFeat({
        name: document.getElementById('cf-feat-name').value,
        type: document.getElementById('cf-feat-type').value,
        prerequisite: document.getElementById('cf-feat-prereq').value,
        desc: document.getElementById('cf-feat-desc').value,
        customAccent: accent,
      }, editingCustomId);
    case 'equipment':
      return normalizeCustomEquipment({
        name: document.getElementById('cf-eq-name').value,
        category: document.getElementById('cf-eq-category').value,
        cost: document.getElementById('cf-eq-cost').value,
        weight: document.getElementById('cf-eq-weight').value,
        desc: document.getElementById('cf-eq-desc').value,
        customAccent: accent,
      }, editingCustomId);
    case 'conditions':
      return normalizeCustomCondition({
        name: document.getElementById('cf-cond-name').value,
        desc: document.getElementById('cf-cond-desc').value,
        customAccent: accent,
      }, editingCustomId);
    case 'magic-items':
      return normalizeCustomMagicItem({
        name: document.getElementById('cf-mi-name').value,
        rarity: document.getElementById('cf-mi-rarity').value,
        category: document.getElementById('cf-mi-category').value,
        attunement: document.getElementById('cf-mi-attune').value,
        desc: document.getElementById('cf-mi-desc').value,
        customAccent: accent,
      }, editingCustomId);
    case 'monsters':
      return normalizeCustomMonster({
        name: document.getElementById('cf-mon-name').value,
        typeLine: document.getElementById('cf-mon-typeline').value,
        cr: document.getElementById('cf-mon-cr').value,
        ac: document.getElementById('cf-mon-ac').value,
        hp: document.getElementById('cf-mon-hp').value,
        speed: document.getElementById('cf-mon-speed').value,
        str: document.getElementById('cf-mon-str').value,
        dex: document.getElementById('cf-mon-dex').value,
        con: document.getElementById('cf-mon-con').value,
        int: document.getElementById('cf-mon-int').value,
        wis: document.getElementById('cf-mon-wis').value,
        cha: document.getElementById('cf-mon-cha').value,
        traits: document.getElementById('cf-mon-traits').value,
        actions: document.getElementById('cf-mon-actions').value,
        customAccent: accent,
      }, editingCustomId);
    default:
      return null;
  }
}

function addCustom() {
  const normalized = buildCustomFromForm();
  if (!normalized) return;
  if (!normalized.name?.trim()) {
    showError('Name is required.');
    return;
  }
  if (activeType !== 'monsters' && !normalized.desc?.trim()) {
    showError('Description is required.');
    return;
  }

  const list = customByType[activeType];
  if (editingCustomId) {
    const idx = list.findIndex((s) => s.id === editingCustomId);
    if (idx >= 0) list[idx] = normalized;
  } else {
    list.push(normalized);
    selectedKeys.add(normalized.id);
  }
  saveCustom(activeType);
  clearForm();
  buildList();
  generatePreview();
}

function editCustom(id) {
  const item = (customByType[activeType] || []).find((s) => s.id === id);
  if (!item) return;
  editingCustomId = id;
  document.getElementById('cf-submit').textContent = 'Save Changes';
  document.getElementById('custom-form-toggle').classList.add('open');
  document.getElementById('custom-form').style.display = 'flex';

  if (item.customAccent) {
    document.getElementById('cf-color-override').checked = true;
    document.getElementById('cf-color').value = item.customAccent;
  }

  switch (activeType) {
    case 'spells':
      document.getElementById('cf-spell-name').value = item.name;
      document.getElementById('cf-spell-level').value = String(item.level);
      document.getElementById('cf-spell-school').value = item.school;
      document.getElementById('cf-spell-range').value = item.range === '—' ? '' : item.range;
      document.getElementById('cf-spell-casttime').value = item.castTime;
      document.getElementById('cf-spell-duration').value = item.duration === '—' ? '' : item.duration;
      document.getElementById('cf-spell-verbal').checked = (item.components || '').includes('Verbal');
      document.getElementById('cf-spell-somatic').checked = (item.components || '').includes('Somatic');
      document.getElementById('cf-spell-material').checked = (item.components || '').includes('Material');
      document.getElementById('cf-spell-desc').value = item.desc;
      document.getElementById('cf-spell-higher').value = item.higherLevel || '';
      document.getElementById('cf-spell-class').value = item.classKey || 'custom';
      document.getElementById('cf-spell-concentration').checked = !!item.concentration;
      document.getElementById('cf-spell-ritual').checked = !!item.ritual;
      break;
    case 'class-skills':
      document.getElementById('cf-skill-name').value = item.name;
      document.getElementById('cf-skill-level').value = item.level || 1;
      document.getElementById('cf-skill-class').value = item.classKey || 'custom';
      document.getElementById('cf-skill-desc').value = item.desc;
      break;
    case 'feats':
      document.getElementById('cf-feat-name').value = item.name;
      document.getElementById('cf-feat-type').value = item.type;
      document.getElementById('cf-feat-prereq').value = item.prerequisite || '';
      document.getElementById('cf-feat-desc').value = item.desc;
      break;
    case 'equipment':
      document.getElementById('cf-eq-name').value = item.name;
      document.getElementById('cf-eq-category').value = item.category;
      document.getElementById('cf-eq-cost').value = item.cost === '—' ? '' : item.cost;
      document.getElementById('cf-eq-weight').value = item.weight === '—' ? '' : item.weight;
      document.getElementById('cf-eq-desc').value = item.desc;
      break;
    case 'conditions':
      document.getElementById('cf-cond-name').value = item.name;
      document.getElementById('cf-cond-desc').value = item.desc;
      break;
    case 'magic-items':
      document.getElementById('cf-mi-name').value = item.name;
      document.getElementById('cf-mi-rarity').value = item.rarity;
      document.getElementById('cf-mi-category').value = item.category;
      document.getElementById('cf-mi-attune').value = item.attunement;
      document.getElementById('cf-mi-desc').value = item.desc;
      break;
    case 'monsters':
      document.getElementById('cf-mon-name').value = item.name;
      document.getElementById('cf-mon-typeline').value = item.typeLine || '';
      document.getElementById('cf-mon-cr').value = item.cr ?? '';
      document.getElementById('cf-mon-ac').value = item.ac ?? '';
      document.getElementById('cf-mon-hp').value = item.hp ?? '';
      document.getElementById('cf-mon-speed').value = item.speed || '';
      (item.abilities || []).forEach((a) => {
        const el = document.getElementById(`cf-mon-${a.key.toLowerCase()}`);
        if (el) el.value = a.score;
      });
      document.getElementById('cf-mon-traits').value = (item.traits || []).map((t) => `${t.name}\n${t.desc}`).join('\n\n');
      document.getElementById('cf-mon-actions').value = (item.actions || []).map((t) => `${t.name}\n${t.desc}`).join('\n\n');
      break;
    default:
      break;
  }
}

function deleteCustom(id) {
  customByType[activeType] = (customByType[activeType] || []).filter((s) => s.id !== id);
  selectedKeys.delete(id);
  saveCustom(activeType);
  buildList();
}

/* ── Type switching / UI ─────────────────────────────────────── */

function updateClassDot(key) {
  const dot = document.getElementById('class-color-dot');
  if (dot) dot.style.background = getThemeForClass(key).accent;
}

function refreshSubclassOptions() {
  const sel = document.getElementById('subclass-select');
  const base = CLASS_LIST.find((c) => c.key === activeClassKey);
  sel.innerHTML = '<option value="">Base class only</option>';
  if (!base || !allClasses.length) return;
  getSubclassesFor(allClasses, base.apiKey).forEach((sc) => {
    const opt = document.createElement('option');
    opt.value = sc.key;
    opt.textContent = sc.name;
    sel.appendChild(opt);
  });
}

function updateControlsForType() {
  const needsClass = activeType === 'spells' || activeType === 'class-skills';
  document.getElementById('ctrl-class').hidden = !needsClass;
  document.getElementById('ctrl-subclass').hidden = activeType !== 'class-skills';
  document.getElementById('btn-load').hidden = false;
  document.getElementById('btn-load').textContent = {
    spells: 'Load Spellbook',
    'class-skills': 'Load Features',
    feats: 'Load Feats',
    equipment: 'Load Equipment',
    conditions: 'Load Conditions',
    'magic-items': 'Load Magic Items',
    monsters: 'Load Monsters',
  }[activeType] || 'Load';

  document.getElementById('list-title').textContent = typeLabel();
  document.getElementById('search-label').textContent = `Search ${typeLabel().toLowerCase()}`;
  document.getElementById('search-input').placeholder = `Search ${typeLabel().toLowerCase()}…`;
  document.getElementById('custom-form-label').textContent = `Create Custom ${typeLabel().replace(/s$/, '') === typeLabel() ? typeLabel().slice(0, -1) : typeLabel().replace(/s$/, '')}`;
  // Fix pluralization simply:
  const singular = {
    spells: 'Spell',
    'class-skills': 'Class Skill',
    feats: 'Feat',
    equipment: 'Equipment',
    conditions: 'Condition',
    'magic-items': 'Magic Item',
    monsters: 'Monster',
  }[activeType];
  document.getElementById('custom-form-label').textContent = `Create Custom ${singular}`;

  document.querySelectorAll('.form-panel').forEach((panel) => {
    panel.hidden = panel.dataset.form !== activeType;
  });

  document.getElementById('preview-empty').textContent = `Select ${typeLabel().toLowerCase()} and click Preview Cards`;
}

function setActiveType(type) {
  activeType = type;
  selectedKeys.clear();
  loadedItems = [];
  editingCustomId = null;
  clearForm();
  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  updateControlsForType();
  if (activeType === 'class-skills') refreshSubclassOptions();
  buildList();
  document.getElementById('print-hint').hidden = true;
  document.getElementById('preview-empty').style.display = 'flex';
  document.getElementById('card-sheet-fronts').innerHTML = '';
  document.getElementById('card-sheet-backs').innerHTML = '';
}

function buildCategoryNav() {
  const nav = document.getElementById('category-nav');
  nav.innerHTML = '';
  CARD_TYPES.forEach((t) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-btn' + (t.key === activeType ? ' active' : '');
    btn.dataset.type = t.key;
    btn.innerHTML = `<span class="cat-icon">${getCategoryIcon(t.key)}</span><span>${t.label}</span>`;
    btn.addEventListener('click', () => setActiveType(t.key));
    nav.appendChild(btn);
  });
}

async function init() {
  if (window.__dndRefCardsInit) return;
  window.__dndRefCardsInit = true;

  buildCategoryNav();

  const classSelect = document.getElementById('class-select');
  const spellClass = document.getElementById('cf-spell-class');
  const skillClass = document.getElementById('cf-skill-class');
  CLASS_LIST.forEach((cls) => {
    [classSelect, spellClass, skillClass].forEach((sel) => {
      const opt = document.createElement('option');
      opt.value = cls.key;
      opt.textContent = cls.label;
      sel.appendChild(opt);
    });
  });
  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Custom / Other';
  spellClass.appendChild(customOpt.cloneNode(true));
  skillClass.appendChild(customOpt);

  classSelect.value = activeClassKey;
  updateClassDot(activeClassKey);
  classSelect.addEventListener('change', () => {
    activeClassKey = classSelect.value;
    updateClassDot(activeClassKey);
    if (activeType === 'class-skills') refreshSubclassOptions();
  });

  // Bind interactive UI before any network await so controls work immediately
  document.getElementById('btn-load').addEventListener('click', loadCurrentType);
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(document.getElementById('search-input').value), 400);
  });
  document.getElementById('btn-select-all').addEventListener('click', selectAll);
  document.getElementById('btn-select-none').addEventListener('click', selectNone);
  document.getElementById('btn-preview').addEventListener('click', generatePreview);
  document.getElementById('btn-print').addEventListener('click', () => {
    generatePreview();
    if (lastPreviewEntries.length) layoutPreview('duplex');
    setTimeout(() => window.print(), 100);
  });
  window.addEventListener('beforeprint', () => {
    if (lastPreviewEntries.length) layoutPreview('duplex');
  });
  window.addEventListener('afterprint', () => {
    if (lastPreviewEntries.length) layoutPreview('sequential');
  });
  document.getElementById('cf-submit').addEventListener('click', addCustom);
  document.getElementById('cf-clear').addEventListener('click', clearForm);
  const toggle = document.getElementById('custom-form-toggle');
  const form = document.getElementById('custom-form');
  toggle.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    form.style.display = open ? 'flex' : 'none';
  });
  document.getElementById('cf-spell-material').addEventListener('change', (e) => {
    document.getElementById('cf-spell-material-text').style.display = e.target.checked ? '' : 'none';
  });

  updateControlsForType();
  buildList();

  try {
    allClasses = await fetchClasses();
    refreshSubclassOptions();
  } catch {
    /* subclasses optional */
  }

  updateControlsForType();
  // Do not clobber an in-flight Load with an empty list rebuild
  if (loadsInFlight === 0) buildList();
}

document.addEventListener('DOMContentLoaded', init);
