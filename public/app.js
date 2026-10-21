const UI = {
  en: {
    title: "Weather-aware attraction recommendations",
    subtitle: "Enter a Chinese city (Chinese or pinyin). Rainy days favour indoor spots; hot days avoid midday outdoors.",
    submit: "Recommend",
    plan: "Trip plan",
    days: "Daily status",
    placeholder: "Beijing / 北京 / beijing",
    loading: "Loading…",
    noAttractions: "No attractions to show.",
    unreachable: "We couldn't reach the service. Please try again.",
  },
  "zh-CN": {
    title: "天气感知景点推荐",
    subtitle: "输入中国城市（支持中文或拼音）。雨天优先室内景点，高温避开正午户外。",
    submit: "推荐",
    plan: "行程计划",
    days: "每日天气与景点",
    placeholder: "北京 / Beijing / beijing",
    loading: "加载中…",
    noAttractions: "暂无景点可展示。",
    unreachable: "无法连接服务，请稍后重试。",
  },
};

const MAX_CARDS = 5;

const $ = (id) => document.getElementById(id);
const form = $("form");
const cityInput = $("city");
const daysInput = $("days");
const langSelect = $("lang");
const weatherEl = $("weather");
const cardsEl = $("cards");
const itineraryEl = $("itinerary");
const summaryEl = $("summary");
const titleEl = $("app-title");
const subtitleEl = $("app-subtitle");
const submitEl = $("submit");
const planTitleEl = $("plan-title");
const daysTitleEl = $("days-title");

let hasSearched = false;

function currentLang() {
  return langSelect.value === "zh-CN" ? "zh-CN" : "en";
}

function applyUiLabels() {
  const lang = currentLang();
  const ui = UI[lang];
  titleEl.textContent = ui.title;
  subtitleEl.textContent = ui.subtitle;
  submitEl.textContent = ui.submit;
  if (planTitleEl) planTitleEl.textContent = ui.plan;
  if (daysTitleEl) daysTitleEl.textContent = ui.days;
  cityInput.placeholder = ui.placeholder;
  document.documentElement.lang = lang;
  document.title = `${ui.title} — wayfare-trip`;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardImage(a) {
  if (a.image) {
    return `<img src="${esc(a.image)}" alt="${esc(a.name_zh)}" loading="lazy" />`;
  }
  // Every card gets a visual: a gradient placeholder with the first character.
  const initial = (a.name_zh || "?").trim().charAt(0);
  return `<div class="card-ph" role="img" aria-label="${esc(a.name_zh)}">${esc(initial)}</div>`;
}

function render(data) {
  const ui = UI[currentLang()];
  const notices = (data.notices ?? [])
    .map((n) => `<div class="notice">${esc(n)}</div>`)
    .join("");

  // Plan (itinerary) — rendered into #itinerary, which sits above the daily status.
  itineraryEl.innerHTML =
    notices +
    data.days
      .filter((d) => d.itinerary?.length)
      .map(
        (d) =>
          `<div class="day-panel"><h3>${esc(d.date)}</h3>` +
          `<ul class="slots">${d.itinerary
            .map(
              (s) =>
                `<li><span class="slot">${esc(s.label)}</span><span>${esc(s.name_zh)} <span class="tag">${esc(s.environment)}</span></span></li>`,
            )
            .join("")}</ul></div>`,
      )
      .join("");

  summaryEl.textContent = (data.summary ?? "").split("\n")[0] ?? "";

  weatherEl.innerHTML = data.days
    .map(
      (d) =>
        `<div class="weather"><h3>${esc(d.date)}</h3><div class="temp">${esc(d.weather.summary)} ${Math.round(d.weather.tempMaxC)}°C</div>` +
        `<div>${Math.round(d.weather.precipProb)}%</div></div>`,
    )
    .join("");

  // Daily status: one block per day (header + advice + a nested card grid).
  const groups = [];
  for (const day of data.days) {
    const shown = (day.attractions ?? []).slice(0, MAX_CARDS);
    const cardsHtml = shown.length
      ? shown
          .map(
            (a) =>
              `<article class="card">${cardImage(a)}<div class="body">` +
              `<h3>${esc(a.name_zh)} <span class="tag">${esc(a.environment)}</span></h3>` +
              `<p class="reason">${esc(a.reason)}</p>` +
              `<p class="intro">${esc(a.introduction)}</p>` +
              (a.advisories?.length ? `<p class="reason">⚠ ${esc(a.advisories.join(" "))}</p>` : "") +
              `</div></article>`,
          )
          .join("")
      : `<p class="summary">${esc(ui.noAttractions)}</p>`;
    groups.push(
      `<section class="day-group">` +
        `<h3 class="day-head">${esc(day.date)} — ${esc(day.weather.summary)}</h3>` +
        `<p class="summary">${esc(day.advice)}</p>` +
        `<div class="cards">${cardsHtml}</div>` +
        `</section>`,
    );
  }
  cardsEl.innerHTML = groups.join("");
}

async function run() {
  const ui = UI[currentLang()];
  const city = cityInput.value.trim();
  const days = daysInput.value || "7";
  const lang = currentLang();
  hasSearched = true;
  summaryEl.textContent = ui.loading;
  cardsEl.innerHTML = "";
  itineraryEl.innerHTML = "";
  weatherEl.innerHTML = "";
  try {
    const res = await fetch(
      `/api/recommend?city=${encodeURIComponent(city)}&days=${encodeURIComponent(days)}&lang=${encodeURIComponent(lang)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      summaryEl.innerHTML = `<span class="error">${esc(data.message ?? ui.unreachable)}</span>`;
      return;
    }
    render(data);
  } catch {
    summaryEl.innerHTML = `<span class="error">${esc(ui.unreachable)}</span>`;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});

langSelect.addEventListener("change", () => {
  applyUiLabels();
  try {
    localStorage.setItem("wayfare.lang", currentLang());
  } catch {
    /* ignore storage errors */
  }
  if (hasSearched) run();
});

// Restore the saved language (explicit user choice only; default stays English).
try {
  const saved = localStorage.getItem("wayfare.lang");
  if (saved === "en" || saved === "zh-CN") langSelect.value = saved;
} catch {
  /* ignore storage errors */
}

applyUiLabels();
