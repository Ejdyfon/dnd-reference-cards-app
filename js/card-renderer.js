import { markdownToHtml } from './markdown.js';
import { applyTheme, applyCategoryTheme, getThemeForClass, getThemeForCategory } from './class-themes.js';
import { getClassIcon, getCategoryIcon } from './icons.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCornersHtml() {
  return `
    <span class="corner tl">✦</span>
    <span class="corner tr">✦</span>
    <span class="corner bl">✦</span>
    <span class="corner br">✦</span>
  `;
}

function buildContinuationHtml(name, cardNum, totalPages) {
  return `
    <div class="card-continuation-header">
      <span class="continuation-name">${escapeHtml(name)}</span>
      <span class="continuation-page">${cardNum}/${totalPages}</span>
    </div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
}

function fitTitleText(el, { maxPt = 13, minPt = 7.5, maxLines = 2 } = {}) {
  if (!el) return;

  let size = maxPt;
  el.style.fontSize = `${size}pt`;
  el.style.whiteSpace = 'nowrap';

  while (size > minPt && el.scrollWidth > el.clientWidth + 1) {
    size -= 0.25;
    el.style.fontSize = `${size}pt`;
  }

  if (el.scrollWidth <= el.clientWidth + 1) {
    el.style.whiteSpace = 'nowrap';
    return;
  }

  el.style.whiteSpace = 'normal';
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || size * 1.05 * (96 / 72);
  const maxHeight = lineHeight * maxLines + 1;

  while (size > minPt && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > maxHeight)) {
    size -= 0.25;
    el.style.fontSize = `${size}pt`;
  }
}

function fitCardTitles(card) {
  const wasDetached = !card.isConnected;
  if (wasDetached) {
    card.style.position = 'absolute';
    card.style.visibility = 'hidden';
    card.style.left = '-9999px';
    card.style.top = '0';
    document.body.appendChild(card);
  }

  fitTitleText(card.querySelector('.spell-name'), { maxPt: 13, minPt: 7.5, maxLines: 2 });
  fitTitleText(card.querySelector('.continuation-name'), { maxPt: 11, minPt: 7, maxLines: 1 });
  fitTitleText(card.querySelector('.monster-name'), { maxPt: 16, minPt: 10, maxLines: 2 });

  if (wasDetached) {
    document.body.removeChild(card);
    card.style.position = '';
    card.style.visibility = '';
    card.style.left = '';
    card.style.top = '';
  }
}

function createSmallCardShell(themeKey, customAccent, { useCategory } = {}) {
  const card = document.createElement('div');
  card.className = 'spell-card';
  if (useCategory) applyCategoryTheme(card, themeKey, customAccent);
  else applyTheme(card, themeKey, customAccent);
  return card;
}

/* ── Shared body splitting for small cards ───────────────────── */

function isHigherLevelLabel(node) {
  return node.nodeType === 1 && node.classList?.contains('higher-level-label');
}

function splitElementBySentences(node) {
  if (node.nodeType !== 1) return [node];
  const tag = node.tagName.toLowerCase();
  if (tag !== 'p' && tag !== 'li') return [node];
  const parts = node.innerHTML.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= 1) return [node];
  return parts.map((part) => {
    const el = document.createElement(tag);
    el.innerHTML = part;
    if (node.className) el.className = node.className;
    return el;
  });
}

function buildDescNodes(descHtml, higherLevelHtml) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = descHtml;
  const nodes = Array.from(wrapper.childNodes).filter(
    (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()),
  );

  if (higherLevelHtml) {
    const hlLabel = document.createElement('p');
    hlLabel.className = 'higher-level-label';
    hlLabel.textContent = 'At Higher Levels:';
    const hlContent = document.createElement('div');
    hlContent.innerHTML = higherLevelHtml;
    nodes.push(hlLabel);
    Array.from(hlContent.childNodes).forEach((n) => nodes.push(n));
  }
  return nodes;
}

function buildCantripUpgradeNodes(higherLevelHtml) {
  const label = document.createElement('p');
  label.className = 'higher-level-label';
  label.textContent = 'Cantrip Upgrades:';
  const content = document.createElement('div');
  content.innerHTML = higherLevelHtml;
  return [label, ...Array.from(content.childNodes)];
}

function makeMeasureHelpers({ buildHeader, buildFirstExtras, name, themeKey, useCategory, customAccent, cardClass }) {
  function createShell() {
    const card = document.createElement('div');
    card.className = cardClass || 'spell-card';
    if (useCategory) applyCategoryTheme(card, themeKey, customAccent);
    else applyTheme(card, themeKey, customAccent);
    return card;
  }

  function buildMeasureCard({ isFirst, cardNum, totalPages, withContinueTab, withPageTab }) {
    const card = createShell();
    card.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;';
    card.innerHTML = buildHeader();
    if (isFirst) {
      if (buildFirstExtras) card.innerHTML += buildFirstExtras();
    } else {
      card.innerHTML += buildContinuationHtml(name, cardNum, totalPages);
    }
    const body = document.createElement('div');
    body.className = 'card-body';
    card.appendChild(body);
    if (withContinueTab) {
      const tab = document.createElement('div');
      tab.className = 'card-continue-tab';
      tab.innerHTML = `Continue to next card ${cardNum}/${totalPages} ▶`;
      card.appendChild(tab);
    } else if (withPageTab) {
      const tab = document.createElement('div');
      tab.className = 'card-page-tab';
      tab.textContent = `${cardNum}/${totalPages}`;
      card.appendChild(tab);
    }
    const corners = document.createElement('div');
    corners.className = 'card-corners';
    corners.innerHTML = buildCornersHtml();
    card.appendChild(corners);
    return { card, body };
  }

  function nodesFit(nodes, layout) {
    if (!nodes.length) return { fits: true };
    const { card, body } = buildMeasureCard(layout);
    for (const node of nodes) body.appendChild(node.cloneNode(true));
    document.body.appendChild(card);
    const fits = body.scrollHeight <= body.clientHeight + 1;
    document.body.removeChild(card);
    return { fits };
  }

  function normalizeNodes(nodes) {
    const layout = { isFirst: true, cardNum: 1, totalPages: 1, withContinueTab: false, withPageTab: false };
    const result = [];
    for (const node of nodes) {
      if (nodesFit([node], layout).fits) {
        result.push(node);
        continue;
      }
      const split = splitElementBySentences(node);
      result.push(...split);
    }
    return result;
  }

  function splitBodyNodes(nodes) {
    const pages = [];
    let idx = 0;
    let pageNum = 0;
    while (idx < nodes.length) {
      const isFirst = pageNum === 0;
      const cardNum = pageNum + 1;
      const remaining = nodes.slice(idx);
      if (nodesFit(remaining, {
        isFirst, cardNum, totalPages: 1, withContinueTab: false, withPageTab: false,
      }).fits) {
        pages.push(remaining);
        break;
      }
      let end = idx + 1;
      while (end <= nodes.length) {
        const slice = nodes.slice(idx, end);
        if (!nodesFit(slice, {
          isFirst, cardNum, totalPages: cardNum + 1, withContinueTab: true, withPageTab: false,
        }).fits) break;
        end += 1;
      }
      end -= 1;
      if (end <= idx) end = idx + 1;
      let pageNodes = nodes.slice(idx, end);
      if (pageNodes.length > 1 && isHigherLevelLabel(pageNodes[pageNodes.length - 1])) {
        pageNodes = pageNodes.slice(0, -1);
        end = idx + pageNodes.length;
      }
      pages.push(pageNodes);
      idx = end;
      pageNum += 1;
    }
    return pages;
  }

  function assemble(pages) {
    const totalPages = pages.length;
    return pages.map((pageNodes, pageIndex) => {
      const card = createShell();
      const isFirst = pageIndex === 0;
      const isLast = pageIndex === totalPages - 1;
      const cardNum = pageIndex + 1;
      card.innerHTML = buildHeader();
      if (isFirst) {
        if (buildFirstExtras) card.innerHTML += buildFirstExtras();
      } else {
        card.innerHTML += buildContinuationHtml(name, cardNum, totalPages);
      }
      const body = document.createElement('div');
      body.className = 'card-body';
      pageNodes.forEach((n) => body.appendChild(n.cloneNode(true)));
      card.appendChild(body);
      if (!isLast) {
        const tab = document.createElement('div');
        tab.className = 'card-continue-tab';
        tab.innerHTML = `Continue to next card ${cardNum}/${totalPages} ▶`;
        card.appendChild(tab);
      } else if (totalPages > 1) {
        const tab = document.createElement('div');
        tab.className = 'card-page-tab';
        tab.textContent = `${cardNum}/${totalPages}`;
        card.appendChild(tab);
      }
      const corner = document.createElement('div');
      corner.className = 'card-corners';
      corner.innerHTML = buildCornersHtml();
      card.appendChild(corner);
      fitCardTitles(card);
      return card;
    });
  }

  return { normalizeNodes, splitBodyNodes, assemble };
}

/* ── Spells ──────────────────────────────────────────────────── */

function buildSpellStatsHtml(spell) {
  return `
    <div class="card-stats">
      <div class="stat-item"><span class="stat-label">Range</span><span class="stat-value">${escapeHtml(spell.range)}</span></div>
      <div class="stat-item"><span class="stat-label">Cast time</span><span class="stat-value">${escapeHtml(spell.castTime)}</span></div>
      <div class="stat-item"><span class="stat-label">Duration</span><span class="stat-value">${escapeHtml(spell.duration)}</span></div>
    </div>
    <div class="card-components"><span class="stat-label">Component:</span> ${escapeHtml(spell.components)}</div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
}

