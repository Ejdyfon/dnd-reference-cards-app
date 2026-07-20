const ICONS = {
  barbarian: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 6 L12 10 L10 22 L6 20 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M24 6 L20 10 L22 22 L26 20 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <line x1="16" y1="8" x2="16" y2="28" stroke="currentColor" stroke-width="2"/>
    <path d="M12 10 L16 8 L20 10" stroke="currentColor" stroke-width="1.4" fill="none"/>
  </svg>`,

  bard: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="10" rx="4" ry="5" stroke="currentColor" stroke-width="1.8"/>
    <path d="M8 28 C8 20 24 20 24 28" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 16 Q16 14 20 16" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M10 20 L10 26 M22 20 L22 26" stroke="currentColor" stroke-width="1.4"/>
    <path d="M10 22 L14 23 M22 22 L18 23" stroke="currentColor" stroke-width="1.2"/>
  </svg>`,

  cleric: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="2"/>
    <line x1="6" y1="13" x2="26" y2="13" stroke="currentColor" stroke-width="2"/>
    <circle cx="16" cy="13" r="3" fill="currentColor"/>
    <path d="M11 20 L16 16 L21 20 L19 27 L13 27 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  </svg>`,

  druid: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 6 C10 6 6 11 8 17 C10 23 16 26 16 26 C16 26 22 23 24 17 C26 11 22 6 16 6 Z" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M16 10 C13 10 11 13 12 16 C13 19 16 21 16 21" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <line x1="16" y1="21" x2="16" y2="28" stroke="currentColor" stroke-width="1.6"/>
    <line x1="12" y1="24" x2="20" y2="24" stroke="currentColor" stroke-width="1.4"/>
  </svg>`,

  fighter: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 26 L14 8 L16 10 L10 26 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M26 26 L18 8 L16 10 L22 26 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <line x1="8" y1="22" x2="12" y2="20" stroke="currentColor" stroke-width="1.4"/>
    <line x1="24" y1="22" x2="20" y2="20" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="16" cy="11" r="1.5" fill="currentColor"/>
  </svg>`,

  monk: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18 C10 12 14 8 16 8 C18 8 22 12 22 18" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 18 L10 26 L14 24 L16 28 L18 24 L22 26 L20 18" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <circle cx="16" cy="14" r="2" fill="currentColor"/>
  </svg>`,

  paladin: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4 L20 8 L20 20 L16 28 L12 20 L12 8 Z" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <line x1="8" y1="14" x2="24" y2="14" stroke="currentColor" stroke-width="1.6"/>
    <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="16" cy="14" r="2" fill="currentColor"/>
  </svg>`,

  ranger: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24 Q16 6 24 24" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <line x1="8" y1="24" x2="24" y2="24" stroke="currentColor" stroke-width="1.5"/>
    <line x1="16" y1="10" x2="16" y2="26" stroke="currentColor" stroke-width="1.2"/>
    <path d="M14 12 L16 8 L18 12" fill="currentColor"/>
    <path d="M10 19 L22 19" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2,2"/>
  </svg>`,

  rogue: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 6 L18 14 L16 26 L12 24 L14 14 Z" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M18 14 L24 8" stroke="currentColor" stroke-width="1.5"/>
    <path d="M22 6 L26 10 L24 12 L20 8 Z" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <line x1="14" y1="26" x2="12" y2="30" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  sorcerer: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4 L17.5 12 L24 8 L19 15 L27 16 L19 17 L24 24 L17.5 20 L16 28 L14.5 20 L8 24 L13 17 L5 16 L13 15 L8 8 L14.5 12 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  </svg>`,

  warlock: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="14" rx="7" ry="5" stroke="currentColor" stroke-width="1.8"/>
    <ellipse cx="16" cy="14" rx="3" ry="2.5" fill="currentColor"/>
    <path d="M9 14 Q6 20 10 26" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M23 14 Q26 20 22 26" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M13 26 Q16 28 19 26" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <line x1="10" y1="8" x2="10" y2="4" stroke="currentColor" stroke-width="1.2"/>
    <line x1="16" y1="7" x2="16" y2="3" stroke="currentColor" stroke-width="1.2"/>
    <line x1="22" y1="8" x2="22" y2="4" stroke="currentColor" stroke-width="1.2"/>
  </svg>`,

  wizard: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3 L20 12 L28 12 L22 18 L24 27 L16 22 L8 27 L10 18 L4 12 L12 12 Z" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
  </svg>`,

  custom: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="11" stroke="currentColor" stroke-width="1.8"/>
    <line x1="16" y1="10" x2="16" y2="22" stroke="currentColor" stroke-width="2"/>
    <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" stroke-width="2"/>
  </svg>`,

  // Category icons (Open5e-style silhouettes)
  spells: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 26 C8 18 12 14 16 10 C20 14 24 18 24 26" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M12 22 C13 16 16 12 16 12 C16 12 19 16 20 22" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M10 28 L22 28" stroke="currentColor" stroke-width="1.6"/>
  </svg>`,

  'class-skills': `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 24 L12 8 L14 10 L12 24 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M24 24 L20 8 L18 10 L20 24 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <line x1="10" y1="20" x2="14" y2="18" stroke="currentColor" stroke-width="1.3"/>
    <line x1="22" y1="20" x2="18" y2="18" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,

  feats: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="16" r="3.5" stroke="currentColor" stroke-width="1.6"/>
    <path d="M10 12 L10 8 M10 20 L10 24" stroke="currentColor" stroke-width="1.4"/>
    <line x1="14" y1="16" x2="20" y2="16" stroke="currentColor" stroke-width="1.6"/>
    <line x1="20" y1="16" x2="26" y2="10" stroke="currentColor" stroke-width="1.5"/>
    <line x1="20" y1="16" x2="26" y2="16" stroke="currentColor" stroke-width="1.5"/>
    <line x1="20" y1="16" x2="26" y2="22" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  equipment: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 14 C8 12 10 10 16 10 C22 10 24 12 24 14 L22 26 C22 28 10 28 10 26 Z" stroke="currentColor" stroke-width="1.7" fill="none"/>
    <path d="M12 14 C12 12 14 11 16 11 C18 11 20 12 20 14" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <line x1="16" y1="16" x2="16" y2="22" stroke="currentColor" stroke-width="1.4"/>
  </svg>`,

  conditions: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28 C16 28 6 20 6 13 C6 9 9 7 12 7 C14 7 15.5 8 16 10 C16.5 8 18 7 20 7 C23 7 26 9 26 13 C26 20 16 28 16 28 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M7 16 L11 16 L13 12 L16 20 L19 14 L21 16 L25 16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  </svg>`,

  'magic-items': `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4 L20 12 L28 12 L22 18 L24 28 L16 22 L8 28 L10 18 L4 12 L12 12 Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
    <path d="M16 10 L18 14 L22 14 L19 17 L20 22 L16 19 L12 22 L13 17 L10 14 L14 14 Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
  </svg>`,

  monsters: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 22 C8 10 14 6 18 8 C22 6 26 10 28 16 C26 14 24 14 22 16 C24 18 26 22 24 26 C20 24 16 24 12 26 C10 22 8 18 6 18 C6 20 5 22 4 22 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <circle cx="20" cy="14" r="1.5" fill="currentColor"/>
    <path d="M22 18 L26 20" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,
};

export function getClassIcon(classKey) {
  return ICONS[classKey] ?? ICONS.custom;
}

export function getCategoryIcon(typeKey) {
  return ICONS[typeKey] ?? ICONS.custom;
}
