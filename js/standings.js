// The "Standings" tab: the league table for one league at a time.

const standings = (() => {
  let current = storage.get("standingsLeague", LEAGUES[0].id);
  if (!leagueById(current)) current = LEAGUES[0].id;

  const el = {
    picker: document.getElementById("standingsLeague"),
    table: document.getElementById("standings"),
  };

  function init() {
    el.picker.innerHTML = LEAGUES.map(l => `
      <button data-id="${l.id}" aria-pressed="${l.id === current}">
        <img src="${l.logo}" alt="">${l.name}
      </button>`).join("");

    el.picker.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      current = btn.dataset.id;
      storage.set("standingsLeague", current);
      el.picker.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === current));
      load();
    });
  }

  async function load() {
    el.table.innerHTML = `<div class="status">Loading table…</div>`;
    const leagueId = current;
    try {
      const data = await api.getStandings(leagueId);
      if (leagueId !== current) return; // user switched league while loading
      render(data);
    } catch {
      el.table.innerHTML = `<div class="error">Couldn't load the ${leagueById(leagueId).name} table. Try refreshing the page.</div>`;
    }
  }

  function render(data) {
    if (!data.groups.some(g => g.rows.length)) {
      el.table.innerHTML = `<div class="empty">No table available yet for this season.</div>`;
      return;
    }
    el.table.innerHTML = data.groups.map(group => `
      <section class="group">
        ${group.name ? `<h2 class="group-title">${esc(group.name)}</h2>` : ""}
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th class="club">Club</th>
                  <th title="Played">P</th>
                  <th title="Won">W</th>
                  <th title="Drawn">D</th>
                  <th title="Lost">L</th>
                  <th class="hide-sm" title="Goals for">GF</th>
                  <th class="hide-sm" title="Goals against">GA</th>
                  <th title="Goal difference">GD</th>
                  <th title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>${group.rows.map(row).join("")}</tbody>
            </table>
          </div>
          ${legend(group.rows)}
        </div>
      </section>`).join("");
  }

  function row(r) {
    const gd = String(r.goalDiff);
    const gdClass = gd.startsWith("+") && gd !== "+0" ? "gd-pos" : gd.startsWith("-") ? "gd-neg" : "";
    const zone = r.note?.color ? `style="--zone:${esc(r.note.color)}"` : "";
    return `
      <tr>
        <td class="pos" ${zone} ${r.note ? `title="${esc(r.note.text)}"` : ""}>${r.rank}</td>
        <td class="club" title="${esc(r.fullName)}">
          ${r.logo ? `<img src="${esc(r.logo)}" alt="" loading="lazy">` : ""}${esc(r.team)}
        </td>
        <td>${esc(r.played)}</td>
        <td>${esc(r.won)}</td>
        <td>${esc(r.drawn)}</td>
        <td>${esc(r.lost)}</td>
        <td class="hide-sm">${esc(r.goalsFor)}</td>
        <td class="hide-sm">${esc(r.goalsAgainst)}</td>
        <td class="${gdClass}">${esc(gd)}</td>
        <td class="pts">${esc(r.points)}</td>
      </tr>`;
  }

  // Key explaining the coloured bars (Champions League, relegation, playoffs…).
  function legend(rows) {
    const zones = new Map();
    for (const r of rows) if (r.note?.text && !zones.has(r.note.text)) zones.set(r.note.text, r.note.color);
    if (!zones.size) return "";
    return `<div class="legend">${[...zones].map(([text, color]) =>
      `<span><i style="--zone:${esc(color)}"></i>${esc(text)}</span>`).join("")}</div>`;
  }

  return { init, load };
})();
