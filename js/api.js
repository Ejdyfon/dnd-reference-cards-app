const API_BASE = 'https://api.open5e.com/v2/spells/';
const DOC_FILTER = 'document__key=srd-2024';

export async function fetchAllPages(initialUrl) {
  const results = [];
  let url = initialUrl;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    results.push(...data.results);
    url = data.next;
  }

  return results;
}

export async function fetchClassSpells(classApiKey) {
  const url = `${API_BASE}?${DOC_FILTER}&classes__key=${classApiKey}&limit=100&ordering=level,name`;
  return fetchAllPages(url);
}

export async function searchSpells(query) {
  const url = `${API_BASE}?${DOC_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return fetchAllPages(url);
}

export async function fetchAllSpells() {
  const url = `${API_BASE}?${DOC_FILTER}&limit=100&ordering=name`;
  return fetchAllPages(url);
}

export function formatLevel(level) {
  if (level === 0) return 'Cantrip';
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[level] ?? 'th';
  return `${level}${suffix}-level`;
}

export function formatCastTime(time, reactionCondition) {
  if (!time) return '—';
  const normalized = time.charAt(0).toUpperCase() + time.slice(1);
  if (reactionCondition) {
    return `${normalized}, ${reactionCondition}`;
  }
  return normalized;
}

export function formatComponents(spell) {
  const parts = [];
  if (spell.verbal) parts.push('Verbal');
  if (spell.somatic) parts.push('Somatic');
  if (spell.material) {
    const mat = spell.material_specified?.trim();
    parts.push(mat ? `Material (${mat})` : 'Material');
  }
  return parts.length ? parts.join(', ') : '—';
}

export function formatDuration(duration, concentration) {
  if (!duration) return '—';
  const d = duration.charAt(0).toUpperCase() + duration.slice(1);
  return concentration ? `${d} (Concentration)` : d;
}

export function normalizeSpell(raw) {
  return {
    source: 'api',
    id: raw.key,
    key: raw.key,
    name: raw.name,
    level: raw.level,
    levelLabel: formatLevel(raw.level),
    school: raw.school?.name ?? 'Unknown',
    range: raw.range_text || '—',
    castTime: formatCastTime(raw.casting_time, raw.reaction_condition),
    duration: formatDuration(raw.duration, raw.concentration),
    components: formatComponents(raw),
    desc: raw.desc ?? '',
    higherLevel: raw.higher_level ?? '',
    concentration: !!raw.concentration,
    ritual: !!raw.ritual,
    classes: (raw.classes ?? []).map((c) => c.name),
    customAccent: null,
    classKey: null,
  };
}

export function normalizeCustomSpell(form, id) {
  const level = parseInt(form.level, 10);
  const parts = [];
  if (form.verbal) parts.push('Verbal');
  if (form.somatic) parts.push('Somatic');
  if (form.material) {
    const mat = form.materialText?.trim();
    parts.push(mat ? `Material (${mat})` : 'Material');
  }

  const resolvedId = id || `custom-${crypto.randomUUID()}`;
  return {
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    level,
    levelLabel: formatLevel(level),
    school: form.school,
    range: form.range.trim() || '—',
    castTime: form.castTime.trim() || 'Action',
    duration: form.duration.trim() || '—',
    components: parts.length ? parts.join(', ') : '—',
    desc: form.desc.trim(),
    higherLevel: form.higherLevel?.trim() ?? '',
    concentration: !!form.concentration,
    ritual: !!form.ritual,
    classes: [],
    customAccent: form.customAccent || null,
    classKey: form.classKey || 'custom',
  };
}
