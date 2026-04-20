/* ================================================================
   problems.js  -  Verifiable Problems page logic
   Handles routing, data fetching, and DOM rendering.
   ================================================================ */

'use strict';

/* ---------- Utilities ---------- */

function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatBest(str) {
    if (!str) return null;
    return esc(String(str)).replace(/(\w[\w.]*)\^(\d+)/g, '$1<sup>$2</sup>');
}

async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.json();
}

function showError(container, msg) {
    container.innerHTML = `<div class="error-state"><strong>Error:</strong> ${esc(msg)}</div>`;
}

function highlightJSON(str) {
    const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
        .replace(/(&quot;[\w\s]+&quot;)\s*:/g, '<span class="tok-key">$1</span>:')
        .replace(/\b(-?\d+)\b/g, '<span class="tok-num">$1</span>')
        .replace(/([{}\[\],])/g, '<span class="tok-punc">$1</span>')
        .replace(/\.\.\./g, '<span class="tok-ellip">...</span>');
}

function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
}

function getIndexPath() {
    return (typeof window !== 'undefined' && window.__WIP_MODE) ? 'wip-index.json' : 'index.json';
}

/* ---------- Leaderboard type detection ---------- */

function detectLeaderboardType(rows) {
    if (!rows || rows.length === 0) return 'generic';
    const first = rows[0];
    if ('mod4' in first && 'best' in first) return 'hadamard';
    if ('params' in first && 'status' in first) return 'conway';
    if ('naive' in first && 'best' in first) return 'tensor';
    if ('method' in first && 'solved' in first) return 'rna';
    if ('sequence' in first && 'optimal' in first) return 'hp';
    if ('best' in first && 'pct' in first) return 'stilllife';
    if ('size' in first && 'depth' in first && 'optimal_size' in first) return 'sorting';
    if ('k' in first && 'value' in first && 'type' in first) return 'waerden';
    if ('s' in first && 'value' in first && 'type' in first) return 'ramsey';
    if ('nl' in first && 'du' in first) return 'sbox';
    if ('best_d' in first && 'bound' in first) return 'codes';
    return 'generic';
}

/* ---------- Problem cards (index view) ---------- */

function renderProblemCard(meta) {
    const a = document.createElement('a');
    a.className = 'problem-card-link';
    a.href = `?problem=${encodeURIComponent(meta.id)}`;
    a.innerHTML = `
        <div class="problem-card">
            <div class="problem-card__left">
                <div class="problem-card__meta">
                    <span class="tag tag--domain">${esc(meta.domain)}</span>
                </div>
                <h3>${esc(meta.title)}</h3>
                <p>${esc(meta.subtitle || '')}</p>
            </div>
            <div class="problem-card__right">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                </svg>
            </div>
        </div>`;
    return a;
}

/* ---------- Leaderboard renderers ---------- */

