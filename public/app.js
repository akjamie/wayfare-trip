const UI = {
  en: {
    title: "Weather-aware attraction recommendations",
    subtitle: "Enter a Chinese city (Chinese or pinyin). Rainy days favour indoor spots; hot days avoid midday outdoors.",
    submit: "Recommend",
    loading: "Loading…",
    noAttractions: "No attractions to show.",
    unreachable: "We couldn't reach the service. Please try again.",
    dayPrefix: "Day",
  },
  "zh-CN": {
    title: "天气感知景点推荐",
    subtitle: "输入中国城市（支持中文或拼音）。雨天优先室内景点，高温避开正午户外。",
    submit: "推荐",
    loading: "加载中…",
    noAttractions: "暂无景点可展示。",
    unreachable: "无法连接服务，请稍后重试。",
    dayPrefix: "第",
  },
};

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

function currentLang() {
  return langSelect.value === "zh-CN" ? "zh-CN" : "en";
}

function applyUiLabels() {
  const ui = UI[currentLang()];
  titleEl.textContent = ui.title;
  subtitleEl.textContent = ui.subtitle;
  submitEl.textContent = ui.submit;
  document.documentElement.lang = currentLang();
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render(data) {
  const ui = UI[currentLang()];
  const notices = (data.notices ?? [])
    .map((n) => `<div class="notice">${esc(n)}</div>`)
    .join("");
  weatherEl.innerHTML = notices + data.days
    .map(
      (d) =>
        `<div class="weather"><h3>${esc(d.date)}</h3><div class="temp">${esc(d.weather.summary)} ${Math.round(d.weather.tempMaxC)}°C</div>` +
        `<div>${Math.round(d.weather.precipProb)}% · ${esc(d.weather.summary)}</div></div>`,
    )
    .join("");

  summaryEl.textContent = (data.summary ?? "").split("\n")[0] ?? "";

  const cards = [];
  for (const day of data.days) {
    cards.push(`<h2 class="summary">${esc(day.date)} — ${esc(day.weather.summary)}</h2>`);
    cards.push(`<p class="summary">${esc(day.advice)}</p>`);
    if (!day.attractions.length) {
      cards.push(`<p class="summary">${esc(ui.noAttractions)}</p>`);
      continue;
    }
    for (const a of day.attractions) {
      const img = a.image
        ? `<img src="${esc(a.image)}" alt="${esc(a.name_zh)}" loading="lazy" />`
        : `<img alt="${esc(a.name_zh)}" />`;
      cards.push(
        `<article class="card">${img}<div class="body">` +
          `<h3>${esc(a.name_zh)} <span class="tag">${esc(a.environment)}</span></h3>` +
          `<p class="reason">${esc(a.reason)}</p>` +
          `<p class="intro">${esc(a.introduction)}</p>` +
          (a.advisories?.length ? `<p class="reason">⚠ ${esc(a.advisories.join(" "))}</p>` : "") +
          `</div></article>`,
      );
    }
  }
  cardsEl.innerHTML = cards.join("");

  itineraryEl.innerHTML = data.days
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
}

async function run() {
  const ui = UI[currentLang()];
  const city = cityInput.value.trim();
  const days = daysInput.value || "7";
  const lang = currentLang();
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
  if (cityInput.value.trim()) run();
});

applyUiLabels();
