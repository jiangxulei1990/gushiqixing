const tracks = [
  {
    code: "600519",
    name: "贵州茅台",
    type: "股票",
    tag: "白酒核心",
    secid: "1.600519",
    base: 1480,
    color: "#e24b4a",
    seed: 11,
    mood: "climb",
  },
  {
    code: "000300",
    name: "沪深300",
    type: "指数",
    tag: "宽基指数",
    secid: "1.000300",
    base: 3600,
    color: "#5dcaa5",
    seed: 22,
    mood: "wave",
  },
  {
    code: "510300",
    name: "沪深300ETF",
    type: "基金",
    tag: "场内ETF",
    secid: "1.510300",
    base: 3.8,
    color: "#5dcaa5",
    seed: 33,
    mood: "dip",
  },
  {
    code: "161725",
    name: "白酒基金",
    type: "基金",
    tag: "高波动",
    secid: "0.161725",
    base: 1.08,
    color: "#e24b4a",
    seed: 44,
    mood: "roller",
  },
  {
    code: "159915",
    name: "创业板ETF",
    type: "基金",
    tag: "成长风格",
    secid: "0.159915",
    base: 2.1,
    color: "#5dcaa5",
    seed: 55,
    mood: "roller",
  },
  {
    code: "513050",
    name: "中概互联ETF",
    type: "基金",
    tag: "深坑挑战",
    secid: "1.513050",
    base: 0.95,
    color: "#e24b4a",
    seed: 66,
    mood: "crash",
  },
];

const riders = [
  {
    id: "bagholder",
    name: "接盘侠",
    desc: "越跌越勇",
    suit: "#f5f5f5",
    helmet: "#f5f5f5",
    visor: "#050505",
    asset: "assets/rider-bagholder.svg",
  },
  {
    id: "oldhand",
    name: "老登操盘手",
    desc: "嘴硬手稳",
    suit: "#f5f5f5",
    helmet: "#f5f5f5",
    visor: "#050505",
    asset: "assets/rider-oldhand.svg",
  },
  {
    id: "leekgod",
    name: "韭菜战神",
    desc: "割完还能长",
    suit: "#f5f5f5",
    helmet: "#f5f5f5",
    visor: "#050505",
    asset: "assets/rider-leekgod.svg",
  },
  {
    id: "limitup",
    name: "涨停猎人",
    desc: "只看红线",
    suit: "#f5f5f5",
    helmet: "#f5f5f5",
    visor: "#050505",
    asset: "assets/rider-limitup.svg",
  },
];

const vehicles = [
  {
    id: "default",
    name: "K线赛车",
    desc: "默认座驾",
    body: "#58cc02",
    accent: "#58cc02",
    fork: "#7ed957",
    asset: "assets/motocross-ai-side.png",
    filter: "saturate(1.08) contrast(1.04) brightness(1.06)",
    imageBox: [-57, -66, 125, 125],
    wheelBack: { x: -36, y: 20, r: 15, sx: 214, sy: 865, sr: 162 },
    wheelFront: { x: 39, y: 19, r: 16, sx: 972, sy: 860, sr: 166 },
  },
];

const state = {
  selected: tracks[0],
  period: "3y",
  points: [],
  game: null,
  sound: true,
  suggestions: [],
  riderId: riders[0].id,
  vehicleId: vehicles[0].id,
  loadoutReady: true,
};

const $ = (id) => document.getElementById(id);
const EM_TOKEN = "D43BF722C8E33BD155A13C30E7235B2E";
const EM_SEARCH_API = "https://searchapi.eastmoney.com/api/suggest/get";
const EM_KLINE_API = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
const ASSET_VERSION = "duo-light-1";
const imageCache = new Map();
const engineAudio = {
  ctx: null,
  osc: null,
  rumble: null,
  gain: null,
  filter: null,
};

const sampleByCode = new Map(tracks.map((track) => [track.code, track]));

function assetImage(src) {
  if (!src) return null;
  const versionedSrc = src.startsWith("assets/") ? `${src}?v=${ASSET_VERSION}` : src;
  if (imageCache.has(versionedSrc)) return imageCache.get(versionedSrc);
  const image = new Image();
  image.src = versionedSrc;
  imageCache.set(versionedSrc, image);
  return image;
}

function imageReady(image) {
  return image?.complete && image.naturalWidth > 0;
}

function ensureEngineAudio() {
  if (!state.sound) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!engineAudio.ctx) {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const rumble = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    rumble.type = "triangle";
    osc.frequency.value = 70;
    rumble.frequency.value = 35;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.value = 0;
    osc.connect(filter);
    rumble.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    rumble.start();
    Object.assign(engineAudio, { ctx, osc, rumble, gain, filter });
  }
  if (engineAudio.ctx?.state === "suspended") {
    engineAudio.ctx.resume().catch(() => {});
  }
}

function updateEngineSound(game) {
  if (!engineAudio.ctx || !engineAudio.gain) return;
  const now = engineAudio.ctx.currentTime;
  const active = state.sound && game?.running && !game.paused && !game.awaitingContinue && game.forward;
  const speed = Math.max(0, game?.bike?.vx || 0);
  const targetGain = active ? Math.min(0.07, 0.022 + speed * 0.006) : 0.0001;
  const baseFreq = 62 + speed * 18;
  engineAudio.osc.frequency.setTargetAtTime(baseFreq, now, 0.045);
  engineAudio.rumble.frequency.setTargetAtTime(baseFreq * 0.48, now, 0.06);
  engineAudio.filter.frequency.setTargetAtTime(280 + speed * 72, now, 0.08);
  engineAudio.gain.gain.setTargetAtTime(targetGain, now, 0.055);
}

function muteEngineSound() {
  if (!engineAudio.ctx || !engineAudio.gain) return;
  engineAudio.gain.gain.setTargetAtTime(0.0001, engineAudio.ctx.currentTime, 0.04);
}

function updateSoundIcons() {
  const icon = state.sound ? "🔊" : "🔇";
  const homeToggle = $("sound-toggle");
  const gameToggle = document.querySelector(".sound-action");
  if (homeToggle) homeToggle.textContent = icon;
  if (gameToggle) gameToggle.textContent = icon;
}

function currentRider() {
  return riders.find((rider) => rider.id === state.riderId) || riders[0];
}

function currentVehicle() {
  return vehicles.find((vehicle) => vehicle.id === state.vehicleId) || vehicles[0];
}

