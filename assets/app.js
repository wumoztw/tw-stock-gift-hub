'use strict';
const TAIPEI_STATION_AGENTS = ['中國信託', '福邦證券', '凱基證券', '永豐金證券'];
const TAIPEI_KEY = '__taipei__';
const STORE_KEY = 'twgift.picked';
const HH_KEY = 'twgift.households';
const state = {
  data: [], q: '', pill: 'flip', agent: '', priceCap: 0, sort: 'roi',
  picked: new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')),
  households: Number(localStorage.getItem(HH_KEY)) || 1,
};
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('zh-TW', { maximumFractionDigits: 1 });
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const isCard = (g) => g.category_2026 === '超商卡/禮券';
const isFlip = (g) => isCard(g) && g.net_profit_yr1 > 0;
const isPending = (g) => g.category_2026 === '未定/待公告' && g.recent_4yr_card_count >= 2;

const PILLS = [
  { id: 'all', label: '全部', fn: () => true },
  { id: 'flip', label: '🔥 首年直接倒賺超商卡', fn: isFlip },
  { id: 'king', label: '👑 連4年必發超商卡聖杯', fn: (g) => g.is_4yr_card_king },
  { id: 'card', label: '💳 2026 所有超商卡', fn: isCard },
  { id: 'daily', label: '🧼 民生實用日用品', fn: (g) => g.category_2026 === '民生/日用品' },
  { id: 'pending', label: '🔮 尚未公布但歷年常發卡 (提前卡位)', fn: isPending },
];

function mdKey(s) {
  const [m, d] = String(s || '99/99').split('/').map(Number);
  return (m || 99) * 100 + (d || 99);
}

