// Finds highlight videos for a game from several places:
//   1. ESPN            – always checked (great for La Liga, some others)
//   2. Dailymotion     – always checked (official beIN Sports uploads cover the Bundesliga well)
//   3. YouTube         – only if YOUTUBE_API_KEY is set in config.js (official channels for every league)
// Each video is returned in the same shape so the player can treat them all alike:
//   { type: "mp4" | "youtube" | "dailymotion", title, source, official, thumbnail, seconds, src | id, url }

const videos = (() => {
  const DAY = 24 * 60 * 60 * 1000;
  const SEARCH_WINDOW_DAYS = 10; // highlights are uploaded within a few days of the game

  // ---- Matching video titles to the right game ----
  // Words too common to identify a club on their own.
  const COMMON = new Set(["fc", "cf", "sc", "afc", "club", "real", "united", "city", "the", "de", "del", "la",
    "sv", "vfl", "vfb", "tsg", "rcd", "ud", "ca", "cd", "sd", "fsv", "bsc", "and", "football", "soccer"]);

  function normalize(s) {
    return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  }

  function teamWords(team) {
    const words = normalize(`${team.name} ${team.fullName}`).split(" ");
    return [...new Set(words.filter(w => w.length > 2 && !COMMON.has(w) && !/^\d+$/.test(w)))];
  }

  // A title is about this game if it mentions both teams.
  function mentionsGame(title, m) {
    const t = ` ${normalize(title)} `;
    const has = team => teamWords(team).some(w => t.includes(` ${w} `) || t.includes(` ${w}`));
    return has(m.home) && has(m.away);
  }

  // Titles that look like actual match highlights (in English, Spanish or German).
  function looksLikeHighlights(title) {
    return /highlight|resumen|all goals|todos los goles|goles|zusammenfassung|tore|extended/i.test(title)
      && !/press conference|rueda de prensa|pressekonferenz|reacts?\b|reaction|interview/i.test(title);
  }

  // Best first: real highlights, then official sources, then the rest.
  function rank(clips) {
    const score = c => (looksLikeHighlights(c.title) ? 2 : 0) + (c.official ? 1 : 0);
    return clips.sort((a, b) => score(b) - score(a));
  }

  function decodeHtml(s) {
    const el = document.createElement("textarea");
    el.innerHTML = s;
    return el.value;
  }

  // ---- Dailymotion (no key needed) ----
  async function fromDailymotion(m) {
    const after = Math.floor(m.date.getTime() / 1000);
    const before = Math.floor((m.date.getTime() + SEARCH_WINDOW_DAYS * DAY) / 1000);
    const q = encodeURIComponent(`${m.home.name} ${m.away.name}`);
    const fields = "id,title,duration,allow_embed,owner.screenname,thumbnail_360_url";
    const url = `https://api.dailymotion.com/videos?search=${q}&fields=${fields}&created_after=${after}&created_before=${before}&limit=15`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.list || [])
      .filter(v => v.allow_embed && v.duration > 60 && mentionsGame(v.title, m) && looksLikeHighlights(v.title))
      .map(v => ({
        type: "dailymotion",
        id: v.id,
        title: v.title,
        source: v["owner.screenname"] || "Dailymotion",
        official: /bein/i.test(v["owner.screenname"] || ""),
        thumbnail: v.thumbnail_360_url,
        seconds: v.duration,
        url: `https://www.dailymotion.com/video/${v.id}`,
      }));
  }

  // ---- YouTube (needs YOUTUBE_API_KEY) ----
  // Each search uses 100 of the 10,000 free daily units, so results are saved in the
  // browser and only searched when someone actually opens a game.
  async function fromYouTube(m) {
    if (!YOUTUBE_API_KEY) return [];
    const cacheKey = `yt:${m.id}`;
    const cached = storage.get(cacheKey, null);
    if (cached) return cached;

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      maxResults: "15",
      q: `${m.home.fullName || m.home.name} vs ${m.away.fullName || m.away.name} highlights`,
      publishedAfter: m.date.toISOString(),
      publishedBefore: new Date(m.date.getTime() + SEARCH_WINDOW_DAYS * DAY).toISOString(),
      key: YOUTUBE_API_KEY,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const reason = err.error?.errors?.[0]?.reason || "";
      throw new Error(reason === "quotaExceeded"
        ? "Today's free YouTube searches are used up. They reset at midnight Pacific time."
        : `YouTube search failed (${err.error?.message || res.status}). Check the API key in js/config.js.`);
    }
    const data = await res.json();
    const clips = (data.items || [])
      .map(item => ({
        type: "youtube",
        id: item.id.videoId,
        title: decodeHtml(item.snippet.title),
        source: OFFICIAL_YOUTUBE_CHANNELS[item.snippet.channelId] || decodeHtml(item.snippet.channelTitle),
        official: item.snippet.channelId in OFFICIAL_YOUTUBE_CHANNELS,
        thumbnail: item.snippet.thumbnails?.medium?.url,
        seconds: 0,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }))
      .filter(c => mentionsGame(c.title, m))
      // Keep official channels, plus anything else that is clearly a highlights video.
      .filter(c => c.official || looksLikeHighlights(c.title))
      .slice(0, 6);

    // Only remember non-empty results, so a game can be searched again once highlights are up.
    if (clips.length) storage.set(cacheKey, clips);
    return clips;
  }

  // Quick check run for every game in the list: ESPN + Dailymotion (both free, no limits).
  async function quickCheck(m) {
    const [espn, dm] = await Promise.all([
      api.getVideos(m.league, m.id).catch(() => []),
      fromDailymotion(m).catch(() => []),
    ]);
    return rank([...espn, ...dm]);
  }

  // Full search when a game is opened: adds YouTube results (if a key is set).
  async function fullSearch(m, quick) {
    const yt = await fromYouTube(m);
    const seen = new Set();
    return rank([...yt, ...quick]).filter(c => !seen.has(c.type + c.id + c.src) && seen.add(c.type + c.id + c.src));
  }

  function hasHighlights(clips) {
    return clips.some(c => looksLikeHighlights(c.title));
  }

  // A YouTube search page for the game, used when nothing can be played on the site.
  function youtubeSearchUrl(m) {
    const q = `${m.home.fullName || m.home.name} vs ${m.away.fullName || m.away.name} highlights ${m.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  }

  return { quickCheck, fullSearch, hasHighlights, looksLikeHighlights, youtubeSearchUrl };
})();
