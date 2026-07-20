import { markdownToHtml } from './markdown.js';
import { applyTheme } from './class-themes.js';
import { getClassIcon } from './icons.js';

const BODY_HEIGHT_IN = 1.85;
const BODY_HEIGHT_PX = BODY_HEIGHT_IN * 96;

function buildStatsHtml(spell) {
  return `
    <div class="card-stats">
      <div class="stat-item"><span class="stat-label">Range</span><span class="stat-value">${spell.range}</span></div>
      <div class="stat-item"><span class="stat-label">Cast time</span><span class="stat-value">${spell.castTime}</span></div>
      <div class="stat-item"><span class="stat-label">Duration</span><span class="stat-value">${spell.duration}</span></div>
    </div>
    <div class="card-components"><span class="stat-label">Component:</span> ${spell.components}</div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
}

function buildBadges(spell) {
  const badges = [];
  if (spell.concentration) badges.push('<span class="badge">C</span>');
  if (spell.ritual) badges.push('<span class="badge">R</span>');
  return badges.join('');
}

function createCardShell(spell, classKey, customAccent) {
  const card = document.createElement('div');
  card.className = 'spell-card';
  applyTheme(card, classKey, customAccent);
  return card;
}

function buildHeaderHtml(spell, classKey) {
  const iconSvg = getClassIcon(classKey);
  const levelSchool = `${spell.levelLabel}<br>${spell.school}`;
  const badges = buildBadges(spell);
  const className = classKey.charAt(0).toUpperCase() + classKey.slice(1);
  return `
    <div class="card-header">
      <div class="header-class">
        <div class="class-icon">${iconSvg}</div>
        <div class="class-name">${className}</div>
      </div>
      <div class="header-title">
        <div class="spell-name">${spell.name}</div>
        ${badges}
      </div>
      <div class="header-level">
        <div class="level-icon">✦</div>
        <div class="level-label">${levelSchool}</div>
      </div>
    </div>
  `;
}

function measureNodes(nodes, card) {
  const probe = document.createElement('div');
  probe.className = 'card-body-probe';
  probe.style.cssText = `position:absolute;visibility:hidden;width:${card.offsetWidth || 228}px;font-size:9pt;line-height:1.35;`;
  document.body.appendChild(probe);
  const heights = nodes.map((n) => {
    probe.appendChild(n.cloneNode(true));
    const h = probe.scrollHeight;
    probe.innerHTML = '';
    return h;
  });
  document.body.removeChild(probe);
  return heights;
}

function splitBodyNodes(nodes, maxPx) {
  const pages = [];
  let current = [];
  let used = 0;

  for (const node of nodes) {
    const h = node._measuredHeight ?? 40;
    if (used + h > maxPx && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(node);
    used += h;
  }
  if (current.length) pages.push(current);
  return pages;
}

function buildDescNodes(descHtml, higherLevelHtml) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = descHtml;
  const nodes = Array.from(wrapper.childNodes).filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));

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

export function renderSpellCards(spell, classKey, customAccent) {
  const resolvedClassKey = classKey || 'custom';
  const descHtml = markdownToHtml(spell.desc);
  const higherLevelHtml = markdownToHtml(spell.higherLevel);

  const isCantrip = spell.level === 0 && spell.higherLevel;
  let allNodes;

  if (isCantrip && spell.higherLevel) {
    const descNodes = buildDescNodes(descHtml, null);
    const upgradeNodes = buildCantripUpgradeNodes(higherLevelHtml);
    allNodes = [...descNodes, ...upgradeNodes];
  } else {
    allNodes = buildDescNodes(descHtml, spell.higherLevel ? higherLevelHtml : '');
  }

  const probeCard = document.createElement('div');
  probeCard.className = 'spell-card';
  probeCard.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;';
  document.body.appendChild(probeCard);

  const heights = measureNodes(allNodes, probeCard);
  allNodes.forEach((n, i) => { n._measuredHeight = heights[i]; });
  document.body.removeChild(probeCard);

  const pages = splitBodyNodes(allNodes, BODY_HEIGHT_PX);
  const totalPages = pages.length;

  return pages.map((pageNodes, pageIndex) => {
    const card = createCardShell(spell, resolvedClassKey, customAccent);
    const isFirst = pageIndex === 0;
    const isLast = pageIndex === totalPages - 1;
    const cardNum = pageIndex + 1;

    card.innerHTML = buildHeaderHtml(spell, resolvedClassKey);

    if (isFirst) {
      card.innerHTML += buildStatsHtml(spell);
    } else {
      card.innerHTML += `
        <div class="card-continuation-header">
          <span class="continuation-name">${spell.name}</span>
          <span class="continuation-page">${cardNum}/${totalPages}</span>
        </div>
        <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
      `;
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
    corner.innerHTML = `
      <span class="corner tl">✦</span>
      <span class="corner tr">✦</span>
      <span class="corner bl">✦</span>
      <span class="corner br">✦</span>
    `;
    card.appendChild(corner);

    return card;
  });
}
