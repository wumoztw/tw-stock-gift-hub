'use strict';
const TAIPEI_STATION_AGENTS = ['中國信託', '福邦證券', '凱基證券', '永豐金證券'];
const TAIPEI_KEY = '__taipei__';
const AGENT_LOCATIONS = {
  '中國信託': { area: '北車商圈', mrt: '北車/台大醫院站', addr: '台北市中正區重慶南路一段83號' },
  '福邦證券': { area: '北車商圈', mrt: '台北車站M8出口', addr: '台北市中正區忠孝西路一段6號6樓' },
  '凱基證券': { area: '北車商圈', mrt: '台北車站Z10出口', addr: '台北市中正區重慶南路一段2號5樓' },
  '永豐金證券': { area: '北車商圈', mrt: '北車/西門站', addr: '台北市中正區博愛路17號3樓' },
  '第一金證券': { area: '北車商圈', mrt: '北車/台大醫院站', addr: '台北市中正區長安東路一段/重慶南路' },
  '新光證券': { area: '北車商圈', mrt: '台北車站Z10出口', addr: '台北市中正區重慶南路一段66之1號11樓' },
  '兆豐證券': { area: '忠孝新生', mrt: '忠孝新生站2號出口', addr: '台北市中正區忠孝東路二段95號1樓' },
  '元大證券': { area: '中山/南京', mrt: '松江南京/忠孝復興', addr: '台北市大安區敦化南路二段67號B1' },
  '台新證券': { area: '松江南京', mrt: '松江南京站4號出口', addr: '台北市中山區建國北路一段96號B1' },
  '群益金鼎': { area: '大安/敦南', mrt: '忠孝敦化/信義安和', addr: '台北市大安區敦化南路二段97號B2' },
  '統一證券': { area: '南京三民', mrt: '南京三民站1號出口', addr: '台北市松山區東興路8號B1' },
  '富邦證券': { area: '忠孝敦化', mrt: '忠孝敦化站', addr: '台北市大安區仁愛路四段169號 / 許昌街' },
  '華南永昌': { area: '南京復興', mrt: '南京復興站', addr: '台北市松山區民生東路四段54號4樓' },
  '康和證券': { area: '信義/市政', mrt: '市政府站2號出口', addr: '台北市信義區基隆路一段176號B1' },
  '國票證券': { area: '中山/松江', mrt: '松江南京站', addr: '台北市中山區樂群三路128號 / 重慶北路' },
  '宏遠證券': { area: '大安/信義', mrt: '信義安和站', addr: '台北市大安區信義路四段236號3樓' },
  '亞東證券': { area: '板橋/新北', mrt: '府中站', addr: '新北市板橋區新站路16號13樓' },
};
const STATION_WALK_AGENTS = ['中國信託', '福邦證券', '凱基證券', '永豐金證券', '新光證券', '第一金證券'];
const METRO_AGENTS = ['元大證券', '台新證券', '群益金鼎', '富邦證券', '統一證券', '兆豐證券'];
const NORTH_WORDS = ['台北', '臺北', '新北', '基隆', '桃園', '新竹', '宜蘭', '南港', '劍潭'];
const TAIPEI_MEETING_WORDS = ['台北', '臺北', '新北', '南港', '劍潭'];
const TAOHSIN_WORDS = ['桃園', '新竹', '宜蘭'];
const hasWord = (loc, words) => words.some((w) => String(loc || '').includes(w));
const isTaipeiPhone = (p) => /^\s*(\(0?2\)|02)/.test(String(p || ''));
const isNorthMeeting = (g) => hasWord(g.location, NORTH_WORDS);
const isNorthPickup = (g) => Boolean(AGENT_LOCATIONS[g.agent]) || isTaipeiPhone(g.agent_phone) || isNorthMeeting(g);
const isNorthMeetingAndTaipeiAgent = (g) => isNorthMeeting(g)
  && (Boolean(AGENT_LOCATIONS[g.agent]) || isTaipeiPhone(g.agent_phone));
