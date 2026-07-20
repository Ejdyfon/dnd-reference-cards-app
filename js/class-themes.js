export const CLASS_LIST = [
  { key: 'bard', apiKey: 'srd-2024_bard', label: 'Bard' },
  { key: 'cleric', apiKey: 'srd-2024_cleric', label: 'Cleric' },
  { key: 'druid', apiKey: 'srd-2024_druid', label: 'Druid' },
  { key: 'paladin', apiKey: 'srd-2024_paladin', label: 'Paladin' },
  { key: 'ranger', apiKey: 'srd-2024_ranger', label: 'Ranger' },
  { key: 'sorcerer', apiKey: 'srd-2024_sorcerer', label: 'Sorcerer' },
  { key: 'warlock', apiKey: 'srd-2024_warlock', label: 'Warlock' },
  { key: 'wizard', apiKey: 'srd-2024_wizard', label: 'Wizard' },
];

export const CLASS_THEMES = {
  bard: { accent: '#9B2878', label: 'Bard' },
  cleric: { accent: '#B8860B', label: 'Cleric' },
  druid: { accent: '#2E7D32', label: 'Druid' },
  paladin: { accent: '#4A6FA5', label: 'Paladin' },
  ranger: { accent: '#556B2F', label: 'Ranger' },
  sorcerer: { accent: '#C62828', label: 'Sorcerer' },
  warlock: { accent: '#5B2D82', label: 'Warlock' },
  wizard: { accent: '#1565C0', label: 'Wizard' },
  custom: { accent: '#6B7280', label: 'Custom' },
};

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

export function applyTheme(cardEl, classKey, customAccent) {
  const theme = getThemeForClass(classKey);
  const accent = customAccent || theme.accent;
  cardEl.dataset.class = classKey;
  cardEl.style.setProperty('--card-accent', accent);
  cardEl.style.setProperty('--card-accent-light', `${accent}22`);
}

export function apiKeyToClassKey(apiKey) {
  const found = CLASS_LIST.find((c) => c.apiKey === apiKey);
  return found?.key ?? 'custom';
}