function matches(g) {
  const pill = PILLS.find((p) => p.id === state.pill);
  if (!pill.fn(g)) return false;
  if (state.agent === TAIPEI_KEY) {
    if (!TAIPEI_STATION_AGENTS.includes(g.agent)) return false;
  } else if (state.agent && g.agent !== state.agent) return false;
  if (state.priceCap && !(g.price <= state.priceCap)) return false;
  if (state.q) {
    const hay = `${g.code} ${g.name} ${g.gift_2026} ${Object.values(g.history || {}).join(' ')}`.toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}

const SORTS = {
  roi: (a, b) => b.roi_pct - a.roi_pct,
  net: (a, b) => b.net_profit_yr1 - a.net_profit_yr1,
  price: (a, b) => a.price - b.price,
  buy: (a, b) => mdKey(b.last_buy_date) - mdKey(a.last_buy_date),
  code: (a, b) => a.code.localeCompare(b.code),
};

const visible = () => state.data.filter(matches).sort(SORTS[state.sort]);

function renderKpis() {
  const d = state.data;
  const cards = d.filter(isCard);
  const flips = d.filter(isFlip);
  const sum = (arr, k) => arr.reduce((s, g) => s + (g[k] || 0), 0);
  const items = [
    ['收錄總家數', `${d.length} 家`, '上市櫃 / 興櫃'],
    ['2026 超商卡', `${cards.length} 家`, `單戶全領總面額 ${fmt(sum(cards, 'est_value_2026'))} 元`],
    ['🔥 首年直接倒賺', `${flips.length} 檔`, `總成本 ${fmt(Math.round(sum(flips, 'cost_1_share')))} 元領 ${fmt(sum(flips, 'est_value_2026'))} 元`],
    ['👑 連4年必發超商卡', `${d.filter((g) => g.is_4yr_card_king).length} 家`, '2023~2026 年年發卡'],
  ];
  $('kpis').innerHTML = items
    .map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`)
    .join('');
}

function renderPills() {
  $('pills').innerHTML = PILLS.map((p) => {
    const n = p.id === 'pending' ? '' : ` (${state.data.filter(p.fn).length})`;
    return `<button type="button" class="pill${p.id === state.pill ? ' active' : ''}" data-pill="${p.id}">${p.label}${n}</button>`;
  }).join('');
}

function renderAgents() {
  const counts = {};
  state.data.forEach((g) => { counts[g.agent] = (counts[g.agent] || 0) + 1; });
  const taipei = TAIPEI_STATION_AGENTS.reduce((s, a) => s + (counts[a] || 0), 0);
  const opts = [
    `<option value="">全部股代 (${state.data.length})</option>`,
    `<option value="${TAIPEI_KEY}">🚉 台北車站步行圈 (中信+福邦+凱基+永豐金) (${taipei})</option>`,
    ...Object.entries(counts).sort((a, b) => b[1] - a[1])
      .map(([a, n]) => `<option value="${esc(a)}">${esc(a)} (${n})</option>`),
  ];
  $('agent').innerHTML = opts.join('');
}

function cardHtml(g) {
  const value = g.est_value_2026 || 0;
  const pct = Math.min(100, Math.round((value / g.cost_1_share) * 100));
  const hist = ['2025', '2024', '2023']
    .map((y) => `<span>${y.slice(2)}: ${esc((g.history || {})[y] || '—')}</span>`).join('');
  const badges = [];
  if (g.is_4yr_card_king) badges.push('<span class="tag king">👑 連4年發卡王</span>');
  if (isFlip(g)) badges.push(`<span class="tag profit">🔥 首年倒賺 +$${fmt(g.net_profit_yr1)} 元 (ROI ${fmt(g.roi_pct)}%)</span>`);
  if (isCard(g)) badges.push('<span class="tag card-t">💳 超商卡/禮券</span>');
  if (g.category_2026 === '民生/日用品') badges.push('<span class="tag daily">🧼 民生/日用品</span>');
  if (g.agent && g.agent !== '待確認') badges.push(`<span class="tag agent">🚉 ${esc(g.agent)}</span>`);
  const picked = state.picked.has(g.code);
  return `<article class="card${picked ? ' picked' : ''}">
    <div class="card-top"><span class="title">${esc(g.code)} ${esc(g.name)}</span><span class="mkt">${esc(g.market)}</span>
      <input type="checkbox" data-code="${esc(g.code)}" aria-label="加入自選" ${picked ? 'checked' : ''}></div>
    <div class="badges">${badges.join('')}</div>
    <div class="gift"><div class="name">${esc(g.gift_2026)}</div><div class="val">預估價值 ${fmt(value)} 元</div></div>
    <div class="metrics"><div><span>1股成本 (含$1手續費)</span>${fmt(g.cost_1_share)} 元</div><div><span>紀念品價值</span>${fmt(value)} 元</div>
      <div><span>最後買進日</span>${esc(g.last_buy_date)}</div><div><span>股東會日期</span>${esc(g.meeting_date)}（${esc(g.location)}）</div></div>
    ${parseMonthDayToDate(g.last_buy_date) ? `<div class="cal-row"><button type="button" class="btn-cal" data-cal="${esc(g.code)}">📅 加入日曆</button></div>` : ''}
    <div class="bar" title="回本進度 ${pct}%"><i class="${value >= g.cost_1_share ? '' : 'loss'}" style="width:${pct}%"></i></div>
    <div class="history">${hist}</div></article>`;
}

function renderGrid() {
  const list = visible();
  $('count').textContent = `共 ${list.length} 檔符合條件`;
  $('grid').innerHTML = list.map(cardHtml).join('') || '<p>沒有符合的標的。</p>';
  renderSim();
}

function renderSim() {
  const n = state.households;
  const picks = state.data.filter((g) => state.picked.has(g.code));
  const cost = picks.reduce((s, g) => s + g.cost_1_share, 0) * n;
  const val = picks.reduce((s, g) => s + (g.est_value_2026 || 0), 0) * n;
  $('households').innerHTML = Array.from({ length: 8 }, (_, i) =>
    `<button type="button" data-hh="${i + 1}" class="${i + 1 === n ? 'active' : ''}">${i + 1} 戶</button>`).join('');
  $('simStats').innerHTML = `<span>已選 <b>${picks.length}</b> 檔</span><span>總建倉本金 <b>${fmt(cost)}</b> 元</span>`
    + `<span>首年可領價值 <b>${fmt(val)}</b> 元</span><span>首年淨賺 <b class="net">${fmt(val - cost)}</b> 元</span>`
    + `<span>次年起每年免成本白領 <b>${fmt(val)}</b> 元</span>`;
}

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...state.picked]));
  localStorage.setItem(HH_KEY, String(state.households));
}

function exportCsv() {
  const rows = [['代號', '名稱', '股價', '1股成本', '戶數', '2026紀念品', '預估價值', '最後買進日', '股東會日期', '股代']];
  state.data.filter((g) => state.picked.has(g.code)).forEach((g) => rows.push([
    g.code, g.name, g.price, g.cost_1_share, state.households, g.gift_2026, g.est_value_2026, g.last_buy_date, g.meeting_date, g.agent]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'gift-buy-list.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

function parseMonthDayToDate(str) {
  const m = /^(?:(\d{2})\/)?(\d{1,2})\/(\d{1,2})$/.exec(String(str ?? '').trim());
  if (!m) return null;
  const year = m[1] ? 2000 + Number(m[1]) : 2026;
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(year, mo - 1, d));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${year}${String(mo).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

function nextDay(ymd) {
  const dt = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + 1));
  return dt.toISOString().slice(0, 10).replace(/-/g, '');
}

const icsEscape = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function icsFold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

function giftDetail(g) {
  return `${g.code} ${g.name} | 股價 $${fmt(g.price)} | ${g.gift_2026} (價值 $${fmt(g.est_value_2026 || 0)}) | ${g.agent || '待確認'}`;
}

function groupByDate(list, field) {
  const map = new Map();
  list.forEach((g) => {
    const ymd = parseMonthDayToDate(g[field]);
    if (!ymd) return;
    if (!map.has(ymd)) map.set(ymd, []);
    map.get(ymd).push(g);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function summaryOf(prefix, items, suffix) {
  const names = items.slice(0, 2).map((g) => g.name).join('、');
  return `${prefix} ${names} 等 ${items.length} 檔${suffix}`;
}

function buildIcs(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tw-stock-gift-hub//ICS//ZH-TW', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const addEvents = (field, kind, summary, desc) => groupByDate(list, field).forEach(([ymd, items]) => {
    lines.push('BEGIN:VEVENT', `UID:${kind}-${ymd}@tw-stock-gift-hub`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${nextDay(ymd)}`,
      `SUMMARY:${icsEscape(summary(items))}`, `DESCRIPTION:${icsEscape(desc(items))}`);
    [['-PT4H', '前一天 20:00 提醒'], ['PT9H', '當天 09:00 台股開盤提醒']].forEach(([trg, text]) =>
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(text)}`, `TRIGGER:${trg}`, 'END:VALARM'));
    lines.push('END:VEVENT');
  });
  addEvents('last_buy_date', 'buy', (it) => summaryOf('🔔 [最後買進]', it, '股東會紀念品零股'),
    (it) => `今日為最後買進日，必買清單：\n${it.map(giftDetail).join('\n')}`);
  addEvents('meeting_date', 'meeting', (it) => summaryOf('🗳️ [股東會/電投提醒]', it, '股東會'),
    (it) => `請於集保 e 服務完成電子投票或前往股代領取：\n${it.map(giftDetail).join('\n')}`);
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

function exportIcs() {
  const picks = state.data.filter((g) => state.picked.has(g.code));
  const url = URL.createObjectURL(new Blob([buildIcs(picks)], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'tw-stock-gifts-2026-calendar.ics' });
  a.click();
  URL.revokeObjectURL(url);
}

function openGoogleCalendar(g) {
  const ymd = parseMonthDayToDate(g.last_buy_date);
  if (!ymd) return;
  const text = `🔔 [最後買進] ${g.code} ${g.name} 股東會紀念品零股`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}`
    + `&dates=${ymd}/${nextDay(ymd)}&details=${encodeURIComponent(giftDetail(g))}`;
  window.open(url, '_blank', 'noopener');
}

