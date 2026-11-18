// Shared code for drawing match cards. Used by both the Fixtures and Nations tabs.

const matchUI = (() => {
  // Groups matches by local date and returns the HTML for each day's card.
  // "extra" is an optional function that adds something (like a button) to each match.
  function dayGroups(matches, extra) {
    const byDay = new Map();
    for (const m of matches) {
      const key = ymd(m.date);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(m);
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    return [...byDay.values()].map(list => {
      const d = list[0].date;
      const label = d.toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric",
        year: d.getFullYear() !== thisYear ? "numeric" : undefined,
      });
      const tag = sameDay(d, today) ? `<span class="pill">Today</span>`
                : sameDay(d, addDays(today, 1)) ? `<span class="pill soft">Tomorrow</span>`
                : sameDay(d, addDays(today, -1)) ? `<span class="pill soft">Yesterday</span>` : "";
      return `
        <section class="day">
          <h2 class="day-title">${label} ${tag}</h2>
          <div class="card">${list.map(m => row(m, extra)).join("")}</div>
        </section>`;
    }).join("");
  }

  function row(m, extra) {
    const comp = leagueById(m.league);
    const showScore = !isCalledOff(m) && (m.state === "in" || m.state === "post");

    let time;
    if (isCalledOff(m) || /tbd/i.test(m.detail || "")) {
      time = `<div class="time final">${esc(m.detail)}</div>`;
    } else if (m.state === "in") {
      time = `<div class="time live">${esc(m.clock || "LIVE")}<small>Live</small></div>`;
    } else if (m.state === "post") {
      time = `<div class="time final">${esc(m.detail || "FT")}<small>${formatTime(m.date)}</small></div>`;
    } else {
      time = `<div class="time">${formatTime(m.date)}</div>`;
    }

    const team = t => {
      const result = m.state !== "post" ? "" : t.winner ? " win" : (m.home.winner || m.away.winner) ? " lose" : "";
      return `
        <div class="team${result}">
          ${t.logo ? `<img src="${esc(t.logo)}" alt="" loading="lazy">` : ""}
          <span class="name">${esc(t.name)}</span>
          ${showScore ? `<span class="score">${esc(t.score)}</span>` : ""}
        </div>`;
    };

    return `
      <div class="match" data-id="${esc(m.id)}">
        ${time}
        <div class="teams">${team(m.home)}${team(m.away)}</div>
        <div class="meta">
          <div class="league-tag"><img src="${comp.logo}" alt="">${esc(comp.name)}</div>
          ${m.round ? `<div class="round">${esc(m.round)}</div>` : ""}
          ${m.venue ? `<div>${esc(m.venue)}</div>` : ""}
          ${m.tv.length ? `<div>📺 ${esc(m.tv.slice(0, 2).join(", "))}</div>` : ""}
          ${extra ? extra(m) : ""}
        </div>
      </div>`;
  }

  // Postponed, canceled, abandoned or suspended games.
  function isCalledOff(m) {
    return /postponed|cancel|abandon|suspend/i.test(m.detail || "");
  }

  // A game that has actually been played to the end.
  function isFinished(m) {
    return m.state === "post" && !isCalledOff(m);
  }

  // True when a game is live or kicks off within 15 minutes, so the page should keep refreshing.
  function needsRefresh(matches) {
    const now = Date.now();
    return matches.some(m => m.state === "in" || (m.state === "pre" && Math.abs(m.date - now) < 15 * 60 * 1000));
  }

  // The pill-shaped filter buttons used on both tabs.
  function chips(list, enabled) {
    return list.map(l => `
      <button class="chip" data-id="${l.id}" aria-pressed="${enabled.has(l.id)}">
        <img src="${l.logo}" alt="">${esc(l.name)}
      </button>`).join("");
  }

  return { dayGroups, needsRefresh, chips, isFinished, isCalledOff };
})();