function secidFromCode(code) {
  if (/^(6|5|9)/.test(code)) return `1.${code}`;
  return `0.${code}`;
}

function colorForCode(code) {
  const palette = ["#e24b4a", "#5dcaa5"];
  const total = String(code)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

function marketColorForPoints(points) {
  if (!points?.length) return "#5dcaa5";
  return points[points.length - 1].close >= points[0].close ? "#e24b4a" : "#5dcaa5";
}

function normalizeSearchItem(item) {
  const code = item.Code || item.UnifiedCode;
  const sample = sampleByCode.get(code);
  return {
    code,
    name: item.Name || code,
    type: item.SecurityTypeName || (item.Classify === "Fund" ? "基金" : "股票"),
    tag: item.SecurityTypeName || item.Classify || "真实行情",
    secid: item.QuoteID || secidFromCode(code),
    base: sample?.base || 1,
    color: sample?.color || colorForCode(code),
    seed: sample?.seed || String(code).split("").reduce((sum, char) => sum + char.charCodeAt(0), 17),
    mood: sample?.mood || "wave",
  };
}

function jsonp(url, callbackParam = "cb") {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("搜索接口超时"));
    }, 6000);
    window[callbackName] = (data) => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };
    const glue = url.includes("?") ? "&" : "?";
    script.src = `${url}${glue}${callbackParam}=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("搜索接口暂时不可用"));
    };
    document.head.appendChild(script);
  });
}

function seeded(seed) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildSeries(track, count = 260) {
  const rand = seeded(track.seed);
  const data = [];
  let price = track.base;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const cycle = Math.sin(t * Math.PI * 5 + track.seed) * 0.018;
    const noise = (rand() - 0.5) * 0.035;
    let drift = 0.0006;
    if (track.mood === "dip") drift += t > 0.45 && t < 0.68 ? -0.012 : 0.002;
    if (track.mood === "climb") drift += 0.0018;
    if (track.mood === "roller") drift += Math.sin(t * Math.PI * 3) * 0.006;
    if (track.mood === "crash") drift += t > 0.25 && t < 0.72 ? -0.011 : 0.003;
    if (track.mood === "wave") drift += Math.sin(t * Math.PI * 2) * 0.003;
    price = Math.max(track.base * 0.16, price * (1 + drift + cycle + noise));
    data.push({
      date: dateFromIndex(i, count),
      close: Number(price.toFixed(price > 20 ? 2 : 4)),
    });
  }
  return data;
}

function dateFromIndex(i, count) {
  const now = new Date("2026-06-11T00:00:00+08:00");
  const then = new Date(now);
  then.setDate(now.getDate() - (count - i) * 5);
  return then.toISOString().slice(0, 10);
}

async function searchRealTracks(query) {
  const url = `${EM_SEARCH_API}?input=${encodeURIComponent(query)}&type=14&token=${EM_TOKEN}`;
  const json = await jsonp(url);
  const rows = json?.QuotationCodeTable?.Data || [];
  return rows
    .filter((item) => item.Code && item.Name && item.QuoteID)
    .map(normalizeSearchItem)
    .filter((track, index, list) => list.findIndex((item) => item.secid === track.secid) === index)
    .slice(0, 8);
}

async function fetchRealKlines(track) {
  const secid = track.secid || secidFromCode(track.code);
  const url = `${EM_KLINE_API}?secid=${encodeURIComponent(secid)}&klt=101&fqt=1&lmt=1400&end=20500101&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("K线接口暂时不可用");
  const json = await response.json();
  const klines = json?.data?.klines || [];
  if (!klines.length) throw new Error("没有可用的历史K线");
  const dataPoints = klines
    .map((line) => {
      const [date, open, close, high, low, volume] = line.split(",");
      return {
        date,
        close: Number(close),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        volume: Number(volume),
      };
    })
    .filter((point) => Number.isFinite(point.close));
  if (dataPoints.length < 8) throw new Error("K线数据太少");
  return {
    ...track,
    name: json.data?.name || track.name,
    code: json.data?.code || track.code,
    secid,
    base: dataPoints[0].close,
    tag: track.tag === "真实行情" ? "真实日K" : track.tag,
    dataPoints,
    real: true,
  };
}

async function ensureRealTrack(track) {
  if (track.dataPoints?.length) return track;
  if (!track.secid && !/^\d{5,6}$/.test(track.code)) return track;
  return fetchRealKlines({ ...track, secid: track.secid || secidFromCode(track.code) });
}

function periodPoints(track, period) {
  const all = track.dataPoints?.length ? track.dataPoints : buildSeries(track, 300);
  if (period === "1y") return all.slice(-250);
  if (period === "3y") return all.slice(-750);
  return all;
}

function metrics(points) {
  const start = points[0].close;
  const end = points[points.length - 1].close;
  const returns = ((end / start - 1) * 100).toFixed(1);
  const changes = points.slice(1).map((p, i) => Math.log(p.close / points[i].close));
  const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
  const variance = changes.reduce((a, b) => a + (b - avg) ** 2, 0) / changes.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  const difficulty = vol < 0.28 ? "轻松" : vol < 0.42 ? "普通" : vol < 0.62 ? "困难" : "刺激";
  return { returns, vol, difficulty };
}