function renderHadamardLeaderboard(lb, collapsed) {
    const maxVisible = collapsed ? 10 : lb.rows.length;
    const rows = lb.rows.map((row, i) => {
        const bestHTML = row.best ? formatBest(row.best) : '<span style="color:var(--text-tertiary)">-</span>';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track"><div class="pct-bar-fill" style="width:${row.pct}%"></div></div>
                   <span class="pct-value">${row.pct.toFixed(2)}%</span>
               </div>`
            : `<span class="pct-unknown">-</span>`;
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const hidden = i >= maxVisible ? ' style="display:none" data-extra-row' : '';
        return `
        <tr${hidden}>
            <td class="td-n"><div class="n-label">${row.n}</div>${noteHTML}</td>
            <td class="td-mod">${row.mod4}</td>
            <td class="td-best">${bestHTML}</td>
            <td class="td-pct">${pctHTML}</td>
        </tr>`;
    }).join('');

    const showMore = (collapsed && lb.rows.length > maxVisible)
        ? `<tr class="show-more-row"><td colspan="4" style="text-align:center;padding:var(--space-3)"><button class="show-more-btn">Show all ${lb.rows.length} rows</button></td></tr>`
        : '';

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr>
                <th>n</th><th class="td-mod">n mod 4</th><th>Best Known (factored)</th><th>% of Bound</th>
            </tr></thead>
            <tbody>${rows}${showMore}</tbody>
        </table>`;
}

function renderConwayLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const statusHTML = row.status === 'Unknown'
            ? '<span class="status-open"><span class="status-dot"></span>Open</span>'
            : `<span class="status-solved">${esc(row.status)}</span>`;
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${row.n.toLocaleString()}</div>${noteHTML}</td>
            <td class="td-best" style="font-size:0.82rem">${esc(row.params)}</td>
            <td class="td-status">${statusHTML}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>Vertices</th><th>Parameters</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderTensorLeaderboard(lb, collapsed) {
    const maxVisible = collapsed ? 8 : lb.rows.length;
    const rows = lb.rows.map((row, i) => {
        const sizeLabel = String(row.n).replace(/,/g, ' \u00d7 ');
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track"><div class="pct-bar-fill" style="width:${row.pct}%"></div></div>
                   <span class="pct-value">${row.pct.toFixed(1)}%</span>
               </div>`
            : `<span class="pct-unknown">-</span>`;
        const hidden = i >= maxVisible ? ' style="display:none" data-extra-row' : '';
        return `
        <tr${hidden}>
            <td class="td-n"><div class="n-label">${esc(sizeLabel)}</div>${noteHTML}</td>
            <td class="td-mod">${row.naive}</td>
            <td class="td-best" style="font-weight:700">${row.best}</td>
            <td class="td-pct">${pctHTML}</td>
        </tr>`;
    }).join('');

    const showMore = (collapsed && lb.rows.length > maxVisible)
        ? `<tr class="show-more-row"><td colspan="4" style="text-align:center;padding:var(--space-3)"><button class="show-more-btn">Show all ${lb.rows.length} rows</button></td></tr>`
        : '';

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>Size</th><th class="td-mod">Naive</th><th>Record</th><th>% of Naive</th></tr></thead>
            <tbody>${rows}${showMore}</tbody>
        </table>`;
}

function renderStillLifeLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track"><div class="pct-bar-fill" style="width:${row.pct}%"></div></div>
                   <span class="pct-value">${row.pct.toFixed(1)}%</span>
               </div>`
            : `<span class="pct-unknown">-</span>`;
        return `
        <tr>
            <td class="td-n"><div class="n-label">${row.n} \u00d7 ${row.n}</div>${noteHTML}</td>
            <td class="td-best" style="font-weight:700">${row.best}</td>
            <td class="td-pct">${pctHTML}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>Box Size</th><th>Live Cells</th><th>Density (%)</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderRNALeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${esc(row.method)}</div>${noteHTML}</td>
            <td class="td-mod">${row.year}</td>
            <td class="td-best" style="font-weight:700">${esc(row.solved)}</td>
            <td class="td-mod">${esc(row.time)}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>Method</th><th>Year</th><th>Solved</th><th>Time</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderSortingLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const sizeOpt = row.optimal_size
            ? '<span class="status-solved">Proven</span>'
            : '<span class="status-open"><span class="status-dot"></span>Open</span>';
        const depthOpt = row.optimal_depth
            ? '<span class="status-solved">Proven</span>'
            : '<span class="status-open"><span class="status-dot"></span>Open</span>';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${row.n}</div>${noteHTML}</td>
            <td class="td-best" style="font-weight:700">${row.size}</td>
            <td class="td-mod">${sizeOpt}</td>
            <td class="td-best">${row.depth}</td>
            <td class="td-mod">${depthOpt}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>n</th><th>Size</th><th>Size Optimal?</th><th>Depth</th><th>Depth Optimal?</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderWaerdenLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const typeHTML = row.type === 'exact'
            ? '<span class="status-solved">Exact</span>'
            : '<span class="status-open"><span class="status-dot"></span>Lower bound</span>';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${row.k}</div>${noteHTML}</td>
            <td class="td-best" style="font-weight:700">${esc(row.value)}</td>
            <td class="td-status">${typeHTML}</td>
            <td class="td-mod">${esc(row.year)}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>k</th><th>W(2,k)</th><th>Status</th><th>Year</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderRamseyLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const typeHTML = row.type === 'exact'
            ? '<span class="status-solved">Exact</span>'
            : '<span class="status-open"><span class="status-dot"></span>Bounds</span>';
        return `
        <tr>
            <td class="td-n"><div class="n-label">R(${row.s},${row.s})</div>${noteHTML}</td>
            <td class="td-best" style="font-weight:700">${esc(row.value)}</td>
            <td class="td-status">${typeHTML}</td>
            <td class="td-mod">${esc(row.year)}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>Number</th><th>Value / Bounds</th><th>Status</th><th>Year</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderSBoxLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${esc(row.name)}</div>${noteHTML}</td>
            <td class="td-best" style="font-weight:700">${row.nl}</td>
            <td class="td-best">${row.du}</td>
            <td class="td-mod">${row.deg}</td>
            <td class="td-mod">${row.year}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>S-Box</th><th>Nonlinearity</th><th>Diff. Unif.</th><th>Degree</th><th>Year</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderCodesLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const gap = (row.bound != null && row.best_d != null) ? row.bound - row.best_d : '-';
        return `
        <tr>
            <td class="td-n"><div class="n-label">${row.n}</div>${noteHTML}</td>
            <td class="td-mod">${row.k}</td>
            <td class="td-best" style="font-weight:700">${row.best_d}</td>
            <td class="td-mod">${row.bound}</td>
            <td class="td-mod">${gap}</td>
        </tr>`;
    }).join('');
    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>n</th><th>k</th><th>Best d</th><th>Bound</th><th>Gap</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderHPLeaderboard(lb, collapsed) {
    const maxVisible = collapsed ? 6 : lb.rows.length;
    const rows = lb.rows.map((row, i) => {
        const optLabel = row.optimal
            ? '<span class="status-solved" style="font-size:0.75rem">Proven</span>'
            : '<span class="status-open"><span class="status-dot"></span>Open</span>';
        const noteHTML = row.note ? `<span class="row-note">${esc(row.note)}</span>` : '';
        const hidden = i >= maxVisible ? ' style="display:none" data-extra-row' : '';
        const seq = esc(row.sequence || '');
        const seqHTML = seq
            ? `<code class="hp-seq" title="${seq}" style="font-size:0.7rem;word-break:break-all;line-height:1.3;display:block;max-width:320px;font-family:var(--font-mono, monospace);color:var(--color-text-secondary, #888)">${seq}</code>`
            : '';
        return `
        <tr${hidden}>
            <td class="td-n"><div class="n-label">${esc(row.id)}</div>${noteHTML}</td>
            <td class="td-mod">${row.length}</td>
            <td style="max-width:340px">${seqHTML}</td>
            <td class="td-best" style="font-weight:700">${row.best}</td>
            <td class="td-status">${optLabel}</td>
        </tr>`;
    }).join('');

    const showMore = (collapsed && lb.rows.length > maxVisible)
        ? `<tr class="show-more-row"><td colspan="5" style="text-align:center;padding:var(--space-3)"><button class="show-more-btn">Show all ${lb.rows.length} rows</button></td></tr>`
        : '';

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr><th>ID</th><th>Length</th><th>Sequence</th><th>Best H-H</th><th>Optimal?</th></tr></thead>
            <tbody>${rows}${showMore}</tbody>
        </table>`;
}

function renderLeaderboard(lb, collapsed) {
    const type = detectLeaderboardType(lb.rows);
    let tableHTML;
    switch (type) {
        case 'hadamard':  tableHTML = renderHadamardLeaderboard(lb, collapsed); break;
        case 'conway':    tableHTML = renderConwayLeaderboard(lb); break;
        case 'tensor':    tableHTML = renderTensorLeaderboard(lb, collapsed); break;
        case 'rna':       tableHTML = renderRNALeaderboard(lb); break;
        case 'hp':        tableHTML = renderHPLeaderboard(lb, collapsed); break;
        case 'stilllife': tableHTML = renderStillLifeLeaderboard(lb); break;
        case 'sorting':   tableHTML = renderSortingLeaderboard(lb); break;
        case 'waerden':   tableHTML = renderWaerdenLeaderboard(lb); break;
        case 'ramsey':    tableHTML = renderRamseyLeaderboard(lb); break;
        case 'sbox':      tableHTML = renderSBoxLeaderboard(lb); break;
        case 'codes':     tableHTML = renderCodesLeaderboard(lb); break;
        default:          tableHTML = renderHadamardLeaderboard(lb, collapsed); break;
    }

    const section = el('div', 'leaderboard-section');
    section.innerHTML = `
        <div class="leaderboard-header">
            <h3>Current Records</h3>
            <span class="leaderboard-note">${esc(lb.note)}</span>
        </div>
        <div class="table-wrapper">${tableHTML}</div>`;

    // Wire up "Show all" button
    setTimeout(() => {
        const btn = section.querySelector('.show-more-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                section.querySelectorAll('[data-extra-row]').forEach(r => r.style.display = '');
                btn.closest('tr').remove();
            });
        }
    }, 0);

    return section;
}

/* ---------- Section renderers ---------- */

function renderPersonCard(person) {
    if (typeof person === 'string') return `<span class="attribution-names">${esc(person)}</span>`;
    let socialHtml = '';
    if (person.linkedin || person.scholar) {
        socialHtml = '<div class="attribution-card__social">';
        if (person.linkedin) socialHtml += `<a href="${esc(person.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>`;
        if (person.scholar) socialHtml += `<a href="${esc(person.scholar)}" target="_blank" rel="noopener" aria-label="Google Scholar"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg></a>`;
        socialHtml += '</div>';
    }
    return `<div class="attribution-card">
        ${person.photo ? `<img src="${esc(person.photo)}" alt="${esc(person.name)}" class="attribution-card__photo">` : ''}
        <div class="attribution-card__info">
            <span class="attribution-card__name">${esc(person.name)}</span>
            <div class="attribution-card__meta">
                ${person.institution ? `<span class="attribution-card__institution">${esc(person.institution)}</span>` : ''}
                ${socialHtml}
            </div>
        </div>
    </div>`;
}

function renderAttribution(data) {
    const attr = data.attribution;
    if (!attr) return null;

    const div = el('div', 'attribution-block');
    const people = [];
    if (attr.authors) attr.authors.forEach(a => people.push(a));
    if (attr.reviewers) attr.reviewers.forEach(r => people.push(r));
    if (people.length === 0) people.push('CAISc 2026 Program Committee');

    const cards = people.map(p => renderPersonCard(p)).join('');
    div.innerHTML = `<div class="attribution-row">
        <span class="tag tag--domain">Curated and Reviewed By</span>
        <div class="attribution-people">${cards}</div>
    </div>`;
    return div;
}

function renderSubmitCTA() {
    const div = el('div', 'submit-cta');
    div.innerHTML = `
        <a href="https://openreview.net/group?id=CAISc/2026" class="btn btn--secondary" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Submit on OpenReview
        </a>`;
    return div;
}

function renderOrigin(data) {
    const div = el('div', 'context-box');
    div.innerHTML = `<h3 class="section-heading">Origin</h3><p>${esc(data.origin)}</p>`;
    return div;
}

function renderInstance(data) {
    const p = el('p', 'problem-description');
    p.textContent = data.instance;
    return p;
}

function renderWarmup(warmup) {
    if (!warmup) return null;
    const div = el('div', 'section-block warmup-block');
    let dataHTML = '';

    if (warmup.matrix) {
        const matrixStr = warmup.matrix.map(row => '  [' + row.join(', ') + ']').join('\n');
        dataHTML = `<div class="code-block" style="font-size:0.78rem;line-height:1.5">[\\n${matrixStr}\\n]</div>`;
    } else if (warmup.target) {
        dataHTML = `<div class="code-block" style="font-size:0.82rem;line-height:1.6"><span class="tok-key">Target:</span>   ${esc(warmup.target)}\n<span class="tok-key">Solution:</span> ${esc(warmup.solution || '')}</div>`;
    } else if (warmup.sequence) {
        const coordStr = warmup.solution
            ? JSON.stringify(warmup.solution).replace(/\],/g, '],\n  ')
            : '';
        dataHTML = `<div class="code-block" style="font-size:0.82rem;line-height:1.6"><span class="tok-key">Sequence:</span> ${esc(warmup.sequence)}${coordStr ? `\n<span class="tok-key">Coords:</span>   ${coordStr}` : ''}</div>`;
    }

    div.innerHTML = `
        <h3>${esc(warmup.title)}</h3>
        <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-4)">${esc(warmup.body)}</p>
        ${dataHTML}`;
    return div;
}