function buildSpellHeaderHtml(spell, classKey) {
  const iconSvg = getClassIcon(classKey);
  const badges = [];
  if (spell.concentration) badges.push('<span class="badge">C</span>');
  if (spell.ritual) badges.push('<span class="badge">R</span>');
  const className = getThemeForClass(classKey).label;
  return `
    <div class="card-header">
      <div class="header-class">
        <div class="class-icon">${iconSvg}</div>
        <div class="class-name">${escapeHtml(className)}</div>
      </div>
      <div class="header-title">
        <div class="spell-name">${escapeHtml(spell.name)}</div>
        ${badges.join('')}
      </div>
      <div class="header-level">
        <div class="level-icon">✦</div>
        <div class="level-label">${escapeHtml(spell.levelLabel)}<br>${escapeHtml(spell.school)}</div>
      </div>
    </div>
  `;
}

export function renderSpellCards(spell, classKey, customAccent) {
  const resolvedClassKey = classKey || spell.classKey || 'custom';
  const helpers = makeMeasureHelpers({
    name: spell.name,
    themeKey: resolvedClassKey,
    useCategory: false,
    customAccent,
    buildHeader: () => buildSpellHeaderHtml(spell, resolvedClassKey),
    buildFirstExtras: () => buildSpellStatsHtml(spell),
  });

  const descHtml = markdownToHtml(spell.desc);
  const higherLevelHtml = markdownToHtml(spell.higherLevel);
  let allNodes;
  if (spell.level === 0 && spell.higherLevel) {
    allNodes = [...buildDescNodes(descHtml, null), ...buildCantripUpgradeNodes(higherLevelHtml)];
  } else {
    allNodes = buildDescNodes(descHtml, spell.higherLevel ? higherLevelHtml : '');
  }
  allNodes = helpers.normalizeNodes(allNodes);
  return helpers.assemble(helpers.splitBodyNodes(allNodes));
}

