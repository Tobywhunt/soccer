// The "Highlights" tab: finished games, a week at a time, with a video player.
// Videos are found by js/videos.js (ESPN, Dailymotion and, with a key, YouTube).

const highlights = (() => {
  const NATIONS_CHIP = { id: "nations", name: "National teams", logo: NATIONS[0].logo };
  const COMPETITIONS = [...LEAGUES, NATIONS_CHIP];

  let weekEnd = startOfDay(new Date());   // last day shown (today by default)
  let enabled = new Set(storage.get("highlightLeagues", COMPETITIONS.map(c => c.id)));
  let videoOnly = storage.get("highlightVideoOnly", false);
  let matches = new Map();                 // match id -> match
  const quick = new Map();                 // match id -> clips from the quick check
  const full = new Map();                  // match id -> clips after the full search (incl. YouTube)
  let loadToken = 0;
  let playerToken = 0;

  const el = {
    filter: document.getElementById("highlightFilter"),
    range: document.getElementById("hlRange"),
    next: document.getElementById("hlNext"),
    videoOnly: document.getElementById("hlVideoOnly"),
    errors: document.getElementById("highlightErrors"),
    notice: document.getElementById("highlightNotice"),
    list: document.getElementById("highlightList"),
    dialog: document.getElementById("player"),
    playerTitle: document.getElementById("playerTitle"),
    playerBody: document.getElementById("playerBody"),
  };

  function init() {
    el.filter.innerHTML = matchUI.chips(COMPETITIONS, enabled);
    el.filter.addEventListener("click", e => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const id = chip.dataset.id;
      enabled.has(id) ? enabled.delete(id) : enabled.add(id);
      chip.setAttribute("aria-pressed", enabled.has(id));
      storage.set("highlightLeagues", [...enabled]);
      load();
    });

    el.videoOnly.checked = videoOnly;
    el.videoOnly.addEventListener("change", () => {
      videoOnly = el.videoOnly.checked;
      storage.set("highlightVideoOnly", videoOnly);
      render();
    });

    document.getElementById("hlPrev").onclick = () => goTo(addDays(weekEnd, -DAYS_PER_PAGE));
    el.next.onclick = () => goTo(addDays(weekEnd, DAYS_PER_PAGE));

    el.list.addEventListener("click", e => {
      const btn = e.target.closest("button.hl-btn");
      if (btn) openPlayer(btn.dataset.id);
    });

    el.playerBody.addEventListener("click", e => {
      const clip = e.target.closest(".clip");
      if (clip) showClip(clip.dataset.matchId, Number(clip.dataset.index));
    });
    document.getElementById("playerClose").onclick = () => el.dialog.close();
    el.dialog.addEventListener("click", e => { if (e.target === el.dialog) el.dialog.close(); });
    el.dialog.addEventListener("close", () => { playerToken++; el.playerBody.innerHTML = ""; });

    el.notice.innerHTML = setupNotice();
  }

  // Tells the user what's needed for full coverage.
  function setupNotice() {
    if (!YOUTUBE_API_KEY) {
      return `<div class="note">Some games only have a YouTube link. To watch highlights for <strong>every</strong> league right here, add a free YouTube API key. The steps are in <code>README.md</code>.</div>`;
    }
    if (location.protocol === "file:") {
      return `<div class="note">YouTube videos can't play when the site is opened as a file. Open it through a web address instead, such as GitHub Pages or a local server. <code>README.md</code> explains how.</div>`;
    }
    return "";
  }

  function goTo(date) {
    const today = startOfDay(new Date());
    weekEnd = date > today ? today : date;
    el.list.innerHTML = `<div class="status">Loading results…</div>`;
    load();
  }

  async function load() {
    const token = ++loadToken;
    const weekStart = addDays(weekEnd, -(DAYS_PER_PAGE - 1));
    const failed = new Set();
    const requests = [];

    // Club leagues: one request per day (plus a day either side for time zones).
    const days = Array.from({ length: DAYS_PER_PAGE + 2 }, (_, i) => addDays(weekStart, i - 1));
    for (const league of LEAGUES) {
      if (!enabled.has(league.id)) continue;
      for (const day of days) {
        requests.push(api.getMatches(league.id, day).catch(() => { failed.add(league.name); return []; }));
      }
    }

    // National teams: one request per competition per year.
    if (enabled.has(NATIONS_CHIP.id)) {
      const years = [...new Set([weekStart.getFullYear(), weekEnd.getFullYear()])];
      for (const comp of NATIONS) {
        for (const y of years) {
          requests.push(api.getYear(comp.id, y).catch(() => { failed.add(comp.name); return []; }));
        }
      }
    }

    const results = (await Promise.all(requests)).flat();
    if (token !== loadToken) return; // the user moved on to another week

    const end = addDays(weekEnd, 1);
    matches = new Map();
    results
      .filter(m => matchUI.isFinished(m) && m.date >= weekStart && m.date < end)
      .sort((a, b) => b.date - a.date) // newest first
      .forEach(m => matches.set(m.id, m));

    const fmt = { month: "short", day: "numeric" };
    el.range.textContent = `${weekStart.toLocaleDateString(undefined, fmt)} – ${weekEnd.toLocaleDateString(undefined, fmt)}`;
    el.next.disabled = sameDay(weekEnd, new Date());
    el.errors.innerHTML = failed.size
      ? `<div class="error">Couldn't load some ${[...failed].join(", ")} results. Try refreshing the page.</div>` : "";

    render();
    checkAll(token);
  }

  // A game "has video" if something playable was found, or if YouTube can be searched.
  function playable(id) {
    return YOUTUBE_API_KEY ? true : (quick.get(id)?.length > 0);
  }

  function render() {
    if (!enabled.size) {
      el.list.innerHTML = `<div class="empty">Pick at least one competition above.</div>`;
      return;
    }
    let list = [...matches.values()];
    if (videoOnly) list = list.filter(m => playable(m.id));

    if (!list.length) {
      const stillChecking = videoOnly && [...matches.keys()].some(id => !quick.has(id));
      el.list.innerHTML = `<div class="empty">${
        stillChecking ? "Checking for videos…"
        : videoOnly ? "No games with videos this week. Untick “Only games with video” to see all results."
        : "No finished games this week."}</div>`;
      return;
    }
    el.list.innerHTML = matchUI.dayGroups(list, actionButton);
  }

  // The button under each game.
  function actionButton(m) {
    const clips = quick.get(m.id);
    if (!clips && !YOUTUBE_API_KEY) {
      return `<div class="hl-action"><span class="hl-checking">Checking for video…</span></div>`;
    }
    if (YOUTUBE_API_KEY || videos.hasHighlights(clips)) {
      return `<div class="hl-action"><button class="hl-btn" data-id="${esc(m.id)}">▶ Watch highlights</button></div>`;
    }
    if (clips.length) {
      return `<div class="hl-action">
        <button class="hl-btn secondary" data-id="${esc(m.id)}">▶ Watch clips (${clips.length})</button>
        <a class="hl-link" href="${videos.youtubeSearchUrl(m)}" target="_blank" rel="noopener">Highlights on YouTube ↗</a>
      </div>`;
    }
    return `<div class="hl-action"><a class="hl-link" href="${videos.youtubeSearchUrl(m)}" target="_blank" rel="noopener">Search YouTube ↗</a></div>`;
  }

  // Check ESPN + Dailymotion for each game, a few at a time, updating cards as answers arrive.
  async function checkAll(token) {
    const queue = [...matches.values()].filter(m => !quick.has(m.id));
    const worker = async () => {
      while (queue.length) {
        if (token !== loadToken) return;
        const m = queue.shift();
        quick.set(m.id, await videos.quickCheck(m));
        if (token !== loadToken) return;
        if (videoOnly) { render(); continue; }
        const slot = el.list.querySelector(`.match[data-id="${CSS.escape(m.id)}"] .hl-action`);
        if (slot) slot.outerHTML = actionButton(m);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  // ---- Video player ----
  async function openPlayer(matchId) {
    const m = matches.get(matchId);
    if (!m) return;
    const token = ++playerToken;
    el.playerTitle.textContent = `${m.home.name} ${m.home.score} – ${m.away.score} ${m.away.name}`;
    el.dialog.showModal();

    if (!full.has(matchId)) {
      el.playerBody.innerHTML = `<div class="player-msg">Finding highlights…</div>`;
      let quickClips = quick.get(matchId);
      if (!quickClips) { quickClips = await videos.quickCheck(m); quick.set(matchId, quickClips); }
      try {
        full.set(matchId, await videos.fullSearch(m, quickClips));
      } catch (err) {
        if (token !== playerToken) return;
        // YouTube failed (e.g. out of daily searches): still show anything else we have.
        if (quickClips.length) {
          showClip(matchId, 0, quickClips, err.message);
        } else {
          el.playerBody.innerHTML = `<div class="player-msg">${esc(err.message)}<br><br>
            <a class="hl-link" href="${videos.youtubeSearchUrl(m)}" target="_blank" rel="noopener">Search YouTube instead ↗</a></div>`;
        }
        return;
      }
    }
    if (token !== playerToken) return; // closed or switched game while loading

    if (!full.get(matchId).length) {
      el.playerBody.innerHTML = `<div class="player-msg">No highlights found yet. They're usually up within a day of the game.<br><br>
        <a class="hl-link" href="${videos.youtubeSearchUrl(m)}" target="_blank" rel="noopener">Search YouTube ↗</a></div>`;
      return;
    }
    showClip(matchId, 0);
  }

  function embed(clip) {
    if (clip.type === "youtube") {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${esc(clip.id)}?autoplay=1&rel=0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    }
    if (clip.type === "dailymotion") {
      return `<iframe src="https://www.dailymotion.com/embed/video/${esc(clip.id)}?autoplay=1"
        allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return `<video src="${esc(clip.src)}" poster="${esc(clip.thumbnail || "")}" controls autoplay playsinline></video>`;
  }

  function showClip(matchId, index, clipsOverride, warning) {
    const clips = clipsOverride || full.get(matchId) || quick.get(matchId) || [];
    const clip = clips[index];
    if (!clip) return;
    const m = matches.get(matchId);
    el.playerBody.innerHTML = `
      ${warning ? `<div class="error player-warning">${esc(warning)}</div>` : ""}
      <div class="video-frame">${embed(clip)}</div>
      <div class="now-playing">
        <div>
          <strong>${esc(clip.title)}</strong>
          <div class="source">${esc(clip.source)}${clip.official ? ` <span class="badge">Official</span>` : ""}</div>
        </div>
        ${clip.url ? `<a href="${esc(clip.url)}" target="_blank" rel="noopener">Open in new tab ↗</a>` : ""}
      </div>
      ${clips.length > 1 ? `
        <div class="clips">
          ${clips.map((c, i) => `
            <button class="clip" data-match-id="${esc(matchId)}" data-index="${i}" aria-current="${i === index}">
              <span class="clip-thumb" style="background-image:url('${esc(c.thumbnail || "")}')">
                ${c.seconds ? `<span class="clip-time">${duration(c.seconds)}</span>` : ""}
              </span>
              <span class="clip-title">${esc(c.title)}</span>
              <span class="clip-source">${esc(c.source)}</span>
            </button>`).join("")}
        </div>` : ""}
      <a class="hl-link more" href="${videos.youtubeSearchUrl(m)}" target="_blank" rel="noopener">Find more on YouTube ↗</a>`;
  }

  function duration(s) {
    return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
  }

  return { init, load };
})();
