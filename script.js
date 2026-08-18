/* ---------- CONFIG ---------- */
const SHEET_ID = '1w06aHWUIa7Gq_Osx4gUCarQMf6PjvoFyTyPGvYfZ-KI';
const GID = '1590178934';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
const AUTO_REFRESH_MS = 60000; // re-check the sheet every 60s

// Column order in the sheet (0 = Timestamp, then Q1..Q8)
const COL = {
  timestamp: 0, role: 1, interests: 2, channels: 3,
  difficulty: 4, challenge: 5, missed: 6, wouldUse: 7, feature: 8
};

/* ---------- LABEL MAPS (fall back to raw text if a new option appears) ---------- */
const CHANNEL_LABELS = { 'Social Media (Facebook, TikTok, etc.)': 'Social Media (FB / TikTok)' };

const CHALLENGE_LABELS = {
  'Information တွေ နေရာစုံမှာပြန့်နေတယ်': { en: 'Information is scattered across too many places', mm: 'Information တွေ နေရာစုံမှာပြန့်နေတယ်' },
  'Information ယုံကြည်ရ/မရ မသေချာဘူး': { en: 'Unsure whether the information is trustworthy', mm: 'Information ယုံကြည်ရ/မရ မသေချာဘူး' },
  'Eligible ဖြစ်မဖြစ် and trustworthy information ဟုတ်မဟုတ်': { en: 'Eligibility and trustworthiness both unclear', mm: 'Eligible ဖြစ်မဖြစ် and trustworthy information ဟုတ်မဟုတ်' },
  'Requirements နားလည်ရခက်တယ်': { en: 'Requirements are hard to understand', mm: 'Requirements နားလည်ရခက်တယ်' },
  'Deadline ကျော်ပြီးမှ သိရတယ်': { en: 'Finds out about deadlines only after they\u2019ve passed', mm: 'Deadline ကျော်ပြီးမှ သိရတယ်' }
};

const DIFFICULTY_LABELS = { 'ခက်': 'Hard (ခက်)', 'ပုံမှန်': 'Normal (ပုံမှန်)', 'အရမ်းခက်': 'Very hard (အရမ်းခက်)' };
const MISSED_LABELS = { 'Yes': 'Yes — missed one', 'No': 'No' };
const WOULD_USE_DEFINITE = 'သေချာပေါက် အသုံးပြုမယ်';
const WOULD_USE_YES = 'အသုံးပြုမယ်';

const FEATURE_JUNK = new Set(['', '_', '-', '.', 'n/a', 'na', 'none']);

/* ---------- DOM helpers ---------- */
const $ = (id) => document.getElementById(id);

function splitMulti(value) {
  // splits on commas that are NOT inside parentheses, so
  // "Social Media (Facebook, TikTok, etc.)" stays one token
  return String(value).split(/,\s*(?![^(]*\))/).map(s => s.trim()).filter(Boolean);
}

function countBy(rows, fn) {
  const counts = {};
  rows.forEach(r => {
    const vals = fn(r);
    (Array.isArray(vals) ? vals : [vals]).forEach(v => {
      if (!v) return;
      counts[v] = (counts[v] || 0) + 1;
    });
  });
  return counts;
}

