/* ================================================================
   problems.js — Verifiable Problems page logic
   Handles routing, data fetching, and DOM rendering.
   ================================================================ */

'use strict';

// ===== Utilities =====

function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Convert "2^22" notation to HTML with <sup> tags
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

// ===== Syntax highlight a JSON string for display =====
function highlightJSON(str) {
    const escaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escaped
        .replace(/(&quot;[\w\s]+&quot;)\s*:/g, '<span class="tok-key">$1</span>:')
        .replace(/\b(-?\d+)\b/g, '<span class="tok-num">$1</span>')
        .replace(/([{}\[\],])/g, '<span class="tok-punc">$1</span>')
        .replace(/\.\.\./g, '<span class="tok-ellip">...</span>');
}

// ===== Detect leaderboard type from row data =====
function detectLeaderboardType(rows) {
    if (!rows || rows.length === 0) return 'generic';
    const first = rows[0];
    if ('mod4' in first && 'best' in first) return 'hadamard';
    if ('params' in first && 'status' in first) return 'conway';
    if ('naive' in first && 'best' in first) return 'tensor';
    if ('best' in first && 'pct' in first) return 'stilllife';
    return 'generic';
}

// ===== Renderers =====

function renderProblemCard(meta) {
    const a = document.createElement('a');
    a.className = 'problem-card-link';
    a.href = `?problem=${encodeURIComponent(meta.id)}`;
    a.innerHTML = `
        <div class="problem-card">
            <div class="problem-card__left">
                <div class="problem-card__meta">
                    <span class="tag tag--domain">${esc(meta.domain)}</span>
                    <span class="tag tag--open">${esc(meta.statusLabel)}</span>
                </div>
                <h3>${esc(meta.title)}</h3>
                <p>${esc(meta.tagline)}</p>
            </div>
            <div class="problem-card__right">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                </svg>
            </div>
        </div>`;
    return a;
}

// ===== Leaderboard renderers by type =====

function renderHadamardLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const bestHTML = row.best ? formatBest(row.best) : '<span style="color:var(--text-tertiary)">—</span>';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track">
                       <div class="pct-bar-fill" style="width:${row.pct}%"></div>
                   </div>
                   <span class="pct-value">${row.pct.toFixed(2)}%</span>
               </div>`
            : `<span class="pct-unknown">—</span>`;
        const starTag = row.note
            ? ` <span class="tag tag--star" title="${esc(row.note)}">★</span>`
            : '';

        return `
        <tr${row.note ? ' class="row-highlight"' : ''}>
            <td class="td-n"><div class="n-label">${row.n}${starTag}</div></td>
            <td class="td-mod">${row.mod4}</td>
            <td class="td-best">${bestHTML}</td>
            <td class="td-pct">${pctHTML}</td>
            <td class="td-status"><span class="status-open"><span class="status-dot"></span>Open</span></td>
        </tr>`;
    }).join('');

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr>
                <th>n</th>
                <th class="td-mod">n mod 4</th>
                <th>Best Known (factored)</th>
                <th>% of Bound</th>
                <th>Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderConwayLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const statusClass = row.status === 'Unknown' ? 'status-unknown' : 'status-exists';
        const statusHTML = row.status === 'Unknown'
            ? '<span class="status-open"><span class="status-dot"></span>Unknown</span>'
            : `<span class="status-solved">${esc(row.status)}</span>`;
        const noteHTML = row.note ? ` <span class="tag tag--star" title="${esc(row.note)}">★</span>` : '';

        return `
        <tr${row.status === 'Unknown' ? ' class="row-highlight"' : ''}>
            <td class="td-n"><div class="n-label">${row.n.toLocaleString()}${noteHTML}</div></td>
            <td class="td-best" style="font-size:0.82rem">${esc(row.params)}</td>
            <td class="td-status">${statusHTML}</td>
        </tr>`;
    }).join('');

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr>
                <th>Vertices</th>
                <th>Parameters</th>
                <th>Status</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderTensorLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        // Format "2,3,4" as "2 × 3 × 4"
        const sizeLabel = String(row.n).replace(/,/g, ' × ');
        const noteHTML = row.note ? ` <span class="tag tag--star" title="${esc(row.note)}">★</span>` : '';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track">
                       <div class="pct-bar-fill" style="width:${row.pct}%"></div>
                   </div>
                   <span class="pct-value">${row.pct.toFixed(1)}%</span>
               </div>`
            : `<span class="pct-unknown">—</span>`;

        return `
        <tr${row.pct != null ? ' class="row-highlight"' : ''}>
            <td class="td-n"><div class="n-label">${esc(sizeLabel)}${noteHTML}</div></td>
            <td class="td-mod">${row.naive}</td>
            <td class="td-best" style="font-weight:700">${row.best}</td>
            <td class="td-pct">${pctHTML}</td>
        </tr>`;
    }).join('');

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr>
                <th>Size</th>
                <th class="td-mod">Naive</th>
                <th>Record</th>
                <th>% of Naive</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderStillLifeLeaderboard(lb) {
    const rows = lb.rows.map(row => {
        const noteHTML = row.note ? ` <span class="tag tag--star" title="${esc(row.note)}">★</span>` : '';
        const pctHTML = (row.pct != null)
            ? `<div class="pct-cell">
                   <div class="pct-bar-track">
                       <div class="pct-bar-fill" style="width:${row.pct}%"></div>
                   </div>
                   <span class="pct-value">${row.pct.toFixed(1)}%</span>
               </div>`
            : `<span class="pct-unknown">—</span>`;

        return `
        <tr${row.note && row.note.includes('Open') ? ' class="row-highlight"' : ''}>
            <td class="td-n"><div class="n-label">${row.n} × ${row.n}${noteHTML}</div></td>
            <td class="td-best" style="font-weight:700">${row.best}</td>
            <td class="td-pct">${pctHTML}</td>
        </tr>`;
    }).join('');

    return `
        <table class="leaderboard" aria-label="Leaderboard">
            <thead><tr>
                <th>Box Size</th>
                <th>Live Cells</th>
                <th>Density (%)</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderLeaderboard(lb) {
    const type = detectLeaderboardType(lb.rows);
    let tableHTML;
    switch (type) {
        case 'hadamard':  tableHTML = renderHadamardLeaderboard(lb); break;
        case 'conway':    tableHTML = renderConwayLeaderboard(lb); break;
        case 'tensor':    tableHTML = renderTensorLeaderboard(lb); break;
        case 'stilllife': tableHTML = renderStillLifeLeaderboard(lb); break;
        default:          tableHTML = renderHadamardLeaderboard(lb); break;
    }

    const section = document.createElement('div');
    section.className = 'leaderboard-section';
    section.innerHTML = `
        <div class="leaderboard-header">
            <h3>Current Records</h3>
            <span class="leaderboard-note">${esc(lb.note)}</span>
        </div>
        <div class="table-wrapper">${tableHTML}</div>`;
    return section;
}

function renderWarmup(warmup) {
    if (!warmup) return null;

    const div = document.createElement('div');
    div.className = 'section-block warmup-block';

    // Format the matrix as a readable string
    const matrixStr = warmup.matrix
        ? warmup.matrix.map(row => '  [' + row.join(', ') + ']').join('\n')
        : '';

    div.innerHTML = `
        <h3>${esc(warmup.title)}</h3>
        <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-4)">${esc(warmup.body)}</p>
        ${matrixStr ? `<div class="code-block" style="font-size:0.78rem;line-height:1.5">[\n${matrixStr}\n]</div>` : ''}`;
    return div;
}

function renderSubmissionBlock(data) {
    const div = document.createElement('div');
    div.className = 'section-block';
    div.innerHTML = `
        <h3>Submission Format</h3>
        <div class="code-block">${highlightJSON(data.submissionExample)}</div>
        <div class="verify-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            ${esc(data.verification)}
        </div>
        <p style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary);">
            Submissions open April 15, 2026. Submit via GitHub.
        </p>
        <div style="margin-top:var(--space-3);">
            <span class="btn btn--disabled">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right:5px">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                Submit — Opens April 15
            </span>
        </div>`;
    return div;
}

function renderHowToStart(steps) {
    const items = steps.map(s =>
        `<li><p><strong>${esc(s.title)}</strong> — ${esc(s.body)}</p></li>`
    ).join('');

    const div = document.createElement('div');
    div.className = 'section-block';
    div.innerHTML = `<h3>How to Start</h3><ol class="steps">${items}</ol>`;
    return div;
}

function renderBoundsAccordion(bounds) {
    const rows = bounds.map(b => `
        <li>
            <span class="mod-key">${esc(b.mod)}</span>
            <span class="bound-detail">
                <span class="bound-name">${esc(b.name)}</span> — ${esc(b.formula)}
            </span>
        </li>`).join('');

    const details = document.createElement('details');
    details.className = 'accordion';
    details.open = true;
    details.innerHTML = `
        <summary>Bounds &amp; Constraints</summary>
        <div class="accordion-body">
            <ul class="bounds-list">${rows}</ul>
        </div>`;
    return details;
}

function renderRefsAccordion(refs) {
    const items = refs.map(r => `<li>${esc(r)}</li>`).join('');

    const details = document.createElement('details');
    details.className = 'accordion';
    details.innerHTML = `
        <summary>References</summary>
        <div class="accordion-body">
            <ul class="refs-list">${items}</ul>
        </div>`;
    return details;
}

function renderDivider() {
    const hr = document.createElement('hr');
    hr.className = 'section-divider';
    return hr;
}

// ===== Page views =====

async function renderIndex(container) {
    let index;
    try { index = await fetchJSON('index.json'); }
    catch (e) { showError(container, e.message); return; }

    if (!index.problems || index.problems.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);padding:var(--space-8) var(--content-padding)">No problems published yet. Check back April 15, 2026.</p>';
        return;
    }

    // Single problem: skip the list and jump straight to detail
    if (index.problems.length === 1) {
        await renderDetail(container, index.problems[0], false);
        return;
    }

    // Multiple problems: card list
    const section = document.createElement('section');
    section.className = 'problems-index';
    for (const meta of index.problems) {
        section.appendChild(renderProblemCard(meta));
    }
    container.replaceWith(section);
}

async function renderDetail(container, meta, showBack) {
    let data;
    try { data = await fetchJSON(meta.file); }
    catch (e) { showError(container, e.message); return; }

    const section = document.createElement('section');
    section.className = 'problem-detail';

    // Back link
    if (showBack) {
        const back = document.createElement('a');
        back.className = 'back-link';
        back.href = 'index.html';
        back.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
            All Problems`;
        section.appendChild(back);
    }

    // Header
    const header = document.createElement('div');
    header.className = 'problem-header';
    header.innerHTML = `
        <h2>${esc(data.title)}</h2>
        <div class="problem-meta">
            <span class="tag tag--domain">${esc(data.domain)}</span>
            <span class="tag tag--open">${esc(data.statusLabel)}</span>
        </div>`;
    section.appendChild(header);

    // Description
    const desc = document.createElement('p');
    desc.className = 'problem-description';
    desc.textContent = data.description;
    section.appendChild(desc);

    // Context
    const ctx = document.createElement('div');
    ctx.className = 'context-box';
    ctx.innerHTML = `<p>${esc(data.context)}</p>`;
    section.appendChild(ctx);

    // Warmup (Conway)
    if (data.warmup) {
        const warmupEl = renderWarmup(data.warmup);
        if (warmupEl) section.appendChild(warmupEl);
    }

    // Leaderboard
    if (data.leaderboard) {
        section.appendChild(renderLeaderboard(data.leaderboard));
    }

    section.appendChild(renderDivider());

    // Two-column: submission + how to start
    const twocol = document.createElement('div');
    twocol.className = 'two-col';
    if (data.submissionExample) twocol.appendChild(renderSubmissionBlock(data));
    if (data.howToStart)        twocol.appendChild(renderHowToStart(data.howToStart));
    section.appendChild(twocol);

    section.appendChild(renderDivider());

    // Technical details
    const techHeading = document.createElement('h3');
    techHeading.style.cssText = 'margin-top:0;margin-bottom:var(--space-4);font-size:var(--text-lg)';
    techHeading.textContent = 'Technical Details';
    section.appendChild(techHeading);

    if (data.bounds)     section.appendChild(renderBoundsAccordion(data.bounds));
    if (data.references) section.appendChild(renderRefsAccordion(data.references));

    container.replaceWith(section);
}

// ===== Bootstrap =====

async function init() {
    const container = document.getElementById('main-content');
    const params = new URLSearchParams(location.search);
    const problemId = params.get('problem');

    let index;
    try { index = await fetchJSON('index.json'); }
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