const REGION_FILTERS = {
  all: () => true,
  north_all: isNorthPickup,
  taipei_station: (g) => STATION_WALK_AGENTS.includes(g.agent),
  taipei_metro: (g) => METRO_AGENTS.includes(g.agent),
  meeting_taipei: (g) => hasWord(g.location, TAIPEI_MEETING_WORDS),
  meeting_taohsin: (g) => hasWord(g.location, TAOHSIN_WORDS),
};
const EGIFT_COMPANIES = new Set(['1338', '1516', '1565', '1580', '1711', '1723', '2340', '2455', '3025', '3029', '3049',
  '3081', '3163', '3268', '3466', '3479', '3550', '3563', '4171', '4961', '4977', '4991', '5425', '5536', '5608', '6116',
  '6266', '6588', '8016', '8039', '8996', '2885', '2002']);
const EGIFT_KEYWORDS = ['即享券', '即享卡', '電子抵用券', '數位商品', 'eGift'];
const isEGiftItem = (item) => EGIFT_COMPANIES.has(String(item.code))
  || EGIFT_KEYWORDS.some((k) => `${item.gift_2026 || ''} ${(item.history || {})['2025'] || ''}`.includes(k));
const NO_GIFT = ['待公告', '未定', '無'];
const hasGift = (item) => Boolean(item.gift_2026) && !NO_GIFT.includes(String(item.gift_2026).trim());
const getGiftImageSearchUrl = (item) => 'https://www.google.com.tw/search?tbm=isch&q='
  + encodeURIComponent(`${item.name} ${item.gift_2026} 股東會紀念品`);
