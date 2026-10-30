const UI = {
  en: {
    title: "Weather-aware trip planner",
    subtitle: "Enter a Chinese city (Chinese or pinyin). Add hotel preferences if you like.",
    prefs: "Hotel preferences (optional)",
    any: "Any",
    priceMin: "Price min",
    priceMax: "Price max",
    search: "Search",
    clear: "Clear",
    hotels: "Hotels",
    plan: "Trip plan",
    days: "Daily status",
    routes: "Routes",
    primary: "Primary",
    loading: "Loading…",
    noHotels: "No hotel recommendations for this city yet.",
    noAttractions: "No attractions to show.",
    unreachable: "We couldn't reach the service. Please try again.",
    placeholder: "Beijing / 北京 / beijing",
  },
  "zh-CN": {
    title: "天气感知行程规划",
    subtitle: "输入中国城市（支持中文或拼音），可选填酒店偏好。",
    prefs: "酒店偏好（可选）",
    any: "不限",
    priceMin: "最低价",
    priceMax: "最高价",
    search: "搜索",
    clear: "清空",
    hotels: "酒店推荐",
    plan: "行程计划",
    days: "每日天气与景点",
    routes: "出行路线",
    primary: "首选",
    loading: "加载中…",
    noHotels: "暂未找到该城市的酒店推荐。",
    noAttractions: "暂无景点可展示。",
    unreachable: "无法连接服务，请稍后重试。",
    placeholder: "北京 / Beijing / beijing",
  },
};

const MAX_CARDS = 3;
const $ = (id) => document.getElementById(id);
const form = $("form");
const cityInput = $("city");
const daysInput = $("days");
const langSelect = $("lang");
const priceMin = $("priceMin");
const priceMax = $("priceMax");
const starChips = $("star-chips");
const summaryEl = $("summary");
const loadingEl = $("loading");
const errorEl = $("error");
const hotelsEl = $("hotels");
const weatherEl = $("weather");
const cardsEl = $("cards");
const itineraryEl = $("itinerary");
const routesEl = $("routes");
const resultsEl = $("results");
const titleEl = $("app-title");
const subtitleEl = $("app-subtitle");
const submitEl = $("submit");
const clearEl = $("clear");
const prefsSummaryEl = $("prefs-summary");
const planTitleEl = $("plan-title");
const daysTitleEl = $("days-title");
const hotelsTitleEl = $("hotels-title");
const routesTitleEl = $("routes-title");

let hasSearched = false;

const currentLang = () => (langSelect.value === "zh-CN" ? "zh-CN" : "en");
const esc = (v) =>
  String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const selectedStar = () => {
  const pressed = starChips.querySelector('.chip[aria-pressed="true"]');
  return pressed ? pressed.getAttribute("data-star") : "";
};

function applyUiLabels() {
  const lang = currentLang();
  const ui = UI[lang];
  titleEl.textContent = ui.title;
  subtitleEl.textContent = ui.subtitle;
  prefsSummaryEl.textContent = ui.prefs;
  submitEl.textContent = ui.search;
  clearEl.textContent = ui.clear;
  planTitleEl.textContent = ui.plan;
  daysTitleEl.textContent = ui.days;
  hotelsTitleEl.textContent = ui.hotels;
  routesTitleEl.textContent = ui.routes;
  cityInput.placeholder = ui.placeholder;
  starChips.querySelectorAll(".chip").forEach((chip) => {
    if (!chip.getAttribute("data-star")) chip.textContent = ui.any;
  });
  document.documentElement.lang = lang;
  document.title = `${ui.title} — wayfare-trip`;
}

function setStar(value) {
  starChips.querySelectorAll(".chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.getAttribute("data-star") === value));
  });
}

function imageOrPlaceholder(item) {
  if (item.image) return `<img src="${esc(item.image)}" alt="${esc(item.name_zh)}" loading="lazy" />`;
  const initial = (item.name_zh || "?").trim().charAt(0);
  return `<div class="${item.primary === undefined ? "card-ph" : "ph"}" role="img" aria-label="${esc(item.name_zh)}">${esc(initial)}</div>`;
}