function drawChart(canvas, points, color = "#5dcaa5", options = {}) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = options.pad ?? 28;
  if (!options.keep) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = options.bg || "transparent";
    ctx.fillRect(0, 0, width, height);
  }

  const prices = points.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const x = (i) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - ((v - min) / range) * (height - pad * 2);

  ctx.strokeStyle = "rgba(39,50,56,.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const gy = pad + ((height - pad * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, gy);
    ctx.lineTo(width - pad, gy);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, `${color}33`);
  gradient.addColorStop(1, `${color}00`);
  ctx.beginPath();
  points.forEach((p, i) => {
    const px = x(i);
    const py = y(p.close);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(pad, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    const px = x(i);
    const py = y(p.close);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = options.thick ? 4 : 2.5;
  ctx.stroke();

  if (options.labels) {
    ctx.fillStyle = "#7b8794";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(points[0].date.slice(0, 7), pad, height - 8);
    ctx.textAlign = "right";
    ctx.fillText(points[points.length - 1].date.slice(0, 7), width - pad, height - 8);
  }
}

function drawHero() {
  const canvas = $("hero-chart");
  const points = periodPoints(tracks[3], "all");
  drawChart(canvas, points, marketColorForPoints(points), { pad: 12, thick: true });
}

function renderCards() {
  const grid = $("track-grid");
  grid.innerHTML = "";
  tracks.forEach((track) => {
    const points = periodPoints(track, "3y");
    const card = document.createElement("button");
    card.className = "track-card";
    card.type = "button";
    card.innerHTML = `
      <div class="pill-row">
        <span class="pill">${track.type}</span>
        <span class="pill">${track.tag}</span>
      </div>
      <h3>${track.name}</h3>
      <div class="code">${track.code}</div>
      <canvas class="mini-chart" width="520" height="120"></canvas>
    `;
    card.addEventListener("click", () => selectTrack(track));
    grid.appendChild(card);
    drawChart(card.querySelector("canvas"), points, marketColorForPoints(points), { pad: 8 });
  });
}

function setupSearch() {
  const input = $("ticker-search");
  const suggestions = $("suggestions");
  let searchTimer = 0;
  let searchSeq = 0;

  function renderSuggestions(list, loading = false) {
    state.suggestions = list;
    if (loading) {
      suggestions.innerHTML = `<div class="suggestion"><span>正在搜索真实行情...</span><span></span></div>`;
      suggestions.style.display = "block";
      return;
    }
    suggestions.innerHTML = list
      .map(
        (t, index) =>
          `<button class="suggestion" type="button" data-index="${index}"><span>${t.name}</span><span>${t.code} · ${t.type}</span></button>`,
      )
      .join("");
    suggestions.style.display = list.length ? "block" : "none";
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    if (!q) {
      state.suggestions = [];
      suggestions.style.display = "none";
      return;
    }
    const localMatches = tracks
      .filter((t) => t.code.includes(q) || t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q))
      .slice(0, 5);
    renderSuggestions(localMatches);
    if (q.length < 2 && !/^\d{3,}$/.test(q)) return;
    const seq = ++searchSeq;
    searchTimer = setTimeout(async () => {
      renderSuggestions(localMatches, true);
      try {
        const realMatches = await searchRealTracks(q);
        if (seq !== searchSeq) return;
        renderSuggestions(realMatches.length ? realMatches : localMatches);
      } catch (error) {
        if (seq !== searchSeq) return;
        renderSuggestions(localMatches);
      }
    }, 220);
  });
  suggestions.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const track = state.suggestions[Number(btn.dataset.index)];
    if (track) selectTrack(track);
  });
  $("ticker-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    suggestions.style.display = "none";
    const q = input.value.trim();
    if (!q) return;
    const local = tracks.find((t) => t.code === q || t.name.includes(q));
    try {
      const [real] = await searchRealTracks(q);
      selectTrack(real || local || tracks[0]);
    } catch (error) {
      selectTrack(local || tracks[0]);
    }
  });
}

async function selectTrack(track) {
  state.selected = track;
  state.points = periodPoints(track, state.period);
  showScreen("pregame-screen");
  renderPregame();
  if (!track.real) {
    $("selected-type").textContent = `${track.type} · 加载真实K线...`;
  }
  try {
    const realTrack = await ensureRealTrack(track);
    state.selected = realTrack;
    state.points = periodPoints(realTrack, state.period);
    renderPregame();
  } catch (error) {
    $("selected-type").textContent = `${track.type} · 使用样例数据`;
  }
}

function showScreen(id) {
  ["home-screen", "pregame-screen", "game-screen"].forEach((screen) => {
    $(screen).hidden = screen !== id;
  });
}

function renderPregame() {
  const track = state.selected;
  const points = periodPoints(track, state.period);
  state.points = points;
  const m = metrics(points);
  $("selected-type").textContent = track.type;
  $("selected-name").textContent = track.name;
  $("selected-code").textContent = track.code;
  $("metric-period").textContent = state.period === "1y" ? "近 1 年" : state.period === "3y" ? "近 3 年" : "全部";
  $("metric-return").textContent = `${m.returns > 0 ? "+" : ""}${m.returns}%`;
  $("metric-return").style.color = "#273238";
  $("metric-difficulty").textContent = m.difficulty;
  $("metric-volatility").textContent = m.vol.toFixed(2);
  drawChart($("preview-chart"), points, marketColorForPoints(points), { pad: 34, labels: true, thick: true, bg: "#ffffff" });
  renderLoadout();
}

function renderLoadout() {
  const vehicle = currentVehicle();
  const vehicleWrap = $("vehicle-options");
  const summary = $("loadout-summary");
  if (summary) summary.textContent = vehicle.name;
  $("start-ride").textContent = "开始骑行";
  if (!vehicleWrap) return;
  vehicleWrap.innerHTML = vehicles
    .map(
      (vehicle) => `
        <button class="loadout-card ${vehicle.id === state.vehicleId ? "active" : ""}" type="button" data-vehicle="${vehicle.id}">
          <canvas width="220" height="120" data-vehicle-preview="${vehicle.id}"></canvas>
          <strong>${vehicle.name}</strong>
          <span>${vehicle.desc}</span>
        </button>
      `,
    )
    .join("");
  document.querySelectorAll("[data-vehicle-preview]").forEach((canvas) => {
    const previewVehicle = vehicles.find((item) => item.id === canvas.dataset.vehiclePreview);
    drawVehiclePreview(canvas, previewVehicle);
  });
}

function setupLoadout() {
  const vehicleOptions = $("vehicle-options");
  if (!vehicleOptions) return;
  vehicleOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vehicle]");
    if (!button) return;
    state.vehicleId = button.dataset.vehicle;
    renderLoadout();
  });
}

function openLoadoutModal() {
  if (!$("loadout-modal")) {
    startGame();
    return;
  }
  renderLoadout();
  $("loadout-modal").hidden = false;
}

function closeLoadoutModal() {
  if (!$("loadout-modal")) return;
  $("loadout-modal").hidden = true;
}

function confirmLoadout() {
  state.loadoutReady = true;
  closeLoadoutModal();
  renderLoadout();
  startGame();
}

