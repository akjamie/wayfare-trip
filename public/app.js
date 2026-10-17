const form = document.getElementById("form");
const cityInput = document.getElementById("city");
const daysInput = document.getElementById("days");
const output = document.getElementById("output");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  const days = daysInput.value || "7";
  output.innerHTML = "<p>Loading…</p>";
  try {
    const res = await fetch(
      `/api/recommend?city=${encodeURIComponent(city)}&days=${encodeURIComponent(days)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      output.innerHTML = `<p class="error">${escapeHtml(data.message ?? "Something went wrong.")}</p>`;
      return;
    }
    render(data);
  } catch {
    output.innerHTML = `<p class="error">We couldn't reach the service. Please try again.</p>`;
  }
});

function render(data) {
  const parts = [];
  if (data.notices?.length) {
    parts.push(
      data.notices.map((n) => `<div class="notice">${escapeHtml(n)}</div>`).join(""),
    );
  }
  parts.push(`<p>${escapeHtml(data.summary.split("\n")[0])}</p>`);
  for (const day of data.days) {
    const items = day.attractions.length
      ? `<ul>${day.attractions
          .map(
            (a) =>
              `<li><span class="zag">${escapeHtml(a.name_zh)}</span> <span class="env">(${escapeHtml(a.environment)})</span>${
                a.advisories?.length
                  ? ` — ${escapeHtml(a.advisories.join(" "))}`
                  : ""
              }</li>`,
          )
          .join("")}</ul>`
      : "<p class='env'>No attractions to show.</p>";
    parts.push(
      `<section class="day"><h2>${escapeHtml(day.date)} — ${escapeHtml(day.weather.summary)}</h2>` +
        `<p class="advice">${escapeHtml(day.advice)}</p>${items}</section>`,
    );
  }
  output.innerHTML = parts.join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
