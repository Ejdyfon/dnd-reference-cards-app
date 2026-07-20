export const CLASS_LIST = [
  { key: 'barbarian', apiKey: 'srd-2024_barbarian', label: 'Barbarian' },
  { key: 'bard', apiKey: 'srd-2024_bard', label: 'Bard' },
  { key: 'cleric', apiKey: 'srd-2024_cleric', label: 'Cleric' },
  { key: 'druid', apiKey: 'srd-2024_druid', label: 'Druid' },
  { key: 'fighter', apiKey: 'srd-2024_fighter', label: 'Fighter' },
  { key: 'monk', apiKey: 'srd-2024_monk', label: 'Monk' },
  { key: 'paladin', apiKey: 'srd-2024_paladin', label: 'Paladin' },
  { key: 'ranger', apiKey: 'srd-2024_ranger', label: 'Ranger' },
  { key: 'rogue', apiKey: 'srd-2024_rogue', label: 'Rogue' },
  { key: 'sorcerer', apiKey: 'srd-2024_sorcerer', label: 'Sorcerer' },
  { key: 'warlock', apiKey: 'srd-2024_warlock', label: 'Warlock' },
  { key: 'wizard', apiKey: 'srd-2024_wizard', label: 'Wizard' },
];

export const CLASS_THEMES = {
  barbarian: { accent: '#C45C26', label: 'Barbarian' },
  bard: { accent: '#9B2878', label: 'Bard' },
  cleric: { accent: '#B8860B', label: 'Cleric' },
  druid: { accent: '#2E7D32', label: 'Druid' },
  fighter: { accent: '#4A5568', label: 'Fighter' },
  monk: { accent: '#0F766E', label: 'Monk' },
  paladin: { accent: '#4A6FA5', label: 'Paladin' },
  ranger: { accent: '#556B2F', label: 'Ranger' },
  rogue: { accent: '#9F1239', label: 'Rogue' },
  sorcerer: { accent: '#C62828', label: 'Sorcerer' },
  warlock: { accent: '#5B2D82', label: 'Warlock' },
  wizard: { accent: '#1565C0', label: 'Wizard' },
  custom: { accent: '#6B7280', label: 'Custom' },
};

/** Fiery red shared by non-class reference card types */
export const CATEGORY_ACCENT = '#E34C38';

export const CATEGORY_THEMES = {
  spells: { accent: null, label: 'Spells', usesClass: true },
  'class-skills': { accent: null, label: 'Class Skills', usesClass: true },
  feats: { accent: CATEGORY_ACCENT, label: 'Feats', usesClass: false },
  equipment: { accent: CATEGORY_ACCENT, label: 'Equipment', usesClass: false },
  conditions: { accent: CATEGORY_ACCENT, label: 'Conditions', usesClass: false },
  'magic-items': { accent: CATEGORY_ACCENT, label: 'Magic Items', usesClass: false },
  monsters: { accent: CATEGORY_ACCENT, label: 'Monsters', usesClass: false },
};

export const CARD_TYPES = [
  { key: 'spells', label: 'Spells' },
  { key: 'class-skills', label: 'Class Skills' },
  { key: 'feats', label: 'Feats' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'magic-items', label: 'Magic Items' },
  { key: 'monsters', label: 'Monsters' },
];

export const SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
];

export function getThemeForClass(classKey) {
  return CLASS_THEMES[classKey] ?? CLASS_THEMES.custom;
}

export function getThemeForCategory(typeKey) {
  return CATEGORY_THEMES[typeKey] ?? { accent: CATEGORY_ACCENT, label: 'Custom', usesClass: false };
}

export function applyTheme(cardEl, classKey, customAccent) {
  const theme = getThemeForClass(classKey);
  const accent = customAccent || theme.accent;
  cardEl.dataset.class = classKey;
  cardEl.style.setProperty('--card-accent', accent);
  cardEl.style.setProperty('--card-accent-light', `${accent}22`);
}

export function applyCategoryTheme(cardEl, typeKey, customAccent) {
  const theme = getThemeForCategory(typeKey);
  const accent = customAccent || theme.accent || CATEGORY_ACCENT;
  cardEl.dataset.category = typeKey;
  cardEl.style.setProperty('--card-accent', accent);
  cardEl.style.setProperty('--card-accent-light', `${accent}22`);
}

export function apiKeyToClassKey(apiKey) {
  const found = CLASS_LIST.find((c) => c.apiKey === apiKey);
  if (found) return found.key;
  // Subclass keys like srd-2024_thief → try parent from apiKey pattern
  const match = CLASS_LIST.find((c) => apiKey?.includes(`_${c.key}`) || apiKey?.endsWith(c.key));
  return match?.key ?? 'custom';
}
