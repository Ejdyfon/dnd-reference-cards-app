import { markdownToHtml } from './markdown.js';
import { applyTheme, getThemeForClass } from './class-themes.js';
import { getClassIcon } from './icons.js';

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

function buildContinuationHtml(spell, cardNum, totalPages) {
  return `
    <div class="card-continuation-header">
      <span class="continuation-name">${spell.name}</span>
      <span class="continuation-page">${cardNum}/${totalPages}</span>
    </div>
    <div class="card-divider"><span class="divider-line"></span><span class="divider-diamond">◆</span><span class="divider-line"></span></div>
  `;
}

function buildCornersHtml() {
  return `
    <span class="corner tl">✦</span>
    <span class="corner tr">✦</span>
    <span class="corner bl">✦</span>
    <span class="corner br">✦</span>
  `;
}

/** Shrink gothic titles until they fit without mid-word wrapping. */
function fitTitleText(el, { maxPt = 13, minPt = 7.5, maxLines = 2 } = {}) {
  if (!el) return;

  let size = maxPt;
  el.style.fontSize = `${size}pt`;
  el.style.whiteSpace = 'nowrap';

  // Prefer a single line when possible
  while (size > minPt && el.scrollWidth > el.clientWidth + 1) {
    size -= 0.25;
    el.style.fontSize = `${size}pt`;
  }

  if (el.scrollWidth <= el.clientWidth + 1) {
    el.style.whiteSpace = 'nowrap';
    return;
  }

  // Allow wrapping for multi-word names, still shrink to stay within maxLines
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

  if (wasDetached) {
    document.body.removeChild(card);
    card.style.position = '';
    card.style.visibility = '';
    card.style.left = '';
    card.style.top = '';
  }
}

function buildMeasureCard(spell, classKey, { isFirst, cardNum, totalPages, withContinueTab, withPageTab }) {
  const card = createCardShell(spell, classKey, null);
  card.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;';

  card.innerHTML = buildHeaderHtml(spell, classKey);
  if (isFirst) {
    card.innerHTML += buildStatsHtml(spell);
  } else {
    card.innerHTML += buildContinuationHtml(spell, cardNum, totalPages);
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

function nodesFit(nodes, spell, classKey, layout) {
  if (!nodes.length) return true;

  const { card, body } = buildMeasureCard(spell, classKey, layout);
  for (const node of nodes) {
    body.appendChild(node.cloneNode(true));
  }

  document.body.appendChild(card);
  const fits = body.scrollHeight <= body.clientHeight + 1;
  const metrics = {
    scrollHeight: body.scrollHeight,
    clientHeight: body.clientHeight,
    fits,
  };
  document.body.removeChild(card);
  return { fits, metrics };
}

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

function normalizeNodesForSplitting(nodes, spell, classKey) {
  const layout = {
    isFirst: true,
    cardNum: 1,
    totalPages: 1,
    withContinueTab: false,
    withPageTab: false,
  };

  const result = [];
  for (const node of nodes) {
    if (nodesFit([node], spell, classKey, layout).fits) {
      result.push(node);
      continue;
    }

    const split = splitElementBySentences(node);
    if (split.length === 1) {
      result.push(node);
      continue;
    }

    for (const part of split) {
      result.push(part);
    }
  }
  return result;
}

function splitBodyNodes(nodes, spell, classKey) {
  const pages = [];
  let idx = 0;
  let pageNum = 0;

  while (idx < nodes.length) {
    const isFirst = pageNum === 0;
    const cardNum = pageNum + 1;
    const remaining = nodes.slice(idx);

    const singlePage = nodesFit(remaining, spell, classKey, {
      isFirst,
      cardNum,
      totalPages: 1,
      withContinueTab: false,
      withPageTab: false,
    });

    if (singlePage.fits) {
      pages.push(remaining);
      break;
    }

    let end = idx + 1;
    while (end <= nodes.length) {
      const slice = nodes.slice(idx, end);
      const result = nodesFit(slice, spell, classKey, {
        isFirst,
        cardNum,
        totalPages: cardNum + 1,
        withContinueTab: true,
        withPageTab: false,
      });
      if (!result.fits) break;
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

export function renderSpellCards(spell, classKey, customAccent) {
  const resolvedClassKey = classKey || 'custom';
  const descHtml = markdownToHtml(spell.desc);
  const higherLevelHtml = markdownToHtml(spell.higherLevel);

  let allNodes;
  if (spell.level === 0 && spell.higherLevel) {
    allNodes = [...buildDescNodes(descHtml, null), ...buildCantripUpgradeNodes(higherLevelHtml)];
  } else {
    allNodes = buildDescNodes(descHtml, spell.higherLevel ? higherLevelHtml : '');
  }

  allNodes = normalizeNodesForSplitting(allNodes, spell, resolvedClassKey);

  const pages = splitBodyNodes(allNodes, spell, resolvedClassKey);
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
      card.innerHTML += buildContinuationHtml(spell, cardNum, totalPages);
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

export function renderCardBack(classKey, customAccent) {
  const resolvedClassKey = classKey || 'custom';
  const card = createCardShell(null, resolvedClassKey, customAccent);
  card.classList.add('spell-card-back');

  const iconSvg = getClassIcon(resolvedClassKey);
  const className = getThemeForClass(resolvedClassKey).label;

  card.innerHTML = `
    <div class="card-back-content">
      <div class="card-back-icon">${iconSvg}</div>
      <div class="card-back-class">${className}</div>
    </div>
    <div class="card-corners">${buildCornersHtml()}</div>
  `;

  return card;
}
