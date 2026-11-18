// The "Fixtures" tab: a week of club matches grouped by day.

const fixtures = (() => {
  let weekStart = startOfDay(new Date());
  let enabled = new Set(storage.get("leagues", LEAGUES.map(l => l.id)));
  let refreshTimer;

  const el = {
    filter: document.getElementById("leagueFilter"),
    range: document.getElementById("range"),
    errors: document.getElementById("fixtureErrors"),
    schedule: document.getElementById("schedule"),
  };

  function init() {
    el.filter.innerHTML = matchUI.chips(LEAGUES, enabled);

    el.filter.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const id = chip.dataset.id;
      enabled.has(id) ? enabled.delete(id) : enabled.add(id);
      chip.setAttribute("aria-pressed", enabled.has(id));
      storage.set("leagues", [...enabled]);
      load();
    });

    document.getElementById("prev").onclick = () => goTo(addDays(weekStart, -DAYS_PER_PAGE));
    document.getElementById("next").onclick = () => goTo(addDays(weekStart, DAYS_PER_PAGE));
    document.getElementById("todayBtn").onclick = () => goTo(startOfDay(new Date()));
  }

  function goTo(date) {
    weekStart = date;
    el.schedule.innerHTML = `<div class="status">Loading fixtures…</div>`;
    load();
  }

  async function load(force = false) {
    const failed = new Set();
    // ESPN groups games by US Eastern date, so fetch one extra day each side
    // and then keep only games that fall in the viewer's local week.
    const days = Array.from({ length: DAYS_PER_PAGE + 2 }, (_, i) => addDays(weekStart, i - 1));
    const requests = [];
    for (const league of LEAGUES) {
      if (!enabled.has(league.id)) continue;
      for (const day of days) {
        requests.push(api.getMatches(league.id, day, { force }).catch(() => { failed.add(league.name); return []; }));
      }
    }

    const weekEnd = addDays(weekStart, DAYS_PER_PAGE);
    const seen = new Set();
    const matches = (await Promise.all(requests)).flat()
      .filter(m => !seen.has(m.id) && seen.add(m.id))
      .filter(m => m.date >= weekStart && m.date < weekEnd)
      .sort((a, b) => a.date - b.date);

    render(matches, failed);

    clearTimeout(refreshTimer);
    if (matchUI.needsRefresh(matches)) refreshTimer = setTimeout(() => load(true), LIVE_REFRESH_MS);
  }

  function render(matches, failed) {
    const fmt = { month: "short", day: "numeric" };
    el.range.textContent =
      `${weekStart.toLocaleDateString(undefined, fmt)} – ${addDays(weekStart, DAYS_PER_PAGE - 1).toLocaleDateString(undefined, fmt)}`;
    el.errors.innerHTML = failed.size
      ? `<div class="error">Couldn't load some ${[...failed].join(", ")} fixtures. Try refreshing the page.</div>` : "";

    if (!enabled.size) {
      el.schedule.innerHTML = `<div class="empty">Pick at least one league above.</div>`;
    } else if (!matches.length) {
      el.schedule.innerHTML = `<div class="empty">No matches this week. It may be an international break or the off-season. Try next week.</div>`;
    } else {
      el.schedule.innerHTML = matchUI.dayGroups(matches);
    }
  }

  return { init, load };
})();