function sortedEntries(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/* ---------- Renderers ---------- */
function renderBars(containerId, counts, n, mintClass, labelMap) {
  const el = $(containerId);
  el.innerHTML = '';
  sortedEntries(counts).forEach(([key, count]) => {
    const label = (labelMap && labelMap[key]) || key;
    const pct = n ? (count / n * 100) : 0;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="rlabel">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill${mintClass ? ' mint' : ''}" data-w="${pct.toFixed(1)}"></div></div>
      <div class="rval">${count}</div>`;
    el.appendChild(row);
  });
  if (!Object.keys(counts).length) el.innerHTML = '<div class="empty-note">No responses yet.</div>';
}

function renderPills(containerId, counts, labelMap, hiKeys) {
  const el = $(containerId);
  el.innerHTML = '';
  sortedEntries(counts).forEach(([key, count]) => {
    const label = (labelMap && labelMap[key]) || key;
    const pill = document.createElement('div');
    pill.className = 'pill' + (hiKeys && hiKeys.has(key) ? ' hi' : '');
    pill.innerHTML = `<div class="pv">${count}</div><div class="pl">${escapeHtml(label)}</div>`;
    el.appendChild(pill);
  });
  if (!Object.keys(counts).length) el.innerHTML = '<div class="empty-note">No responses yet.</div>';
}

function renderPainList(counts, n) {
  const el = $('painList');
  el.innerHTML = '';
  sortedEntries(counts).forEach(([key, count]) => {
    const mapped = CHALLENGE_LABELS[key];
    const en = mapped ? mapped.en : key;
    const mm = mapped ? mapped.mm : '';
    const pct = n ? Math.round(count / n * 100) : 0;
    const item = document.createElement('div');
    item.className = 'pain-item';
    item.innerHTML = `
      <div class="pct">${pct}%</div>
      <div class="body"><div class="en">${escapeHtml(en)}</div>${mm ? `<div class="mm-sub myanmar">${escapeHtml(mm)}</div>` : ''}</div>`;
    el.appendChild(item);
  });
  if (!Object.keys(counts).length) el.innerHTML = '<div class="empty-note">No responses yet.</div>';
}

function renderQuotes(rows) {
  const el = $('quoteGrid');
  el.innerHTML = '';
  const texts = rows
    .map(r => (r[COL.feature] || '').trim())
    .filter(t => !FEATURE_JUNK.has(t.toLowerCase()));
  texts.forEach(t => {
    const q = document.createElement('div');
    q.className = 'quote';
    q.textContent = t;
    el.appendChild(q);
  });
  if (!texts.length) el.innerHTML = '<div class="empty-note">No feature requests yet.</div>';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function animateBars() {
  const bars = document.querySelectorAll('.bar-fill');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; });
        io.unobserve(el);
      }
    });
  }, { threshold: 0.15 });
  bars.forEach(b => io.observe(b));
}

/* ---------- Main render pipeline ---------- */
function render(rows) {
  const n = rows.length;

  // Q1
  const profileCounts = countBy(rows, r => (r[COL.role] || '').trim());
  renderBars('profileBars', profileCounts, n, false);
  $('nProfile').textContent = `n = ${n}`;

  // Q2 (multi-select)
  const interestCounts = countBy(rows, r => splitMulti(r[COL.interests] || ''));
  renderBars('interestBars', interestCounts, n, true);

  // Q3 (multi-select)
  const channelCounts = countBy(rows, r => splitMulti(r[COL.channels] || ''));
  renderBars('channelBars', channelCounts, n, false, CHANNEL_LABELS);

  // Q4
  const difficultyCounts = countBy(rows, r => (r[COL.difficulty] || '').trim());
  renderPills('difficultyPills', difficultyCounts, DIFFICULTY_LABELS,
    new Set(['ခက်', 'အရမ်းခက်']));

  // Q6
  const missedCounts = countBy(rows, r => (r[COL.missed] || '').trim());
  renderPills('missedPills', missedCounts, MISSED_LABELS, new Set(['Yes']));

  // Q5
  const challengeCounts = countBy(rows, r => (r[COL.challenge] || '').trim());
  renderPainList(challengeCounts, n);

  // Q7 -> headline stat
  const wouldUseCounts = countBy(rows, r => (r[COL.wouldUse] || '').trim());
  const definite = wouldUseCounts[WOULD_USE_DEFINITE] || 0;
  const will = wouldUseCounts[WOULD_USE_YES] || 0;
  const positive = definite + will;
  const no = n - positive;
  const pct = n ? Math.round(positive / n * 100) : 0;
  $('wouldUsePct').innerHTML = `${pct}<sup>%</sup>`;
  $('definiteCount').textContent = `${definite} of ${n}`;
  $('wouldCount').textContent = `${will} of ${n}`;
  $('noCount').textContent = `${no}`;

  // Q8
  renderQuotes(rows);

  animateBars();
}

/* ---------- Fetch + parse ---------- */
let isFirstLoad = true;

function setStatus(state, text) {
  const dot = $('liveDot');
  dot.classList.remove('live', 'error');
  if (state === 'live') dot.classList.add('live');
  if (state === 'error') dot.classList.add('error');
  $('syncStatus').textContent = text;
}

async function loadData() {
  const btn = $('refreshBtn');
  btn.classList.add('spinning');
  setStatus('loading', isFirstLoad ? 'Connecting…' : 'Syncing…');

  try {
    const res = await fetch(CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvText = await res.text();

    const parsed = Papa.parse(csvText.trim(), { skipEmptyLines: true });
    const dataRows = parsed.data.slice(1).filter(r => r.length > 1 && r[COL.timestamp]);

    render(dataRows);

    $('errorBanner').hidden = true;
    setStatus('live', 'Live');
    const now = new Date();
    $('lastUpdated').textContent = `LAST SYNCED ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${dataRows.length} RESPONSES`;
  } catch (err) {
    setStatus('error', 'Sync failed');
    $('errorBanner').hidden = false;
    if (isFirstLoad) $('lastUpdated').textContent = 'NOT SYNCED YET';
    console.error('Sheet sync failed:', err);
  } finally {
    isFirstLoad = false;
    setTimeout(() => btn.classList.remove('spinning'), 600);
  }
}

$('refreshBtn').addEventListener('click', loadData);
$('retryBtn').addEventListener('click', loadData);

loadData();
setInterval(loadData, AUTO_REFRESH_MS);