/* ── Generic small reference cards ───────────────────────────── */

function buildCategoryHeaderHtml(entry, typeKey, rightHtml) {
  const iconSvg = getCategoryIcon(typeKey);
  const label = getThemeForCategory(typeKey).label;
  return `
    <div class="card-header">
      <div class="header-class">
        <div class="class-icon">${iconSvg}</div>
        <div class="class-name">${escapeHtml(label)}</div>
      </div>
      <div class="header-title">
        <div class="spell-name">${escapeHtml(entry.name)}</div>
      </div>
      <div class="header-level">
        <div class="level-icon">✦</div>
        <div class="level-label">${rightHtml}</div>
      </div>
    </div>
  `;
}

function renderSimpleDescCards({
  entry, typeKey, rightHtml, statsHtml, customAccent,
}) {
  const helpers = makeMeasureHelpers({
    name: entry.name,
    themeKey: typeKey,
    useCategory: true,
    customAccent,
    buildHeader: () => buildCategoryHeaderHtml(entry, typeKey, rightHtml),
    buildFirstExtras: statsHtml ? () => statsHtml : null,
  });
  let nodes = buildDescNodes(markdownToHtml(entry.desc), '');
  nodes = helpers.normalizeNodes(nodes);
  return helpers.assemble(helpers.splitBodyNodes(nodes));
}