function renderGameOfLifeWidget() {
    const ROWS = 20, COLS = 20, CELL = 15;
    const W = COLS * CELL, H = ROWS * CELL;
    let grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
    let running = false, timer = null, gen = 0;

    const wrap = el('div', 'section-block warmup-block gol-widget');
    const heading = el('h3', null, 'Try It: Game of Life');
    const desc = el('p', null);
    desc.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-4)';
    desc.innerHTML = 'Each cell has 8 neighbors (horizontal, vertical, diagonal). A live cell survives if it has 2 or 3 live neighbors, otherwise it dies. A dead cell becomes alive if it has exactly 3 live neighbors. Click cells to toggle alive/dead. Press Space or Play to run. A still life stays unchanged. Try building one!';

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    function getColor(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function draw() {
        const alive = getColor('--accent') || '#6c63ff';
        const dead = getColor('--bg-secondary') || '#1a1a2e';
        const line = getColor('--border') || '#333';
        ctx.fillStyle = dead;
        ctx.fillRect(0, 0, W, H);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    ctx.fillStyle = alive;
                    ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
                }
            }
        }
        ctx.strokeStyle = line;
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
        }
    }

    function countNeighbors(r, c) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) n += grid[nr][nc];
            }
        }
        return n;
    }

    function step() {
        const next = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const nb = countNeighbors(r, c);
                if (grid[r][c]) next[r][c] = (nb === 2 || nb === 3) ? 1 : 0;
                else next[r][c] = (nb === 3) ? 1 : 0;
            }
        }
        grid = next;
        gen++;
        draw();
        status.textContent = 'Generation ' + gen;
    }

    function toggleRun() {
        running = !running;
        if (running) {
            timer = setInterval(step, 150);
            playBtn.textContent = 'Pause';
            playBtn.classList.add('gol-btn--active');
        } else {
            clearInterval(timer);
            playBtn.textContent = 'Play';
            playBtn.classList.remove('gol-btn--active');
        }
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / CELL);
        const r = Math.floor((e.clientY - rect.top) / CELL);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = grid[r][c] ? 0 : 1;
            draw();
        }
    });

    const controls = el('div', 'gol-controls');
    const playBtn = el('button', 'gol-btn', 'Play');
    const stepBtn = el('button', 'gol-btn', 'Step');
    const randomBtn = el('button', 'gol-btn', 'Random');
    const clearBtn = el('button', 'gol-btn', 'Clear');

    playBtn.addEventListener('click', toggleRun);
    stepBtn.addEventListener('click', () => { if (!running) step(); });
    randomBtn.addEventListener('click', () => {
        grid = Array.from({ length: ROWS }, () => {
            const row = new Uint8Array(COLS);
            for (let c = 0; c < COLS; c++) row[c] = Math.random() < 0.3 ? 1 : 0;
            return row;
        });
        gen = 0; draw(); status.textContent = 'Generation 0';
    });
    clearBtn.addEventListener('click', () => {
        if (running) toggleRun();
        grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        gen = 0; draw(); status.textContent = 'Generation 0';
    });

    controls.append(playBtn, stepBtn, randomBtn, clearBtn);

    const status = el('div', 'gol-status', 'Generation 0');

    wrap.append(heading, desc, canvas, controls, status);

    // Keyboard: spacebar toggles play/pause
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement === document.body) {
            e.preventDefault();
            toggleRun();
        }
    });

    // Redraw on theme change
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    setTimeout(draw, 0);
    return wrap;
}

