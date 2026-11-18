// The "Nations" tab: national-team games. International games come in bursts a few
// times a year, so instead of a week view this shows the next upcoming games
// and the most recent results.

const nations = (() => {
  let hidden = new Set(storage.get("nationsHidden", [])); // competitions the user switched off
  let allMatches = [];
  let refreshTimer;

  const el = {
    filter: document.getElementById("nationsFilter"),
    errors: document.getElementById("nationsErrors"),
    upcoming: document.getElementById("nationsUpcoming"),
    recent: document.getElementById("nationsRecent"),
  };

  function init() {
    el.filter.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const id = chip.dataset.id;
      hidden.has(id) ? hidden.delete(id) : hidden.add(id);
      chip.setAttribute("aria-pressed", !hidden.has(id));
      storage.set("nationsHidden", [...hidden]);
      render();
    });
  }

  async function load(force = false) {
    const failed = new Set();
    const year = new Date().getFullYear();
    // This year's and next year's games (and last year's in January, so recent results still show).
    const years = new Date().getMonth() === 0 ? [year - 1, year, year + 1] : [year, year + 1];

    const requests = NATIONS.flatMap(comp => years.map(y =>
      api.getYear(comp.id, y, { force }).catch(() => { failed.add(comp.name); return []; })));

    const seen = new Set();
    allMatches = (await Promise.all(requests)).flat()
      .filter(m => !seen.has(m.id) && seen.add(m.id))
      .sort((a, b) => a.date - b.date);

    el.errors.innerHTML = failed.size
      ? `<div class="error">Couldn't load ${[...failed].join(", ")}. Try refreshing the page.</div>` : "";
    render();

    clearTimeout(refreshTimer);
    if (matchUI.needsRefresh(allMatches)) refreshTimer = setTimeout(() => load(true), LIVE_REFRESH_MS);
  }

  function render() {
    const now = new Date();
    const recentFrom = addDays(startOfDay(now), -NATIONS_RECENT_DAYS);

    // Recent = finished games from the last few weeks. Upcoming = everything else from now on
    // (including future games that were postponed or canceled, so you can see that).
    const recentAll = allMatches.filter(m => matchUI.isFinished(m) && m.date >= recentFrom && m.date <= now);
    const upcomingAll = allMatches.filter(m => !matchUI.isFinished(m) && (m.date >= now || m.state === "in"));

    // Only offer filter buttons for competitions that actually have games right now.
    const active = NATIONS.filter(c => [...upcomingAll, ...recentAll].some(m => m.league === c.id));
    el.filter.innerHTML = active.length
      ? matchUI.chips(active, new Set(active.filter(c => !hidden.has(c.id)).map(c => c.id)))
      : `<span class="muted">No national-team competitions are active right now.</span>`;

    const show = m => !hidden.has(m.league);
    const upcoming = upcomingAll.filter(show).slice(0, NATIONS_UPCOMING_LIMIT);
    const recent = recentAll.filter(show).reverse(); // newest first

    el.upcoming.innerHTML = upcoming.length
      ? nextWindowNote(upcoming[0], now) + matchUI.dayGroups(upcoming)
      : `<div class="empty">No upcoming national-team games scheduled yet. Check back closer to the next international break.</div>`;

    el.recent.innerHTML = recent.length
      ? matchUI.dayGroups(recent)
      : `<div class="empty">No national-team games in the last ${NATIONS_RECENT_DAYS} days.</div>`;
  }

  // A friendly heads-up like "Next international games: in 3 weeks (Sat, Dec 5)".
  function nextWindowNote(first, now) {
    if (first.state === "in") return "";
    const days = Math.round((startOfDay(first.date) - startOfDay(now)) / 86400000);
    if (days < 2) return "";
    const when = days < 14 ? `in ${days} days` : days < 60 ? `in ${Math.round(days / 7)} weeks` : `in ${Math.round(days / 30)} months`;
    const date = first.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return `<div class="note">Next national-team game is <strong>${when}</strong> (${date}).</div>`;
  }

  return { init, load };
})();