export function renderFeatCards(feat, customAccent) {
  const stats = `
    <div class="card-stats card-stats-2">
      <div class="stat-item"><span class="stat-label">Type</span><span class="stat-value">${escapeHtml(feat.type)}</span></div>
      <div class="stat-item"><span class="stat-label">Prerequisite</span><span class="stat-value">${escapeHtml(feat.prerequisite || '—')}</span></div>
    </div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
  return renderSimpleDescCards({
    entry: feat,
    typeKey: 'feats',
    rightHtml: escapeHtml(feat.type),
    statsHtml: stats,
    customAccent,
  });
}

export function renderEquipmentCards(item, customAccent) {
  const stats = `
    <div class="card-stats card-stats-2">
      <div class="stat-item"><span class="stat-label">Cost</span><span class="stat-value">${escapeHtml(item.cost)}</span></div>
      <div class="stat-item"><span class="stat-label">Weight</span><span class="stat-value">${escapeHtml(item.weight)}</span></div>
    </div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
  return renderSimpleDescCards({
    entry: item,
    typeKey: 'equipment',
    rightHtml: escapeHtml(item.category),
    statsHtml: stats,
    customAccent,
  });
}

export function renderConditionCards(condition, customAccent) {
  return renderSimpleDescCards({
    entry: condition,
    typeKey: 'conditions',
    rightHtml: 'Condition',
    statsHtml: `<div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>`,
    customAccent,
  });
}

export function renderMagicItemCards(item, customAccent) {
  const stats = `
    <div class="card-stats card-stats-2">
      <div class="stat-item"><span class="stat-label">Rarity</span><span class="stat-value">${escapeHtml(item.rarity)}</span></div>
      <div class="stat-item"><span class="stat-label">Attunement</span><span class="stat-value">${escapeHtml(item.attunement)}</span></div>
    </div>
    <div class="card-components"><span class="stat-label">Category:</span> ${escapeHtml(item.category)}</div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
  return renderSimpleDescCards({
    entry: item,
    typeKey: 'magic-items',
    rightHtml: escapeHtml(item.rarity),
    statsHtml: stats,
    customAccent,
  });
}

export function renderClassSkillCards(feature, classKey, customAccent) {
  const resolved = classKey || feature.classKey || 'custom';
  const className = getThemeForClass(resolved).label;
  const helpers = makeMeasureHelpers({
    name: feature.name,
    themeKey: resolved,
    useCategory: false,
    customAccent,
    buildHeader: () => `
      <div class="card-header">
        <div class="header-class">
          <div class="class-icon">${getClassIcon(resolved)}</div>
          <div class="class-name">${escapeHtml(feature.classLabel || className)}</div>
        </div>
        <div class="header-title">
          <div class="spell-name">${escapeHtml(feature.name)}</div>
        </div>
        <div class="header-level">
          <div class="level-icon">✦</div>
          <div class="level-label">${escapeHtml(feature.levelLabel)}<br>Feature</div>
        </div>
      </div>
    `,
    buildFirstExtras: () => `<div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>`,
  });
  let nodes = buildDescNodes(markdownToHtml(feature.desc), '');
  nodes = helpers.normalizeNodes(nodes);
  return helpers.assemble(helpers.splitBodyNodes(nodes));
}

/* ── Monsters (large cards) ──────────────────────────────────── */

function metaLine(label, value) {
  if (!value) return '';
  return `<div class="monster-meta"><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</div>`;
}

function isMonsterSectionTitle(node) {
  return node?.nodeType === 1 && node.classList?.contains('monster-section-title');
}

function buildMonsterSectionNodes(monster) {
  const nodes = [];

  const addSection = (title, entries) => {
    if (!entries?.length) return;
    const h = document.createElement('div');
    h.className = 'monster-section-title';
    h.textContent = title;
    nodes.push(h);
    for (const e of entries) {
      const p = document.createElement('p');
      p.className = 'monster-action';
      const wrap = document.createElement('div');
      wrap.innerHTML = markdownToHtml(e.desc);
      const inner = wrap.textContent ? wrap.innerHTML : escapeHtml(e.desc);
      p.innerHTML = `<strong>${escapeHtml(e.name)}.</strong> ${inner.replace(/<\/?p>/g, ' ').trim()}`;
      nodes.push(p);
    }
  };

  addSection('Traits', monster.traits);
  addSection('Actions', monster.actions);
  addSection('Bonus Actions', monster.bonusActions);
  addSection('Reactions', monster.reactions);
  if (monster.legendaryActions?.length) {
    addSection('Legendary Actions', monster.legendaryActions.map((e) => ({
      name: e.cost ? `${e.name} (Costs ${e.cost} Actions)` : e.name,
      desc: e.desc,
    })));
  }
  return nodes;
}

function buildMonsterHeaderBlock(monster) {
  const abilities = (monster.abilities || []).map((a) => `
    <div class="monster-ability">
      <span class="monster-ability-label">${escapeHtml(a.key)}</span>
      <span class="monster-ability-score">${escapeHtml(a.score)}</span>
      <span class="monster-ability-mod">(${escapeHtml(a.mod)})</span>
    </div>
  `).join('');

  const acText = monster.acDetail
    ? `${monster.ac} (${monster.acDetail})`
    : `${monster.ac ?? '—'}`;
  const hpText = monster.hitDice
    ? `${monster.hp} (${monster.hitDice})`
    : `${monster.hp ?? '—'}`;

  return `
    <div class="monster-header">
      <div class="monster-header-top">
        <div class="class-icon monster-header-icon">${getCategoryIcon('monsters')}</div>
        <div class="monster-header-text">
          <div class="monster-name">${escapeHtml(monster.name)}</div>
          <div class="monster-type-line">${escapeHtml(monster.typeLine)}</div>
        </div>
        <div class="monster-cr">${escapeHtml(monster.crLabel)}${monster.xp ? `<br><span class="monster-xp">${escapeHtml(monster.xp)} XP</span>` : ''}</div>
      </div>
    </div>
    <div class="monster-defenses">
      <div><span class="stat-label">AC</span> ${escapeHtml(acText)}</div>
      <div><span class="stat-label">HP</span> ${escapeHtml(hpText)}</div>
      <div><span class="stat-label">Speed</span> ${escapeHtml(monster.speed)}</div>
    </div>
    <div class="monster-abilities">${abilities}</div>
    <div class="monster-meta-block">
      ${metaLine('Saving Throws', monster.saves)}
      ${metaLine('Skills', monster.skills)}
      ${metaLine('Damage Immunities', monster.immunities)}
      ${metaLine('Damage Resistances', monster.resistances)}
      ${metaLine('Damage Vulnerabilities', monster.vulnerabilities)}
      ${metaLine('Condition Immunities', monster.conditionImmunities)}
      ${metaLine('Senses', monster.senses)}
      ${metaLine('Languages', monster.languages)}
    </div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
}