/* ---------- Sorting Network Playground ---------- */

function renderSortingNetworkWidget() {
    const KNOWN_OPTIMAL = {
        4: [[1,2],[3,4],[1,3],[2,4],[2,3]],
        5: [[1,2],[4,5],[1,4],[2,5],[2,4],[3,5],[1,3],[2,3],[4,5]],
        6: [[1,2],[3,4],[5,6],[1,3],[2,5],[4,6],[1,4],[2,3],[5,6],[2,4],[3,5],[3,4]]
    };

    let n = 4;
    let comps = KNOWN_OPTIMAL[4].map(c => [...c]);
    let animating = false;
    let animTimer = null;

    // Layout constants
    const PAD_L = 30, PAD_R = 30, PAD_T = 30, PAD_B = 40;
    const WIRE_GAP = 30, COMP_GAP = 28, DOT_R = 4;

    function layers(network, nw) {
        const used = new Array(nw + 1).fill(0);
        const result = [];
        for (const [a, b] of network) {
            const layer = Math.max(used[a], used[b]);
            result.push(layer);
            used[a] = layer + 1;
            used[b] = layer + 1;
        }
        return result;
    }

    function canvasSize() {
        const ly = layers(comps, n);
        const depth = ly.length > 0 ? Math.max(...ly) + 1 : 1;
        const w = PAD_L + Math.max(depth, 4) * COMP_GAP + PAD_R + 40;
        const h = PAD_T + (n - 1) * WIRE_GAP + PAD_B;
        return { w, h, depth };
    }

    function networkRightEdge(layerAssignments) {
        const depth = layerAssignments.length > 0 ? Math.max(...layerAssignments) + 1 : 1;
        const displayDepth = Math.max(depth, 4);
        return PAD_L + displayDepth * COMP_GAP + 20;
    }

    function getColor(v) {
        return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    }

    function draw(highlight) {
        const { w, h } = canvasSize();
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');

        const wire = getColor('--text-tertiary') || '#888';
        const comp = getColor('--accent') || '#6c63ff';
        const bg = getColor('--bg-primary') || '#fff';
        const swapColor = '#e74c3c';
        const noSwapColor = '#2ecc71';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Wire labels
        ctx.fillStyle = getColor('--text-secondary') || '#aaa';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 1; i <= n; i++) {
            const y = PAD_T + (i - 1) * WIRE_GAP;
            ctx.fillText(String(i), PAD_L - 8, y);
        }

        // Wires
        const ly = layers(comps, n);
        const rightEdge = networkRightEdge(ly);
        ctx.strokeStyle = wire;
        ctx.lineWidth = 1.5;
        for (let i = 1; i <= n; i++) {
            const y = PAD_T + (i - 1) * WIRE_GAP;
            ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(rightEdge, y); ctx.stroke();
        }

        // Comparators
        for (let ci = 0; ci < comps.length; ci++) {
            const [a, b] = comps[ci];
            const layer = ly[ci];
            const x = PAD_L + (layer + 0.5) * COMP_GAP;
            const ya = PAD_T + (a - 1) * WIRE_GAP;
            const yb = PAD_T + (b - 1) * WIRE_GAP;

            let color = comp;
            if (highlight && highlight.idx === ci) {
                color = highlight.swapped ? swapColor : noSwapColor;
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yb); ctx.stroke();

            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, ya, DOT_R, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, yb, DOT_R, 0, Math.PI * 2); ctx.fill();
        }

        // Draw animated values on wires if present
        if (highlight && highlight.values) {
            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const x = highlight.idx >= 0
                ? PAD_L + (ly[highlight.idx] + 1) * COMP_GAP + 8
                : PAD_L - 2;
            for (let i = 0; i < highlight.values.length; i++) {
                const y = PAD_T + i * WIRE_GAP;
                ctx.fillStyle = highlight.values[i] ? (getColor('--accent') || '#6c63ff') : (getColor('--text-tertiary') || '#888');
                ctx.fillText(String(highlight.values[i]), x, y);
            }
        }
    }

    function verify() {
        const total = 1 << n;
        let pass = 0;
        for (let mask = 0; mask < total; mask++) {
            const arr = [];
            for (let i = 0; i < n; i++) arr.push((mask >> i) & 1);
            for (const [a, b] of comps) {
                const ai = a - 1, bi = b - 1;
                if (arr[ai] > arr[bi]) { const t = arr[ai]; arr[ai] = arr[bi]; arr[bi] = t; }
            }
            let sorted = true;
            for (let i = 0; i + 1 < n; i++) { if (arr[i] > arr[i + 1]) { sorted = false; break; } }
            if (sorted) pass++;
        }
        return { pass, total };
    }

    function updateStatus() {
        const { pass, total } = verify();
        const valid = pass === total;
        status.innerHTML = `<strong>${comps.length}</strong> comparators, depth <strong>${comps.length > 0 ? Math.max(...layers(comps, n)) + 1 : 0}</strong> | Sorts <strong>${pass}/${total}</strong> inputs${valid ? ' <span style="color:#2ecc71">&#10003; Valid network!</span>' : ''}`;
    }

    // Click handling: add/remove comparators
    function handleCanvasClick(e) {
        if (animating) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const ly = layers(comps, n);
        const rightEdge = networkRightEdge(ly);
        // Check if clicking on an existing comparator to remove it
        for (let ci = 0; ci < comps.length; ci++) {
            const [a, b] = comps[ci];
            const x = PAD_L + (ly[ci] + 0.5) * COMP_GAP;
            const ya = PAD_T + (a - 1) * WIRE_GAP;
            const yb = PAD_T + (b - 1) * WIRE_GAP;
            if (Math.abs(mx - x) < 8 && my >= Math.min(ya, yb) - 6 && my <= Math.max(ya, yb) + 6) {
                comps.splice(ci, 1);
                draw(); updateStatus();
                return;
            }
        }

        // Otherwise: find two closest wires to add a comparator at the end
        const wireIdx = Math.round((my - PAD_T) / WIRE_GAP);
        if (wireIdx < 0 || wireIdx >= n) return;

        // Store first wire
        if (canvas._firstWire == null) {
            canvas._firstWire = wireIdx + 1;
            canvas.style.cursor = 'pointer';
            // Highlight the selected wire
            draw();
            const ctx = canvas.getContext('2d');
            const y = PAD_T + wireIdx * WIRE_GAP;
            ctx.strokeStyle = getColor('--accent') || '#6c63ff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(rightEdge, y); ctx.stroke();
            return;
        }

        const second = wireIdx + 1;
        const first = canvas._firstWire;
        canvas._firstWire = null;
        canvas.style.cursor = 'crosshair';

        if (first !== second) {
            const a = Math.min(first, second), b = Math.max(first, second);
            comps.push([a, b]);
        }
        draw(); updateStatus();
    }

    function animateInput() {
        if (animating) { stopAnim(); return; }
        // Pick a random input
        const mask = Math.floor(Math.random() * (1 << n));
        const vals = [];
        for (let i = 0; i < n; i++) vals.push((mask >> i) & 1);

        animating = true;
        animBtn.textContent = 'Stop';
        animBtn.classList.add('gol-btn--active');
        let step = -1;

        function tick() {
            if (step >= comps.length) {
                // Final state
                let sorted = true;
                for (let i = 0; i + 1 < n; i++) { if (vals[i] > vals[i + 1]) { sorted = false; break; } }
                status.innerHTML = `Result: [${vals.join(', ')}] ${sorted ? '<span style="color:#2ecc71">Sorted!</span>' : '<span style="color:#e74c3c">Not sorted</span>'}`;
                stopAnim();
                return;
            }

            if (step >= 0) {
                const [a, b] = comps[step];
                const ai = a - 1, bi = b - 1;
                const swapped = vals[ai] > vals[bi];
                if (swapped) { const t = vals[ai]; vals[ai] = vals[bi]; vals[bi] = t; }
                draw({ idx: step, swapped, values: vals });
            } else {
                draw({ idx: -1, swapped: false, values: vals });
            }
            step++;
            animTimer = setTimeout(tick, 400);
        }
        tick();
    }

    function stopAnim() {
        animating = false;
        clearTimeout(animTimer);
        animBtn.textContent = 'Animate';
        animBtn.classList.remove('gol-btn--active');
    }

    // Build DOM
    const wrap = el('div', 'section-block warmup-block sn-widget');
    const heading = el('h3', null, 'Try It: Sorting Network');
    const desc = el('p', null);
    desc.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-4)';
    desc.innerHTML = 'A sorting network is a fixed sequence of compare-and-swap operations (vertical bars) connecting horizontal wires. Each comparator looks at two wires and swaps their values if they are out of order. A network is valid when it correctly sorts <em>every</em> possible input. The challenge is to find the fewest comparators that still guarantee correctness for all 2<sup>n</sup> inputs.'
        + '<br><br>Click two wires to add a comparator. Click an existing one to remove it. <strong>Animate</strong> sends a random binary input through the network step by step (green = no swap needed, red = swap). <strong>Verify</strong> tests all 2<sup>n</sup> inputs and reports how many are sorted correctly.';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'border:1px solid var(--border);border-radius:6px;cursor:crosshair;display:block;margin:0 auto var(--space-4)';
    canvas.addEventListener('click', handleCanvasClick);

    // n selector
    const nSel = el('div', 'sn-n-selector');
    nSel.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:var(--space-4)';
    const nLabel = el('span', null, 'Wires:');
    nLabel.style.cssText = 'font-size:var(--text-sm);color:var(--text-secondary);font-weight:500';
    nSel.appendChild(nLabel);
    for (const nVal of [4, 5, 6]) {
        const btn = el('button', 'gol-btn', String(nVal));
        if (nVal === n) btn.classList.add('gol-btn--active');
        btn.addEventListener('click', () => {
            if (animating) stopAnim();
            n = nVal;
            comps = KNOWN_OPTIMAL[nVal].map(c => [...c]);
            nSel.querySelectorAll('button').forEach(b => b.classList.remove('gol-btn--active'));
            btn.classList.add('gol-btn--active');
            canvas._firstWire = null;
            draw(); updateStatus();
        });
        nSel.appendChild(btn);
    }

    const controls = el('div', 'gol-controls');
    const animBtn = el('button', 'gol-btn', 'Animate');
    const verifyBtn = el('button', 'gol-btn', 'Verify');
    const resetBtn = el('button', 'gol-btn', 'Reset');
    const clearBtn = el('button', 'gol-btn', 'Clear');

    animBtn.addEventListener('click', animateInput);
    verifyBtn.addEventListener('click', () => { if (!animating) updateStatus(); });
    resetBtn.addEventListener('click', () => {
        if (animating) stopAnim();
        comps = KNOWN_OPTIMAL[n].map(c => [...c]);
        canvas._firstWire = null;
        draw(); updateStatus();
    });
    clearBtn.addEventListener('click', () => {
        if (animating) stopAnim();
        comps = [];
        canvas._firstWire = null;
        draw(); updateStatus();
    });

    controls.append(animBtn, verifyBtn, resetBtn, clearBtn);

    const status = el('div', 'gol-status');

    wrap.append(heading, desc, nSel, canvas, controls, status);

    // Theme change redraw
    const obs = new MutationObserver(() => { if (!animating) draw(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    setTimeout(() => { draw(); updateStatus(); }, 0);
    return wrap;
}

function renderSubmissionBlock(data) {
    const div = el('div', 'section-block');
    div.innerHTML = `
        <h3>Submission Format</h3>
        <div class="code-block">${highlightJSON(data.submissionExample)}</div>
        <div class="verify-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            ${esc(data.verification)}
        </div>`;
    return div;
}

function renderBounds(bounds) {
    if (!bounds || bounds.length === 0) return null;
    const rows = bounds.map(b => `
        <li>
            <span class="mod-key">${esc(b.label)}</span>
            <span class="bound-detail">
                <span class="bound-name">${esc(b.name)}:</span> ${esc(b.formula)}
            </span>
        </li>`).join('');

    const details = document.createElement('details');
    details.className = 'accordion';
    details.open = true;
    details.innerHTML = `
        <summary>Bounds &amp; Constraints</summary>
        <div class="accordion-body"><ul class="bounds-list">${rows}</ul></div>`;
    return details;
}

function renderScoring(scoring) {
    if (!scoring) return null;
    const metrics = scoring.metrics ? scoring.metrics.map(m =>
        `<li><strong>${esc(m.name)}:</strong> ${esc(m.description)}</li>`
    ).join('') : '';

    const div = el('div', 'section-block scoring-block');
    div.innerHTML = `
        <h3>Scoring &amp; Evaluation</h3>
        <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-3)">${esc(scoring.summary)}</p>
        ${metrics ? `<ul class="scoring-metrics">${metrics}</ul>` : ''}
        ${scoring.note ? `<p class="scoring-note">${esc(scoring.note)}</p>` : ''}`;
    return div;
}

function renderApproachSection(data) {
    const steps = data.suggestedApproach || [];
    const items = steps.map(s =>
        `<li><p><strong>${esc(s.title)}:</strong> ${esc(s.body)}</p></li>`
    ).join('');

    const div = el('div', 'section-block');
    let html = '';
    if (items) html += `<ol class="steps">${items}</ol>`;

    if (data.agentPrompt) {
        html += `
            <div style="margin-top:var(--space-6)">
                <h4 style="margin-bottom:var(--space-3);font-size:var(--text-base)">AI Agent Instructions</h4>
                <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3);line-height:1.5">
                    Click the button below to get a complete prompt you can paste into your AI agent. It includes the problem description, constraints, references, and task instructions.${
                    ['hadamard-maximal-determinant', 'matrix-multiplication-tensor-rank', 'hp-protein-folding'].includes(data.id)
                    ? ' <strong>Note:</strong> This prompt targets a specific instance. Refer to the leaderboard above to try a different one.'
                    : ''}
                </p>
                <button class="copy-agent-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    Copy agent.md
                </button>
            </div>`;
    }

    div.innerHTML = html;
    return div;
}

function renderReferences(refs) {
    if (!refs || refs.length === 0) return null;
    const items = refs.map((r, i) => {
        const num = i + 1;
        if (typeof r === 'object' && r.text) {
            if (r.url) {
                return `<li><span class="ref-num">[${num}]</span> <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.text)}</a></li>`;
            }
            return `<li><span class="ref-num">[${num}]</span> ${esc(r.text)}</li>`;
        }
        return `<li><span class="ref-num">[${num}]</span> ${esc(r)}</li>`;
    }).join('');

    const div = el('div', 'references-section');
    div.innerHTML = `<h3>References</h3><ol class="refs-list refs-list--numbered">${items}</ol>`;
    return div;
}

function renderCiteBlock(data) {
    const attr = data.attribution;
    if (!attr) return null;
    const authors = attr.authors
        ? attr.authors.map(a => typeof a === 'string' ? a : a.name).join(', ')
        : 'CAISc 2026';
    const reviewers = (attr.reviewers && attr.reviewers.length > 0)
        ? attr.reviewers.map(r => typeof r === 'string' ? r : r.name).join(', ')
        : 'CAISc 2026 Program Committee';
    const year = '2026';
    const title = data.title;

    const div = el('div', 'cite-block');
    div.innerHTML = `
        <h3>Cite This Problem</h3>
        <div class="code-block cite-bibtex">Curated by ${esc(authors)} (${year}). ${esc(title)}. Reviewed by ${esc(reviewers)}. CAISc 2026 Verifiable Problems Track. https://caisc2026.github.io/verifiable-problems/?problem=${esc(data.id)}</div>`;
    return div;
}

function renderWitnessExample(witness) {
    if (!witness) return null;
    const details = document.createElement('details');
    details.className = 'accordion';

    let matrixHTML = '';
    if (witness.matrix) {
        const rows = witness.matrix.map(row =>
            '  [' + row.map(v => v === 1 ? '+1' : '-1').join(', ') + ']'
        ).join('\n');
        matrixHTML = `<div class="code-block" style="font-size:0.72rem;line-height:1.4;max-height:300px;overflow:auto;margin-top:var(--space-3)">[\n${rows}\n]</div>`;
    }

    details.innerHTML = `
        <summary>Record-Holding Matrix</summary>
        <div class="accordion-body">
            <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6">${esc(witness.note)}</p>
            ${matrixHTML}
        </div>`;
    return details;
}

/* ---------- Build agent.md content ---------- */

function buildAgentMD(data) {
    let md = `# ${data.title}\n\n`;

    md += `## Task\n${data.agentPrompt}\n\n`;
    md += `## Problem\n${data.instance}\n\n`;
    md += `## Background\n${data.origin}\n\n`;

    if (data.bounds && data.bounds.length > 0) {
        md += `## Bounds & Constraints\n`;
        data.bounds.forEach(b => { md += `- **${b.name}** (${b.label}): ${b.formula}\n`; });
        md += '\n';
    }

    if (data.scoring) {
        md += `## Scoring\n${data.scoring.summary}\n`;
        if (data.scoring.metrics) {
            data.scoring.metrics.forEach(m => { md += `- **${m.name}:** ${m.description}\n`; });
        }
        md += '\n';
    }

    md += `## Submission Format\n\`\`\`json\n${data.submissionExample}\n\`\`\`\n\n`;
    md += `## Verification\n${data.verification}\n\n`;

    if (data.references && data.references.length > 0) {
        md += `## References\n`;
        data.references.forEach((r, i) => {
            const text = (typeof r === 'object') ? r.text : r;
            const url = (typeof r === 'object' && r.url) ? ` ${r.url}` : '';
            md += `[${i + 1}] ${text}${url}\n`;
        });
    }

    return md;
}

/* ---------- Divider ---------- */

function renderDivider() {
    const hr = document.createElement('hr');
    hr.className = 'section-divider';
    return hr;
}

/* ---------- Video map for manim animations ---------- */
const VIDEO_MAP = {
    'hadamard-maximal-determinant': { src: 'videos/HadamardScene.mp4', poster: 'videos/thumbs/HadamardScene.jpg' },
    'conways-99-graph': { src: 'videos/ConwayScene.mp4', poster: 'videos/thumbs/ConwayScene.jpg' },
    'matrix-multiplication-tensor-rank': { src: 'videos/TensorRankScene.mp4', poster: 'videos/thumbs/TensorRankScene.jpg' },
    'connected-still-life': { src: 'videos/StillLifeScene.mp4', poster: 'videos/thumbs/StillLifeScene.jpg' }
};

function renderVideo(problemId) {
    const entry = VIDEO_MAP[problemId];
    if (!entry) return null;
    const div = el('div', 'video-block');
    div.innerHTML = `
        <video controls preload="metadata" playsinline poster="${entry.poster}">
            <source src="${entry.src}" type="video/mp4">
        </video>`;
    return div;
}

/* ---------- Detail page ---------- */

async function renderDetail(container, meta, showBack) {
    let data;
    try { data = await fetchJSON(meta.file); }
    catch (e) { showError(container, e.message); return; }

    // Collapse hero when viewing detail
    const hero = document.querySelector('.problems-hero');
    if (hero) hero.style.display = 'none';

    const section = el('section', 'problem-detail');

    // Back link
    if (showBack) {
        const back = el('a', 'back-link');
        back.href = 'index.html';
        back.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg> All Problems`;
        section.appendChild(back);
    }

    /* 1. HEADER: title only, clean */
    const header = el('div', 'problem-header');
    header.innerHTML = `<h2>${esc(data.title)}</h2>`;
    section.appendChild(header);

    /* 1b. ATTRIBUTION: Curated by / Reviewed by */
    const attrEl = renderAttribution(data);
    if (attrEl) section.appendChild(attrEl);

    /* 2. THE PROBLEM: instance text + collapsible context */
    const problemCard = el('div', 'section-card');
    const problemHeading = el('h3', 'section-card__title');
    problemHeading.textContent = 'The Problem';
    problemCard.appendChild(problemHeading);

    problemCard.appendChild(renderInstance(data));

    if (data.warmup) {
        const warmupEl = renderWarmup(data.warmup);
        if (warmupEl) problemCard.appendChild(warmupEl);
    }

    // Interactive Game of Life widget (connected-still-life only)
    if (data.id === 'connected-still-life') {
        const golWidget = renderGameOfLifeWidget();
        if (golWidget) problemCard.appendChild(golWidget);
    }

    // Interactive Sorting Network widget (sorting-networks only)
    // if (data.id === 'sorting-networks') {
    //     const snWidget = renderSortingNetworkWidget();
    //     if (snWidget) problemCard.appendChild(snWidget);
    // }

    // Collapsible "Additional Context" with origin + video
    const videoEl = renderVideo(data.id);
    if (data.origin || videoEl) {
        const contextDetails = document.createElement('details');
        contextDetails.className = 'accordion';
        contextDetails.open = true;
        const summary = document.createElement('summary');
        summary.textContent = 'Background and Context';
        contextDetails.appendChild(summary);

        const body = el('div', 'accordion-body');
        if (data.origin) {
            const originP = el('p', 'context-origin');
            originP.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-4)';
            originP.textContent = data.origin;
            body.appendChild(originP);
        }
        if (videoEl) {
            body.appendChild(videoEl);
        }
        contextDetails.appendChild(body);
        problemCard.appendChild(contextDetails);
    }

    section.appendChild(problemCard);

    /* 3. HOW TO SUBMIT (single-column rows) */
    const submitCard = el('div', 'section-card');
    const solHeading = el('h3', 'section-card__title');
    solHeading.textContent = 'How to Submit';
    submitCard.appendChild(solHeading);

    // Submission format (full width)
    submitCard.appendChild(renderSubmissionBlock(data));

    // Witness example (Hadamard) right after submission format
    if (data.witnessExample) {
        submitCard.appendChild(renderWitnessExample(data.witnessExample));
    }

    // Bounds (full width, with explanatory note)
    const boundsEl = renderBounds(data.bounds);
    if (boundsEl) {
        const boundsWrap = el('div', 'section-block bounds-section');
        boundsWrap.appendChild(boundsEl);
        const boundsNote = el('p', 'bounds-explanation');
        boundsNote.textContent = 'These constraints and theoretical bounds define the problem space. Your submission is verified and scored within these limits.';
        boundsWrap.appendChild(boundsNote);
        submitCard.appendChild(boundsWrap);
    }

    // Scoring
    const scoringEl = renderScoring(data.scoring);
    if (scoringEl) submitCard.appendChild(scoringEl);

    // Submit button at bottom of this section
    const submitBtnWrap = el('div', 'submit-cta-section');
    submitBtnWrap.innerHTML = `
        <a href="https://openreview.net/group?id=CAISc/2026" class="btn btn--secondary" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Submit on OpenReview
        </a>`;
    submitCard.appendChild(submitBtnWrap);

    section.appendChild(submitCard);

    /* 4. HOW TO APPROACH */
    const approachCard = el('div', 'section-card');
    const appHeading = el('h3', 'section-card__title');
    appHeading.textContent = 'How to Approach';
    approachCard.appendChild(appHeading);
    approachCard.appendChild(renderApproachSection(data));
    section.appendChild(approachCard);

    /* 5. CURRENT RECORDS (leaderboard, moved down) */
    if (data.leaderboard) {
        const lbCard = el('div', 'section-card');
        lbCard.appendChild(renderLeaderboard(data.leaderboard, true));
        section.appendChild(lbCard);
    }

    /* 6. REFERENCES (flat numbered list) */
    if (data.references) {
        const refsCard = el('div', 'section-card');
        refsCard.appendChild(renderReferences(data.references));
        section.appendChild(refsCard);
    }

    /* 7. CITE THIS PROBLEM */
    const citeCard = el('div', 'section-card');
    const citeEl = renderCiteBlock(data);
    if (citeEl) citeCard.appendChild(citeEl);
    section.appendChild(citeCard);

    container.replaceWith(section);

    // Wire up "Copy agent.md" button
    const copyBtn = section.querySelector('.copy-agent-btn');
    if (copyBtn && data.agentPrompt) {
        copyBtn.addEventListener('click', () => {
            const md = buildAgentMD(data);
            navigator.clipboard.writeText(md).then(() => {
                copyBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Copied!`;
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Copy agent.md`;
                }, 2000);
            });
        });
    }
}

/* ---------- Index view ---------- */

async function renderIndex(container) {
    let index;
    try { index = await fetchJSON(getIndexPath()); }
    catch (e) { showError(container, e.message); return; }

    // Show hero on index view
    const hero = document.querySelector('.problems-hero');
    if (hero) hero.style.display = '';

    if (!index.problems || index.problems.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);padding:var(--space-8) var(--content-padding)">No problems published yet. Check back April 15, 2026.</p>';
        return;
    }

    if (index.problems.length === 1) {
        await renderDetail(container, index.problems[0], false);
        return;
    }

    const section = el('section', 'problems-index');
    for (const meta of index.problems) {
        section.appendChild(renderProblemCard(meta));
    }
    container.replaceWith(section);
}

/* ---------- Bootstrap ---------- */

async function init() {
    const container = document.getElementById('main-content');
    const params = new URLSearchParams(location.search);
    const problemId = params.get('problem');

    let index;
    try { index = await fetchJSON(getIndexPath()); }
    catch (e) { showError(container, e.message); return; }

    if (problemId) {
        const meta = index.problems.find(p => p.id === problemId);
        if (!meta) { showError(container, `Problem "${esc(problemId)}" not found.`); return; }
        await renderDetail(container, meta, index.problems.length > 1);
    } else {
        await renderIndex(container);
    }
}

document.addEventListener('DOMContentLoaded', init);