const PORTFOLIO_KEY = 'tw_gift_portfolio_raw';
const parsePortfolio = (raw) => new Set((String(raw || '').toUpperCase().match(/\b\d{4,6}[A-Z]?\b/g) || []));
const STORE_KEY = 'twgift.picked';
const HH_KEY = 'twgift.households';
const state = {
  data: [], q: '', pill: 'flip', agent: '', region: 'all', quick: '', portfolio: null, priceCap: 0, sort: 'roi',
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
  if (!REGION_FILTERS[state.region](g)) return false;
  if (state.quick === 'egift' && !isEGiftItem(g)) return false;
  if (state.quick && state.quick !== 'egift' && !REGION_FILTERS[state.quick](g)) return false;
  if (state.portfolio && !state.portfolio.has(String(g.code).toUpperCase())) return false;
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

function renderQuick() {
  const defs = [['north_all', '🧭 北部可領專區 (台北股代+北部開會)'], ['taipei_station', '🚇 北車步行圈順路領']];
  const btn = (id, label, n) => `<button type="button" class="pill${state.quick === id ? ' active' : ''}" data-filter="${id}">${label} (${n})</button>`;
  $('quick-filters').innerHTML = defs.map(([id, label]) => btn(id, label, state.data.filter(REGION_FILTERS[id]).length)).join('')
    + btn('egift', '⚡ 支援 eGift 線上領', state.data.filter(isEGiftItem).length);
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
  const regionLabels = [['all', '全部地區'], ['north_all', '🧭 全北部可領 (雙北股代總部 / 北部開會)'],
    ['taipei_station', '🚇 台北車站重慶南路步行圈 (中信/福邦/凱基/永豐)'],
    ['taipei_metro', '🏙️ 南京/松江/敦南商圈股代 (元大/台新/群益/富邦/統一/兆豐)'],
    ['meeting_taipei', '🏛️ 股東會開會現場也在雙北 (台北/新北，可現場出席領)'],
    ['meeting_taohsin', '🚄 股東會開會現場在桃竹宜 (桃園/新竹/宜蘭)']];
  $('region-filter').innerHTML = regionLabels.map(([id, l]) =>
    `<option value="${id}">${l} (${state.data.filter(REGION_FILTERS[id]).length})</option>`).join('');
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
  if (isEGiftItem(g)) badges.push('<span class="tag egift" title="完成集保電子投票後，可透過集保e手掌握APP或eGift專區線上領取電子禮券條碼">⚡ eGift 線上領免跑腿</span>');
  const loc = AGENT_LOCATIONS[g.agent];
  if (loc) badges.push(`<span class="tag agent" title="${esc(loc.addr)}">🚉 ${esc(g.agent)} (${esc(loc.mrt)})</span>`);
  else if (g.agent && g.agent !== '待確認') badges.push(`<span class="tag agent">🚉 ${esc(g.agent)}</span>`);
  if (isNorthMeeting(g)) badges.push(`<span class="tag north">📍 北部開會: ${esc(g.location)}</span>`);
  if (isNorthMeetingAndTaipeiAgent(g)) badges.push('<span class="tag north">🏛️ 北部現場也能領</span>');
  else if (isNorthPickup(g)) badges.push('<span class="tag north">🏢 北部可領</span>');
  const ew = getEVotingWindow(g.meeting_date, g.meeting_type);
  const picked = state.picked.has(g.code);
  return `<article class="card${picked ? ' picked' : ''}">
    <div class="card-top"><span class="title">${esc(g.code)} ${esc(g.name)}</span><span class="mkt">${esc(g.market)}</span>
      <input type="checkbox" data-code="${esc(g.code)}" aria-label="加入自選" ${picked ? 'checked' : ''}></div>
    <div class="badges">${badges.join('')}</div>
    <div class="gift"><div class="name">${esc(g.gift_2026)}</div><div class="val">預估價值 ${fmt(value)} 元</div>${hasGift(g) ? `<a class="btn-img" href="${esc(getGiftImageSearchUrl(g))}" target="_blank" rel="noopener">🖼️ 看實品圖</a>` : ''}</div>
    <div class="metrics"><div><span>1股成本 (含$1手續費)</span>${fmt(g.cost_1_share)} 元</div><div><span>紀念品價值</span>${fmt(value)} 元</div>
      <div><span>最後買進日</span>${esc(g.last_buy_date)}</div><div><span>股東會日期</span>${esc(g.meeting_date)}（${esc(g.location)}）</div></div>
    <div class="evote-row">🗳️ 電投期間：${ew ? esc(ew.rangeLabel) : '待公告'}</div>
    ${parseMonthDayToDate(g.last_buy_date) || ew ? `<div class="cal-row">${parseMonthDayToDate(g.last_buy_date) ? `<button type="button" class="btn-cal" data-cal="${esc(g.code)}">📅 加入日曆</button>` : ''}${ew ? `<a class="btn-evote" href="${TDCC_EVOTE_URL}" target="_blank" rel="noopener" title="電子投票期間：${esc(ew.rangeLabel)}，投完票截圖即可去股代領紀念品或線上領 eGift！">🗳️ 去電投</a>` : ''}</div>` : ''}
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
  const net = val - cost;
  $('pill-selected-count').textContent = String(picks.length);
  $('pill-profit').textContent = `${net >= 0 ? '+' : '-'}$${fmt(Math.abs(net))}`;
  $('simStats').innerHTML = `<span>已選 <b>${picks.length}</b> 檔</span>`
    + `<span class="mini-net">首年淨賺 <b class="net">${net >= 0 ? '+' : '-'}$${fmt(Math.abs(net))}</b> 元</span>`
    + `<span class="full">總建倉本金 <b>${fmt(cost)}</b> 元</span><span class="full">首年可領價值 <b>${fmt(val)}</b> 元</span>`;
}

const BAR_KEY = 'tw_gift_bar_collapsed';

function setBarCollapsed(collapsed, save = true) {
  const bar = $('sticky-bar');
  bar.classList.toggle('collapsed', collapsed);
  const t = $('toggle-sticky-bar');
  t.textContent = '🔽 收合';
  t.setAttribute('aria-expanded', String(!collapsed));
  if (save) localStorage.setItem(BAR_KEY, collapsed ? '1' : '0');
}

function initBar() {
  const saved = localStorage.getItem(BAR_KEY);
  setBarCollapsed(state.picked.size === 0 || saved === null ? state.picked.size === 0 : saved === '1', false);
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

function buildChecklist() {
  const n = state.households;
  const picks = state.data.filter((g) => state.picked.has(g.code));
  const cost = picks.reduce((t, g) => t + g.cost_1_share, 0) * n;
  const val = picks.reduce((t, g) => t + (g.est_value_2026 || 0), 0) * n;
  const net = val - cost;
  const groups = new Map();
  picks.forEach((g) => {
    const k = g.agent || '待確認';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(g);
  });
  const lines = ['🎁 【2026 股東會紀念品】北部順路領 & 零股下單檢核表',
    `📊 已選：${picks.length} 檔｜家庭戶數：${n} 戶｜總成本：$${fmt(cost)}｜首年總禮券：$${fmt(val)}｜首年淨賺：${net >= 0 ? '+' : '-'}$${fmt(Math.abs(net))}`,
    `🗳️ 集保電子投票入口：${TDCC_EVOTE_URL}`,
    '━━━━━━━━━━━━━━━━━━'];
  [...groups.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([agent, items]) => {
    const loc = AGENT_LOCATIONS[agent];
    lines.push(`📍 【${agent}】共 ${items.length} 檔${loc ? ` (${loc.mrt}｜${loc.addr})` : ''}`);
    const phone = items.find((g) => g.agent_phone);
    if (phone) lines.push(`☎ ${phone.agent_phone}`);
    items.forEach((g) => lines.push(`[ ] ${g.code} ${g.name}｜股價 $${fmt(g.price)}｜${g.gift_2026} ($${fmt(g.est_value_2026 || 0)})｜最後買進: ${g.last_buy_date}${getEVotingWindow(g.meeting_date, g.meeting_type) ? `｜電投: ${getEVotingWindow(g.meeting_date, g.meeting_type).startStr}~${getEVotingWindow(g.meeting_date, g.meeting_type).endStr}` : ''}`));
    lines.push('');
  });
  return lines.join('\n').trim();
}

async function copyChecklist() {
  const btn = $('copy-checklist');
  const text = buildChecklist();
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    if (!ok) { window.prompt('請手動複製檢核表：', text); return; }
  }
  const old = btn.textContent;
  btn.textContent = '✅ 已複製到剪貼簿！';
  setTimeout(() => { btn.textContent = old; }, 2000);
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

const TDCC_EVOTE_URL = 'https://stockservices.tdcc.com.tw/evote/index.html';

function getEVotingWindow(meetingDateStr, meetingType) {
  const ymd = parseMonthDayToDate(meetingDateStr);
  if (!ymd) return null;
  const base = Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));
  const days = meetingType === '臨時' ? 15 : 30;
  const fmtD = (t) => {
    const iso = new Date(t).toISOString().slice(0, 10);
    return { ymd: iso.replace(/-/g, ''), md: iso.slice(5).replace('-', '/') };
  };
  const s = fmtD(base - days * 86400000);
  const e = fmtD(base - 3 * 86400000);
  return { startStr: s.md, endStr: e.md, startYmd: s.ymd, endYmd: e.ymd, rangeLabel: `${s.md} ~ ${e.md}` };
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
    (it) => `請於集保 e 服務完成電子投票或前往股代領取：${TDCC_EVOTE_URL}\n${it.map((g) => { const w = getEVotingWindow(g.meeting_date, g.meeting_type); return `${giftDetail(g)}${w ? ` | 電投期間: ${w.startStr}~${w.endStr}` : ''}`; }).join('\n')}`);
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

function matchPortfolio() {
  const raw = $('portfolio-input').value;
  localStorage.setItem(PORTFOLIO_KEY, raw);
  const codes = parsePortfolio(raw);
  const out = $('portfolio-summary');
  if (!codes.size) { state.portfolio = null; out.textContent = '⚠️ 未偵測到股票代號，請貼上 4~6 碼代號。'; renderGrid(); return; }
  state.portfolio = codes;
  const hits = state.data.filter((g) => codes.has(String(g.code).toUpperCase()));
  const cards = hits.filter(isCard);
  const sum = (arr) => arr.reduce((s, g) => s + (g.est_value_2026 || 0), 0);
  out.textContent = hits.length
    ? `🎉 比對成功！您的庫存中共有 ${hits.length} 檔發放紀念品（其中超商卡 ${cards.length} 檔共 $${fmt(sum(cards))} 元，預估總價值 $${fmt(sum(hits))} 元）`
    : `😅 偵測到 ${codes.size} 檔代號，但今年皆無收錄的紀念品。`;
  renderGrid();
}

function selectMatched() {
  if (!state.portfolio) matchPortfolio();
  state.data.filter((g) => state.portfolio && state.portfolio.has(String(g.code).toUpperCase()))
    .forEach((g) => state.picked.add(g.code));
  persist();
  renderGrid();
  setBarCollapsed(false);
}

function clearPortfolio() {
  state.portfolio = null;
  $('portfolio-input').value = '';
  $('portfolio-summary').textContent = '';
  localStorage.removeItem(PORTFOLIO_KEY);
  renderGrid();
}

function bindGuide() {
  const box = $('beginner-guide');
  const btn = $('btn-open-guide');
  if (!box) return;
  if (btn) btn.addEventListener('click', () => { box.open = true; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.querySelectorAll('.guide-tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.guide-tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.guide-panel').forEach((p) => { const on = p.id === tab.dataset.tab; p.classList.toggle('active', on); p.hidden = !on; });
  }));
}

function bind() {
  bindGuide();
  $('btn-match-portfolio').addEventListener('click', matchPortfolio);
  $('btn-select-matched').addEventListener('click', selectMatched);
  $('btn-clear-portfolio').addEventListener('click', clearPortfolio);
  const saved = localStorage.getItem(PORTFOLIO_KEY);
  if (saved) { $('portfolio-input').value = saved; state.portfolio = parsePortfolio(saved); if (!state.portfolio.size) state.portfolio = null; }
  $('search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); renderGrid(); });
  $('agent').addEventListener('change', (e) => { state.agent = e.target.value; renderGrid(); });
  $('region-filter').addEventListener('change', (e) => { state.region = e.target.value; renderGrid(); });
  $('quick-filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    state.quick = state.quick === b.dataset.filter ? '' : b.dataset.filter;
    renderQuick();
    renderGrid();
  });
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
  const selectAllVisible = () => { visible().forEach((g) => state.picked.add(g.code)); persist(); renderGrid(); };
  $('selectAll').addEventListener('click', selectAllVisible);
  $('pill-select-all').addEventListener('click', () => { selectAllVisible(); setBarCollapsed(false); });
  $('expand-sticky-bar').addEventListener('click', () => setBarCollapsed(false));
  $('toggle-sticky-bar').addEventListener('click', () => setBarCollapsed(!$('sticky-bar').classList.contains('collapsed')));
  $('sticky-bar').addEventListener('click', (e) => {
    if ($('sticky-bar').classList.contains('collapsed') && !e.target.closest('button')) setBarCollapsed(false);
  });
  $('clearAll').addEventListener('click', () => { state.picked.clear(); persist(); renderGrid(); });
  $('exportCsv').addEventListener('click', exportCsv);
  $('export-ics').addEventListener('click', exportIcs);
  $('copy-checklist').addEventListener('click', copyChecklist);
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
  renderQuick();
  bind();
  initBar();
  renderGrid();
  if (state.portfolio) matchPortfolio();
}
init();