export function renderMonsterCards(monster, customAccent) {
  function createShell() {
    const card = document.createElement('div');
    card.className = 'spell-card monster-card';
    applyCategoryTheme(card, 'monsters', customAccent);
    return card;
  }

  function buildMeasureCard({ isFirst, cardNum, totalPages, withContinueTab, withPageTab }) {
    const card = createShell();
    card.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;';
    if (isFirst) card.innerHTML = buildMonsterHeaderBlock(monster);
    else card.innerHTML = buildContinuationHtml(monster.name, cardNum, totalPages);
    const body = document.createElement('div');
    body.className = 'card-body';
    card.appendChild(body);
    if (withContinueTab) {
      const tab = document.createElement('div');
      tab.className = 'card-continue-tab';
      tab.innerHTML = `Continue ${cardNum}/${totalPages} ▶`;
      card.appendChild(tab);
    } else if (withPageTab) {
      const tab = document.createElement('div');
      tab.className = 'card-page-tab';
      tab.textContent = `${cardNum}/${totalPages}`;
      card.appendChild(tab);
    }
    const corners = document.createElement('div');
    corners.className = 'card-corners';
    corners.innerHTML = buildCornersHtml();
    card.appendChild(corners);
    return { card, body };
  }

  function nodesFit(nodes, layout) {
    if (!nodes.length) return { fits: true };
    const { card, body } = buildMeasureCard(layout);
    nodes.forEach((n) => body.appendChild(n.cloneNode(true)));
    document.body.appendChild(card);
    const fits = body.scrollHeight <= body.clientHeight + 1;
    document.body.removeChild(card);
    return { fits };
  }

  let nodes = buildMonsterSectionNodes(monster);
  // sentence-split oversized paragraphs
  const normalized = [];
  for (const node of nodes) {
    if (nodesFit([node], {
      isFirst: true, cardNum: 1, totalPages: 1, withContinueTab: false, withPageTab: false,
    }).fits) {
      normalized.push(node);
    } else {
      normalized.push(...splitElementBySentences(node));
    }
  }
  nodes = normalized;

  const pages = [];
  let idx = 0;
  let pageNum = 0;
  while (idx < nodes.length) {
    const isFirst = pageNum === 0;
    const cardNum = pageNum + 1;
    const remaining = nodes.slice(idx);
    if (nodesFit(remaining, {
      isFirst, cardNum, totalPages: 1, withContinueTab: false, withPageTab: false,
    }).fits) {
      pages.push(remaining);
      break;
    }
    let end = idx + 1;
    while (end <= nodes.length) {
      if (!nodesFit(nodes.slice(idx, end), {
        isFirst, cardNum, totalPages: cardNum + 1, withContinueTab: true, withPageTab: false,
      }).fits) break;
      end += 1;
    }
    end -= 1;
    if (end <= idx) end = idx + 1;
    // Don't leave a section title alone at the end of a page
    let pageNodes = nodes.slice(idx, end);
    if (pageNodes.length > 1 && isMonsterSectionTitle(pageNodes[pageNodes.length - 1])) {
      pageNodes = pageNodes.slice(0, -1);
      end = idx + pageNodes.length;
    }
    pages.push(pageNodes);
    idx = end;
    pageNum += 1;
  }
  if (!pages.length) pages.push([]);

  const totalPages = pages.length;
  return pages.map((pageNodes, pageIndex) => {
    const card = createShell();
    const isFirst = pageIndex === 0;
    const isLast = pageIndex === totalPages - 1;
    const cardNum = pageIndex + 1;
    if (isFirst) card.innerHTML = buildMonsterHeaderBlock(monster);
    else card.innerHTML = buildContinuationHtml(monster.name, cardNum, totalPages);
    const body = document.createElement('div');
    body.className = 'card-body';
    pageNodes.forEach((n) => body.appendChild(n.cloneNode(true)));
    card.appendChild(body);
    if (!isLast) {
      const tab = document.createElement('div');
      tab.className = 'card-continue-tab';
      tab.innerHTML = `Continue ${cardNum}/${totalPages} ▶`;
      card.appendChild(tab);
    } else if (totalPages > 1) {
      const tab = document.createElement('div');
      tab.className = 'card-page-tab';
      tab.textContent = `${cardNum}/${totalPages}`;
      card.appendChild(tab);
    }
    const corner = document.createElement('div');
    corner.className = 'card-corners';
    corner.innerHTML = buildCornersHtml();
    card.appendChild(corner);
    fitCardTitles(card);
    return card;
  });
}