function drawRiderPreview(canvas, rider) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7fff0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = assetImage(rider.asset);
  if (imageReady(image)) {
    ctx.save();
    ctx.fillStyle = `${rider.suit}22`;
    ctx.beginPath();
    ctx.roundRect(42, 8, canvas.width - 84, canvas.height - 16, 16);
    ctx.fill();
    ctx.drawImage(image, 58, 10, canvas.width - 116, canvas.height - 20);
    ctx.restore();
    return;
  }
  if (image) image.onload = () => drawRiderPreview(canvas, rider);
  ctx.save();
  ctx.translate(canvas.width / 2, 64);
  ctx.strokeStyle = rider.suit;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-18, 18);
  ctx.lineTo(4, 3);
  ctx.lineTo(34, 18);
  ctx.moveTo(3, 4);
  ctx.lineTo(-4, -18);
  ctx.moveTo(-18, 18);
  ctx.lineTo(-42, 32);
  ctx.moveTo(18, 17);
  ctx.lineTo(44, 31);
  ctx.stroke();
  ctx.fillStyle = rider.suit;
  ctx.fillRect(-9, -5, 28, 16);
  ctx.fillStyle = rider.helmet;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-7, -35, 24, 21, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rider.visor;
  ctx.beginPath();
  ctx.roundRect(-6, -43, 28, 12, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(-15, -34, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVehiclePreview(canvas, vehicle) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7fff0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = assetImage(vehicle.asset);
  if (imageReady(image)) {
    ctx.save();
    ctx.translate(canvas.width / 2, 66);
    ctx.shadowColor = vehicle.accent;
    ctx.shadowBlur = 16;
    ctx.filter = vehicle.filter || "none";
    ctx.drawImage(image, -88, -86, 176, 176);
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    drawRotatingWheelCrop(ctx, image, { x: -51, y: 35, r: 20, sx: 214, sy: 865, sr: 162 }, 0.15, vehicle.filter);
    drawRotatingWheelCrop(ctx, image, { x: 56, y: 33, r: 22, sx: 972, sy: 860, sr: 166 }, 0.75, vehicle.filter);
    ctx.restore();
    return;
  }
  if (image) image.onload = () => drawVehiclePreview(canvas, vehicle);
  ctx.save();
  ctx.translate(canvas.width / 2, 66);
  ctx.scale(1.45, 1.45);
  drawPreviewWheel(ctx, -35, 22, 16, 0.15);
  drawPreviewWheel(ctx, 36, 18, 18, 0.75);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#b7b7ad";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-35, 22);
  ctx.lineTo(-8, -2);
  ctx.lineTo(36, 18);
  ctx.moveTo(-8, -2);
  ctx.lineTo(4, 21);
  ctx.lineTo(-35, 22);
  ctx.stroke();
  ctx.strokeStyle = vehicle.fork;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(23, -14);
  ctx.lineTo(41, 0);
  ctx.stroke();
  ctx.fillStyle = vehicle.body;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-40, 5);
  ctx.lineTo(-13, -18);
  ctx.lineTo(22, -15);
  ctx.lineTo(10, 7);
  ctx.lineTo(-28, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = vehicle.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.lineTo(28, -26);
  ctx.lineTo(42, -22);
  ctx.lineTo(17, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#151615";
  ctx.beginPath();
  ctx.moveTo(-31, -9);
  ctx.quadraticCurveTo(-5, -24, 16, -17);
  ctx.lineTo(5, -11);
  ctx.quadraticCurveTo(-12, -13, -31, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPreviewWheel(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.52)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  ctx.fillStyle = "#8f9188";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function terrainFromPoints(points, width, height) {
  const target = Math.min(28, Math.max(16, Math.round(width / 58)));
  const stride = Math.max(1, Math.floor(points.length / target));
  const ridePoints = [];
  let wantHigh = false;
  for (let i = 0; i < points.length; i += stride) {
    const chunk = points.slice(i, Math.min(points.length, i + stride));
    const low = chunk.reduce((best, item) => (item.close < best.close ? item : best), chunk[0]);
    const high = chunk.reduce((best, item) => (item.close > best.close ? item : best), chunk[0]);
    const picked = wantHigh ? high : low;
    ridePoints.push(picked);
    wantHigh = !wantHigh;
  }
  if (ridePoints[ridePoints.length - 1] !== points[points.length - 1]) {
    ridePoints.push(points[points.length - 1]);
  }
  const prices = ridePoints.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const baseY = height * 0.7;
  const amp = Math.min(520, height * 0.72);
  const terrain = ridePoints.map((p, i) => {
    const normalized = (p.close - min) / range - 0.5;
    const spike = i % 4 === 1 ? -height * 0.08 : i % 4 === 3 ? height * 0.08 : 0;
    return {
      x: 120 + i * 178,
      y: baseY - Math.sign(normalized) * Math.abs(normalized) ** 0.58 * amp + spike,
      price: p.close,
      date: p.date,
    };
  });
  for (let i = 1; i < terrain.length - 1; i++) {
    const prev = terrain[i - 1];
    const next = terrain[i + 1];
    if (Math.abs(prev.y - terrain[i].y) < 80 && Math.abs(next.y - terrain[i].y) < 80) {
      terrain[i].y += i % 2 === 0 ? -110 : 110;
    }
    terrain[i].y = Math.max(height * 0.14, Math.min(height * 0.9, terrain[i].y));
  }
  if (terrain.length > 2) {
    const startY = Math.max(height * 0.52, Math.min(height * 0.82, terrain[0].y));
    const rollIn = {
      ...terrain[0],
      x: terrain[0].x + 190,
      y: startY,
    };
    terrain[0].y = startY;
    for (let i = 1; i < terrain.length; i++) {
      terrain[i].x += 190;
    }
    terrain.splice(1, 0, rollIn);
  }
  return terrain;
}

function startGame() {
  showScreen("game-screen");
  $("result-modal").hidden = true;
  $("pause-menu").hidden = true;
  $("ride-track-name").textContent = state.selected.code || "A股";
  $("ride-period").textContent = state.period === "1y" ? "1年" : state.period === "3y" ? "3年" : "全部";
  tryLockLandscape();
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const terrain = terrainFromPoints(state.points, window.innerWidth, window.innerHeight);
  const game = {
    running: true,
    start: performance.now(),
    terrain,
    bike: { x: 120, y: terrain[0].y - 36, vx: 0, vy: 0, angle: 0, av: 0, wheelSpin: 0 },
    camera: 0,
    forward: false,
    brake: false,
    jump: false,
    jumpQueued: false,
    left: false,
    right: false,
    grounded: false,
    score: 0,
    lives: 3,
    flips: 0,
    crashes: 0,
    air: 0,
    rotation: 0,
    lastAngle: 0,
    awaitingContinue: true,
    feedback: "",
    finished: false,
    paused: false,
    pausedTotal: 0,
    resize,
  };
  state.game = game;
  hideCrashFeedback();
  $("tap-start").hidden = false;
  showControlGuide();

  const keys = (event, down) => {
    if (!game.running) return;
    if (["ArrowUp", "KeyW"].includes(event.code)) {
      event.preventDefault();
      if (down && game.awaitingContinue) {
        startFromGate(game);
        return;
      }
      game.forward = down;
    }
    if (event.code === "Space") {
      event.preventDefault();
      game.jump = down;
      if (down) game.jumpQueued = true;
    }
    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      game.brake = down;
    }
    if (event.code === "ArrowLeft" || event.code === "KeyA") game.left = down;
    if (event.code === "ArrowRight" || event.code === "KeyD") game.right = down;
  };
  game.keydown = (e) => keys(e, true);
  game.keyup = (e) => keys(e, false);
  window.addEventListener("keydown", game.keydown);
  window.addEventListener("keyup", game.keyup);

  document.querySelectorAll("[data-control]").forEach((btn) => {
    const control = btn.dataset.control;
    const set = (down) => {
      if (down) ensureEngineAudio();
      if (control === "forward" && down && game.awaitingContinue) {
        btn.classList.add("active");
        startFromGate(game);
        return;
      }
      if (down) hideControlGuide();
      if (control === "jump") {
        game.jump = down;
        if (down) game.jumpQueued = true;
      } else {
        game[control] = down;
      }
      btn.classList.toggle("active", down);
      if (!down && control === "forward") updateEngineSound(game);
    };
    btn.onpointerdown = (event) => {
      event.preventDefault();
      btn.setPointerCapture?.(event.pointerId);
      set(true);
    };
    btn.onpointerup = () => set(false);
    btn.onpointercancel = () => set(false);
    btn.onpointerleave = () => set(false);
  });

  requestAnimationFrame(loopGame);
}

async function tryLockLandscape() {
  document.body.classList.add("playing-game");
}

function groundAt(terrain, x) {
  for (let i = 0; i < terrain.length - 1; i++) {
    const a = terrain[i];
    const b = terrain[i + 1];
    if (b.x >= x) {
      const t = (x - a.x) / (b.x - a.x);
      return {
        y: a.y + (b.y - a.y) * t,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
  }
  return { y: terrain[terrain.length - 1].y, angle: 0 };
}

function bikePoint(bike, x, y) {
  const cos = Math.cos(bike.angle);
  const sin = Math.sin(bike.angle);
  return {
    x: bike.x + x * cos - y * sin,
    y: bike.y + x * sin + y * cos,
  };
}

function resetControls(game) {
  game.forward = false;
  game.brake = false;
  game.jump = false;
  game.jumpQueued = false;
  game.left = false;
  game.right = false;
  document.querySelectorAll("[data-control]").forEach((btn) => btn.classList.remove("active"));
}

function setCrashFeedback(game, title, message) {
  const panel = $("crash-feedback");
  $("crash-title").textContent = title;
  $("crash-message").textContent = message;
  panel.hidden = false;
  game.feedback = title;
}

function hideCrashFeedback() {
  $("crash-feedback").hidden = true;
}

function startFromGate(game) {
  ensureEngineAudio();
  hideCrashFeedback();
  hideControlGuide();
  $("tap-start").hidden = true;
  game.awaitingContinue = false;
  game.forward = true;
  updateEngineSound(game);
}

function showControlGuide() {
  const guide = $("control-guide");
  if (!guide) return;
  guide.hidden = false;
  guide.classList.remove("hidden");
}

function hideControlGuide() {
  const guide = $("control-guide");
  if (!guide || guide.hidden) return;
  guide.classList.add("hidden");
  clearTimeout(guide.hideTimer);
  guide.hideTimer = setTimeout(() => {
    guide.hidden = true;
  }, 340);
}

function crashBike(game, ground, title = "摔车了") {
  const bike = game.bike;
  game.crashes += 1;
  game.lives -= 1;
  game.lastCrashAt = performance.now();
  game.score = Math.max(0, game.score - 650);
  game.air = 0;
  game.rotation = 0;
  bike.angle = ground.angle;
  bike.av = 0;
  bike.vx = Math.max(0.6, bike.vx * 0.25);
  bike.vy = 0;
  bike.y = ground.y - 36;
  setCrashFeedback(game, title, game.lives > 0 ? `生命 -1，还剩 ${game.lives} 条` : "生命耗尽，本局结束");
  clearTimeout(game.feedbackTimer);
  game.feedbackTimer = setTimeout(() => {
    if (state.game === game && game.lives > 0) hideCrashFeedback();
  }, 900);
  if (game.lives <= 0) {
    setTimeout(() => finishGame(false), 550);
    return true;
  }
  return false;
}

function updateHud(game, now, onGround) {
  const elapsed = ((game.paused ? game.pauseStarted || now : now) - game.start - (game.pausedTotal || 0)) / 1000;
  $("score").textContent = String(Math.max(0, game.score));
  $("lives").textContent = String(Math.max(0, game.lives));
  $("speed").textContent = String(Math.round(game.bike.vx * 18));
  $("airtime").textContent = game.awaitingContinue || onGround ? "贴地" : `${game.air.toFixed(1)}秒`;
  $("timer").textContent = formatTimeTenths(elapsed);
  $("tap-start").hidden = !game.awaitingContinue;
}

function loopGame(now) {
  const game = state.game;
  if (!game?.running) return;
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  const w = window.innerWidth;
  const h = window.innerHeight;
  const bike = game.bike;
  if (game.paused) {
    muteEngineSound();
    drawGame(ctx, game, w, h, game.grounded);
    updateHud(game, now, game.grounded);
    requestAnimationFrame(loopGame);
    return;
  }
  if (game.awaitingContinue) {
    muteEngineSound();
    const holdGround = groundAt(game.terrain, bike.x);
    bike.y = holdGround.y - 36;
    bike.angle += (holdGround.angle - bike.angle) * 0.18;
    drawGame(ctx, game, w, h, true);
    updateHud(game, now, true);
    requestAnimationFrame(loopGame);
    return;
  }
  const groundBefore = groundAt(game.terrain, bike.x);
  const dt = 1 / 60;
  const onGroundStart = bike.y >= groundBefore.y - 35;
  const slopePush = onGroundStart ? Math.sin(groundBefore.angle) * 0.16 : 0;
  const targetMax = 6.8;

  if (game.forward) bike.vx += onGroundStart ? 0.2 : 0.06;
  if (game.brake) bike.vx -= onGroundStart ? 0.32 : 0.08;
  bike.vx -= slopePush;
  bike.vx *= onGroundStart ? 0.974 : 0.996;
  bike.vx = Math.max(game.forward ? 0.25 : 0, Math.min(targetMax, bike.vx));
  updateEngineSound(game);

  if (game.jumpQueued && onGroundStart) {
    bike.vy = -13.8 - Math.min(2.4, bike.vx * 0.22);
    bike.y -= 14;
    game.air = 0.05;
  }
  game.jumpQueued = false;

  bike.x += bike.vx;
  bike.wheelSpin += bike.vx / 15;
  bike.vy += 0.34;
  bike.y += bike.vy;
  if (game.left) bike.av -= 0.0048;
  if (game.right) bike.av += 0.0048;
  bike.angle += bike.av;
  bike.av *= 0.985;

  const ground = groundAt(game.terrain, bike.x);
  const head = bikePoint(bike, -15, -50);
  const headGround = groundAt(game.terrain, head.x);
  if (head.y >= headGround.y - 3 && performance.now() - (game.lastCrashAt || 0) > 850) {
    if (crashBike(game, ground, "头撞到K线了")) return;
    requestAnimationFrame(loopGame);
    return;
  }
  const onGround = bike.y >= ground.y - 34;
  game.grounded = onGround;
  if (onGround) {
    const landingMismatch = Math.abs(((bike.angle - ground.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
    const hardLanding = game.air > 0.35 && (landingMismatch > 0.78 || bike.vy > 12.8);
    const badSlope = Math.abs(ground.angle) > 0.88 && landingMismatch > 0.48;
    if ((hardLanding || badSlope) && performance.now() - (game.lastCrashAt || 0) > 850) {
      if (crashBike(game, ground, "落地姿势崩了")) return;
      requestAnimationFrame(loopGame);
      return;
    }
    if (game.air > 0.45) {
      const flips = Math.floor(Math.abs(game.rotation) / (Math.PI * 2));
      if (flips > 0) {
        game.flips += flips;
        game.score += flips * 600;
      } else if (game.air > 1.7) {
        game.score += 180;
      }
    }
    game.air = 0;
    game.rotation = 0;
    bike.y = ground.y - 34;
    bike.vy = -Math.max(0.25, Math.sin(-ground.angle) * 2.2);
    bike.angle += (ground.angle - bike.angle) * 0.055;
    bike.av *= 0.84;
  } else {
    game.air += dt;
    const diff = ((bike.angle - game.lastAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
    game.rotation += diff;
  }
  game.lastAngle = bike.angle;

  if (Math.abs(((bike.angle + Math.PI) % (Math.PI * 2)) - Math.PI) > 2.15 && onGround && performance.now() - (game.lastCrashAt || 0) > 850) {
    if (crashBike(game, ground, "翻车了")) return;
    requestAnimationFrame(loopGame);
    return;
  }

  const finishX = game.terrain[game.terrain.length - 1].x;
  const progress = Math.min(1, bike.x / finishX);
  game.score = Math.max(game.score, Math.floor(progress * 1800 + bike.vx * 12) + game.flips * 500 - game.crashes * 240);
  game.camera = bike.x - w * 0.32;

  drawGame(ctx, game, w, h, onGround);
  updateHud(game, now, onGround);

  if (bike.x >= finishX + 40 && !game.finished) {
    game.finished = true;
    finishGame(true);
    return;
  }
  requestAnimationFrame(loopGame);
}

function drawGame(ctx, game, w, h, onGround) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f7fff0";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(-game.camera, 0);

  for (let x = Math.floor(game.camera / 220) * 220; x < game.camera + w + 220; x += 220) {
    ctx.strokeStyle = "rgba(39,50,56,.045)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.beginPath();
  game.terrain.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(game.terrain[game.terrain.length - 1].x, h + 100);
  ctx.lineTo(game.terrain[0].x, h + 100);
  ctx.closePath();
  ctx.fillStyle = "rgba(229, 248, 214, 0.72)";
  ctx.fill();

  drawNeonTrack(ctx, game.terrain, marketColorForPoints(state.points));
  drawPriceMarkers(ctx, game.terrain, game.camera, w);

  drawFlag(ctx, 52, game.terrain[0].y, "起点", "#58cc02");
  drawFlag(ctx, game.terrain[game.terrain.length - 1].x, game.terrain[game.terrain.length - 1].y, "终点", "#1cb0f6");
  drawBike(ctx, game.bike, onGround);
  ctx.restore();

  drawMiniMap(ctx, game, w, h);
}

function drawNeonTrack(ctx, terrain, color) {
  const strokePath = () => {
    ctx.beginPath();
    terrain.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
  };
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  strokePath();
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.shadowBlur = 12;
  strokePath();
  ctx.strokeStyle = `${color}cc`;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  strokePath();
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = color === "#5dcaa5" ? 0.45 : 0.34;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawPriceMarkers(ctx, terrain, camera, width) {
  ctx.save();
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  terrain.forEach((p, i) => {
    if (i % 5 !== 0 || p.x < camera - 80 || p.x > camera + width + 80) return;
    ctx.strokeStyle = "rgba(39,50,56,.16)";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 38);
    ctx.stroke();
    ctx.fillStyle = "rgba(39,50,56,.58)";
    const value = p.price >= 100 ? `$${Math.round(p.price)}` : `$${p.price.toFixed(2)}`;
    ctx.fillText(value, p.x, p.y - 42);
  });
  ctx.restore();
}

function drawFlag(ctx, x, y, label, color) {
  ctx.strokeStyle = "rgba(39,50,56,.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 92);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 92, 68, 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 34, y - 80);
}

function drawBike(ctx, bike, onGround) {
  const rider = currentRider();
  const vehicle = currentVehicle();
  ctx.save();
  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.angle);
  ctx.shadowColor = onGround ? "rgba(93,202,165,.35)" : "rgba(226,75,74,.45)";
  ctx.shadowBlur = 10;

  if (drawExternalBike(ctx, bike, vehicle)) {
    ctx.restore();
    return;
  }

  drawWheel(ctx, -31, 14, 16, bike.wheelSpin);
  drawWheel(ctx, 34, 11, 18, bike.wheelSpin + 0.7);

  ctx.shadowBlur = 0;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "#b7b7ad";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-31, 14);
  ctx.lineTo(-6, -6);
  ctx.lineTo(34, 11);
  ctx.moveTo(-6, -6);
  ctx.lineTo(5, 14);
  ctx.lineTo(-31, 14);
  ctx.moveTo(9, -12);
  ctx.lineTo(34, 11);
  ctx.stroke();

  ctx.strokeStyle = "#1b1f20";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(16, -18);
  ctx.lineTo(37, -9);
  ctx.stroke();

  ctx.strokeStyle = vehicle.fork;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(24, -16);
  ctx.lineTo(40, -8);
  ctx.stroke();

  ctx.fillStyle = vehicle.body;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-36, -2);
  ctx.lineTo(-11, -20);
  ctx.lineTo(21, -18);
  ctx.lineTo(11, 2);
  ctx.lineTo(-26, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = vehicle.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.lineTo(30, -27);
  ctx.lineTo(43, -24);
  ctx.lineTo(18, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#151615";
  ctx.beginPath();
  ctx.moveTo(-29, -11);
  ctx.quadraticCurveTo(-4, -25, 16, -18);
  ctx.lineTo(6, -12);
  ctx.quadraticCurveTo(-12, -14, -29, -7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#20211d";
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6b6d62";
  ctx.beginPath();
  ctx.arc(0, 6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d8d8cc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-31, 14);
  ctx.lineTo(-4, 30);
  ctx.lineTo(4, 18);
  ctx.stroke();

  ctx.strokeStyle = rider.suit;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-8, -28);
  ctx.lineTo(8, -21);
  ctx.lineTo(18, -31);
  ctx.stroke();

  ctx.strokeStyle = rider.suit;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-8, -26);
  ctx.lineTo(-28, -31);
  ctx.lineTo(-45, -22);
  ctx.moveTo(-20, -23);
  ctx.lineTo(-42, -12);
  ctx.stroke();

  ctx.fillStyle = rider.helmet;
  ctx.strokeStyle = "#121212";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-15, -50, 14, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = rider.visor;
  ctx.beginPath();
  ctx.roundRect(-11, -54, 20, 8, 3);
  ctx.fill();

  ctx.fillStyle = rider.helmet;
  ctx.beginPath();
  ctx.moveTo(-27, -57);
  ctx.quadraticCurveTo(-6, -67, 11, -58);
  ctx.lineTo(-4, -56);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-19, -50, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExternalBike(ctx, bike, vehicle) {
  const image = assetImage(vehicle.asset);
  if (!imageReady(image)) return false;
  const [boxX, boxY, boxW, boxH] = vehicle.imageBox;
  ctx.save();
  ctx.shadowColor = vehicle.accent;
  ctx.shadowBlur = 10;
  ctx.filter = vehicle.filter || "none";
  ctx.drawImage(image, boxX, boxY, boxW, boxH);
  ctx.filter = "none";
  ctx.shadowBlur = 0;

  ctx.globalCompositeOperation = "source-over";
  drawRotatingWheelCrop(ctx, image, vehicle.wheelBack, bike.wheelSpin, vehicle.filter);
  drawRotatingWheelCrop(ctx, image, vehicle.wheelFront, bike.wheelSpin + 0.8, vehicle.filter);
  ctx.restore();
  return true;
}

function drawRotatingWheelCrop(ctx, image, wheel, spin, filter = "none") {
  ctx.save();
  ctx.translate(wheel.x, wheel.y);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.arc(0, 0, wheel.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.filter = filter || "none";
  ctx.drawImage(
    image,
    wheel.sx - wheel.sr,
    wheel.sy - wheel.sr,
    wheel.sr * 2,
    wheel.sr * 2,
    -wheel.r,
    -wheel.r,
    wheel.r * 2,
    wheel.r * 2,
  );
  ctx.filter = "none";
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, wheel.r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawWheel(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.strokeStyle = "#101010";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(210,220,225,.6)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
    ctx.stroke();
  }

  ctx.fillStyle = "#8f9188";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1));
    ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniMap(ctx, game, w, h) {
  const mapW = Math.min(128, w * 0.22);
  const mapH = 42;
  const x0 = w - mapW - 14;
  const y0 = 22;
  const xs = game.terrain.map((p) => p.x);
  const ys = game.terrain.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  ctx.fillStyle = "rgba(255,255,255,.86)";
  ctx.strokeStyle = "rgba(39,50,56,.12)";
  ctx.beginPath();
  ctx.roundRect(x0, y0, mapW, mapH, 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  game.terrain.forEach((p, i) => {
    const x = x0 + ((p.x - minX) / (maxX - minX)) * mapW;
    const y = y0 + 6 + ((p.y - minY) / (maxY - minY)) * (mapH - 12);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(39,50,56,.24)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const bx = x0 + ((game.bike.x - minX) / (maxX - minX)) * mapW;
  ctx.fillStyle = "#58cc02";
  ctx.beginPath();
  ctx.arc(bx, y0 + mapH / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function finishGame(finished) {
  const game = state.game;
  if (!game) return;
  game.running = false;
  muteEngineSound();
  document.body.classList.remove("playing-game");
  try {
    screen.orientation?.unlock?.();
  } catch (error) {
    // 部分浏览器不支持解锁，忽略即可。
  }
  window.removeEventListener("resize", game.resize);
  window.removeEventListener("keydown", game.keydown);
  window.removeEventListener("keyup", game.keyup);
  const elapsed = (performance.now() - game.start - (game.pausedTotal || 0)) / 1000;
  $("result-status").textContent = finished ? "骑行完成" : "本次结束";
  $("result-score").textContent = Math.max(0, game.score).toLocaleString();
  $("result-flips").textContent = String(game.flips);
  $("result-crashes").textContent = String(game.crashes);
  $("result-time").textContent = formatTime(elapsed);
  drawShareCard(Math.max(0, game.score), elapsed, game.flips, game.crashes);
  $("result-modal").hidden = false;
}

function drawShareCard(score, elapsed, flips, crashes) {
  const canvas = $("share-card");
  const ctx = canvas.getContext("2d");
  const track = state.selected;
  const lineColor = marketColorForPoints(state.points);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.font = "bold 42px sans-serif";
  ctx.fillStyle = "#273238";
  ctx.fillText("A股", 58, 76);
  ctx.fillStyle = "#58cc02";
  ctx.fillText("K线骑行", 144, 76);
  ctx.fillStyle = "#7b8794";
  ctx.font = "28px sans-serif";
  ctx.fillText(`${track.name} · ${track.code}`, 58, 136);
  ctx.textAlign = "center";
  ctx.fillStyle = "#273238";
  ctx.font = "bold 138px sans-serif";
  ctx.fillText(score.toLocaleString(), canvas.width / 2, 300);
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#7b8794";
  ctx.fillText("分", canvas.width / 2, 346);
  drawShareChart(ctx, state.points, lineColor, 58, 420, canvas.width - 116, 250);
  const stats = [
    ["翻转", flips],
    ["摔车", crashes],
    ["用时", formatTime(elapsed)],
  ];
  stats.forEach(([label, value], i) => {
    const x = 170 + i * 280;
    ctx.fillStyle = "#7b8794";
    ctx.font = "24px sans-serif";
    ctx.fillText(label, x, 688);
    ctx.fillStyle = i === 1 ? "#e24b4a" : "#273238";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(String(value), x, 754);
  });
  ctx.fillStyle = "#58cc02";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("来挑战你的持仓过山车", canvas.width / 2, 1000);
  ctx.fillStyle = "#7b8794";
  ctx.font = "24px sans-serif";
  ctx.fillText("仅基于历史行情生成娱乐赛道，不构成投资建议", canvas.width / 2, 1070);
  ctx.textAlign = "left";
}

function drawShareChart(ctx, points, color, left, top, width, height) {
  const prices = points.map((p) => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const x = (i) => left + (i / (points.length - 1)) * width;
  const y = (v) => top + height - ((v - min) / range) * height;
  ctx.save();
  ctx.strokeStyle = "rgba(39,50,56,.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const gy = top + (height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(left, gy);
    ctx.lineTo(left + width, gy);
    ctx.stroke();
  }
  const gradient = ctx.createLinearGradient(0, top, 0, top + height);
  gradient.addColorStop(0, `${color}33`);
  gradient.addColorStop(1, `${color}00`);
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(x(i), y(p.close));
    else ctx.lineTo(x(i), y(p.close));
  });
  ctx.lineTo(left + width, top + height);
  ctx.lineTo(left, top + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(x(i), y(p.close));
    else ctx.lineTo(x(i), y(p.close));
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#7b8794";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(points[0].date.slice(0, 7), left, top + height + 36);
  ctx.textAlign = "right";
  ctx.fillText(points[points.length - 1].date.slice(0, 7), left + width, top + height + 36);
  ctx.restore();
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function formatTimeTenths(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds - min * 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec.toFixed(1)}`;
}

function togglePause() {
  const game = state.game;
  if (!game || game.finished) return;
  if (game.paused) return;
  game.paused = true;
  game.pauseStarted = performance.now();
  muteEngineSound();
  $("pause-menu").hidden = false;
}

function resumeGame() {
  const game = state.game;
  if (!game || !game.paused) return;
  game.paused = false;
  game.pausedTotal += performance.now() - (game.pauseStarted || performance.now());
  $("pause-menu").hidden = true;
  hideCrashFeedback();
  updateEngineSound(game);
}

function retryCurrentGame() {
  $("pause-menu").hidden = true;
  $("result-modal").hidden = true;
  startGame();
}

function exitGameToHome() {
  const game = state.game;
  if (game) game.running = false;
  muteEngineSound();
  $("pause-menu").hidden = true;
  $("result-modal").hidden = true;
  document.body.classList.remove("playing-game");
  showScreen("home-screen");
}

function saveShareCard() {
  const link = document.createElement("a");
  link.href = $("share-card").toDataURL("image/png");
  link.download = `A股K线骑行-${state.selected.code}.png`;
  link.click();
}

function isTextInput(target) {
  return Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
}

function gameScreenActive() {
  const screen = $("game-screen");
  return screen && !screen.hidden;
}

function preventGameSelection(event) {
  if (isTextInput(event.target)) return;
  event.preventDefault();
}

function clearGameplaySelection() {
  if (!gameScreenActive() || isTextInput(document.activeElement)) return;
  const selection = window.getSelection?.();
  if (selection && selection.rangeCount > 0) selection.removeAllRanges();
}

function bindActions() {
  $("back-home").addEventListener("click", () => showScreen("home-screen"));
  $("start-ride").addEventListener("click", () => {
    startGame();
  });
  $("change-loadout")?.addEventListener("click", openLoadoutModal);
  $("close-loadout")?.addEventListener("click", closeLoadoutModal);
  $("confirm-loadout")?.addEventListener("click", confirmLoadout);
  $("quit-game").addEventListener("click", togglePause);
  $("pause-resume").addEventListener("click", resumeGame);
  $("pause-retry").addEventListener("click", retryCurrentGame);
  $("pause-exit").addEventListener("click", exitGameToHome);
  document.querySelector(".ghost-action")?.addEventListener("click", () => {
    $("result-modal").hidden = true;
    startGame();
  });
  document.querySelector(".sound-action")?.addEventListener("click", () => {
    state.sound = !state.sound;
    if (state.sound) ensureEngineAudio();
    else muteEngineSound();
    updateSoundIcons();
  });
  $("retry-track").addEventListener("click", () => {
    $("result-modal").hidden = true;
    startGame();
  });
  $("new-track").addEventListener("click", () => {
    $("result-modal").hidden = true;
    showScreen("home-screen");
  });
  $("save-card").addEventListener("click", saveShareCard);
  $("legal-link").addEventListener("click", (event) => {
    event.preventDefault();
    $("legal-modal").hidden = false;
  });
  $("close-legal").addEventListener("click", () => {
    $("legal-modal").hidden = true;
  });
  $("sound-toggle").addEventListener("click", () => {
    state.sound = !state.sound;
    if (state.sound) ensureEngineAudio();
    else muteEngineSound();
    updateSoundIcons();
  });
  $("period-tabs").addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    state.period = btn.dataset.period;
    document.querySelectorAll("#period-tabs button").forEach((button) => {
      button.classList.toggle("active", button === btn);
    });
    renderPregame();
  });

  const gameScreen = $("game-screen");
  ["contextmenu", "selectstart", "dragstart"].forEach((eventName) => {
    gameScreen.addEventListener(eventName, preventGameSelection);
  });
  document.addEventListener("selectionchange", clearGameplaySelection);
}

drawHero();
renderCards();
setupSearch();
setupLoadout();
bindActions();