function render(data) {
  const ui = UI[currentLang()];
  const notices = (data.notices ?? []).map((n) => `<div class="notice">${esc(n)}</div>`).join("");
  summaryEl.textContent = (data.summary ?? "").split("\n")[0] ?? "";

  const nameOf = {};
  for (const d of data.days) for (const a of d.attractions) nameOf[a.id] = a.name_zh;
  for (const h of data.hotels ?? []) nameOf[h.id] = h.name_zh;

  // Hotels
  hotelsEl.innerHTML =
    notices +
    (data.hotels ?? [])
      .map(
        (h) =>
          `<article class="hotel">${imageOrPlaceholder(h)}<div class="body">` +
          `<h3>${esc(h.name_zh)}${h.primary ? `<span class="badge">${esc(ui.primary)}</span>` : ""}</h3>` +
          `<p class="meta">${[h.star ? `★${h.star}` : "", h.brand ?? "", h.price !== undefined ? `¥${h.price}` : "", h.rating !== undefined ? `${h.rating}` : ""].filter(Boolean).join(" · ")}</p>` +
          `<p class="meta">${esc(h.reason)}</p></div></article>`,
      )
      .join("") || `<p class="summary">${esc(ui.noHotels)}</p>`;

  // Trip plan (itinerary) — per-stop times + durations, day total
  itineraryEl.innerHTML = data.days
    .filter((d) => d.itinerary?.length)
    .map(
      (d) =>
        `<div class="day-panel"><h3>${esc(d.date)} <span class="tag">${esc(String(d.totalMinutes))} min</span></h3><ul class="slots">${d.itinerary
          .map(
            (s) =>
              `<li><span class="slot">${esc(s.label)} ${esc(s.startTime)}–${esc(s.endTime)}</span><span>${esc(s.name_zh)} <span class="tag">${esc(s.visitMinutes)} min</span></span></li>`,
          )
          .join("")}</ul></div>`,
    )
    .join("");

  // Weather
  weatherEl.innerHTML = data.days
    .map(
      (d) =>
        `<div class="weather"><h3>${esc(d.date)}</h3><div class="temp">${esc(d.weather.summary)} ${Math.round(d.weather.tempMaxC)}°C</div><div>${Math.round(d.weather.precipProb)}%</div></div>`,
    )
    .join("");

  // Daily attractions (≤5)
  const groups = [];
  for (const day of data.days) {
    const shown = (day.attractions ?? []).slice(0, MAX_CARDS);
    const html = shown.length
      ? shown
          .map(
            (a) =>
              `<article class="card">${imageOrPlaceholder(a)}<div class="body"><h3>${esc(a.name_zh)} <span class="tag">${esc(a.environment)}</span></h3><p class="reason">${esc(a.reason)}</p><p class="intro">${esc(a.introduction)}</p></div></article>`,
          )
          .join("")
      : `<p class="summary">${esc(ui.noAttractions)}</p>`;
    groups.push(
      `<section class="day-group"><h3 class="day-head">${esc(day.date)} — ${esc(day.weather.summary)}</h3><p class="summary">${esc(day.advice)}</p><div class="cards">${html}</div></section>`,
    );
  }
  cardsEl.innerHTML = groups.join("");

  // Routes
  routesEl.innerHTML = data.days
    .map(
      (d) =>
        `<div class="day-panel"><h3>${esc(d.date)}</h3>` +
        (d.route?.legs?.length
          ? `<ul class="legs">${d.route.legs
              .map(
                (l) =>
                  `<li><span class="leg-mode">${esc(l.mode)}</span><span>${esc(nameOf[l.from] ?? l.from)} → ${esc(nameOf[l.to] ?? l.to)}</span><span>${l.distanceKm} km · ${l.durationMin} min</span></li>`,
              )
              .join("")}</ul>`
          : `<p class="summary">—</p>`) +
        `</div>`,
    )
    .join("");
}

async function run() {
  const ui = UI[currentLang()];
  const city = cityInput.value.trim();
  const days = daysInput.value || "7";
  const lang = currentLang();
  const star = selectedStar();
  hasSearched = true;

  errorEl.hidden = true;
  loadingEl.hidden = false;
  resultsEl.hidden = true;
  summaryEl.textContent = ui.loading;

  const params = new URLSearchParams({ city, days, lang });
  if (star) params.set("star", star);
  if (priceMin.value.trim()) params.set("priceMin", priceMin.value.trim());
  if (priceMax.value.trim()) params.set("priceMax", priceMax.value.trim());

  try {
    const res = await fetch(`/api/recommend?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    loadingEl.hidden = true;
    if (!res.ok) {
      errorEl.hidden = false;
      errorEl.textContent = data.message ?? ui.unreachable;
      summaryEl.textContent = "";
      return;
    }
    resultsEl.hidden = false;
    render(data);
  } catch {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = ui.unreachable;
  }
}

starChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  setStar(chip.getAttribute("data-star") ?? "");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});

clearEl.addEventListener("click", () => {
  cityInput.value = "";
  daysInput.value = "7";
  priceMin.value = "";
  priceMax.value = "";
  setStar("");
  hasSearched = false;
  errorEl.hidden = true;
  loadingEl.hidden = true;
  summaryEl.textContent = "";
  hotelsEl.innerHTML = "";
  itineraryEl.innerHTML = "";
  weatherEl.innerHTML = "";
  cardsEl.innerHTML = "";
  routesEl.innerHTML = "";
  hotelsEl.innerHTML = "";
  resultsEl.hidden = true;
});

langSelect.addEventListener("change", () => {
  applyUiLabels();
  try {
    localStorage.setItem("wayfare.lang", currentLang());
  } catch {}
  if (hasSearched) run();
});

try {
  const saved = localStorage.getItem("wayfare.lang");
  if (saved === "en" || saved === "zh-CN") langSelect.value = saved;
} catch {}

applyUiLabels();