/* ── Backs + dispatcher ──────────────────────────────────────── */

export function renderCardBack(themeKey, customAccent, { useCategory = false, label } = {}) {
  const card = useCategory
    ? createSmallCardShell(themeKey, customAccent, { useCategory: true })
    : createSmallCardShell(themeKey, customAccent, { useCategory: false });
  card.classList.add('spell-card-back');
  if (themeKey === 'monsters') card.classList.add('monster-card');

  const iconSvg = useCategory ? getCategoryIcon(themeKey) : getClassIcon(themeKey);
  const text = label
    || (useCategory ? getThemeForCategory(themeKey).label : getThemeForClass(themeKey).label);

  card.innerHTML = `
    <div class="card-back-content">
      <div class="card-back-icon">${iconSvg}</div>
      <div class="card-back-class">${escapeHtml(text)}</div>
    </div>
    <div class="card-corners">${buildCornersHtml()}</div>
  `;
  return card;
}

export function renderCardsForEntry(entry, activeClassKey) {
  const type = entry.cardType || 'spells';
  const accent = entry.customAccent;

  switch (type) {
    case 'spells':
      return renderSpellCards(
        entry,
        entry.source === 'custom' ? (entry.classKey || 'custom') : activeClassKey,
        accent,
      );
    case 'class-skills':
      return renderClassSkillCards(entry, entry.classKey || activeClassKey, accent);
    case 'feats':
      return renderFeatCards(entry, accent);
    case 'equipment':
      return renderEquipmentCards(entry, accent);
    case 'conditions':
      return renderConditionCards(entry, accent);
    case 'magic-items':
      return renderMagicItemCards(entry, accent);
    case 'monsters':
      return renderMonsterCards(entry, accent);
    default:
      return [];
  }
}

export function renderBackForEntry(entry, activeClassKey) {
  const type = entry.cardType || 'spells';
  const accent = entry.customAccent;
  if (type === 'spells') {
    const key = entry.source === 'custom' ? (entry.classKey || 'custom') : activeClassKey;
    return renderCardBack(key, accent, { useCategory: false });
  }
  if (type === 'class-skills') {
    return renderCardBack(entry.classKey || activeClassKey, accent, { useCategory: false });
  }
  return renderCardBack(type, accent, { useCategory: true });
}