function bind() {
  $('search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); renderGrid(); });
  $('agent').addEventListener('change', (e) => { state.agent = e.target.value; renderGrid(); });
  $('priceCap').addEventListener('change', (e) => { state.priceCap = Number(e.target.value); renderGrid(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
  $('pills').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pill]');
    if (b) { state.pill = b.dataset.pill; renderPills(); renderGrid(); }
  });
  $('grid').addEventListener('change', (e) => {
    const code = e.target.dataset.code;
    if (!code) return;
    if (e.target.checked) state.picked.add(code); else state.picked.delete(code);
    e.target.closest('.card').classList.toggle('picked', e.target.checked);
    persist();
    renderSim();
  });
  $('grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cal]');
    const g = b && state.data.find((x) => x.code === b.dataset.cal);
    if (g) openGoogleCalendar(g);
  });
  $('households').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hh]');
    if (b) { state.households = Number(b.dataset.hh); persist(); renderSim(); }
  });
  $('selectAll').addEventListener('click', () => { visible().forEach((g) => state.picked.add(g.code)); persist(); renderGrid(); });
  $('clearAll').addEventListener('click', () => { state.picked.clear(); persist(); renderGrid(); });
  $('exportCsv').addEventListener('click', exportCsv);
  $('export-ics').addEventListener('click', exportIcs);
}

async function init() {
  try {
    const res = await fetch('./public/data/gifts.json');
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
  } catch (err) {
    $('grid').innerHTML = `<p>資料載入失敗（${esc(err.message)}）。請以 HTTP 伺服器開啟，例如 python3 -m http.server。</p>`;
    return;
  }
  renderKpis();
  renderPills();
  renderAgents();
  bind();
  renderGrid();
}
init();
