// Everything that talks to ESPN lives here.
// The rest of the site only sees the simple objects these functions return.

const api = (() => {
  const cache = new Map();

  async function getJSON(url, { force = false } = {}) {
    if (!force && cache.has(url)) return cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    cache.set(url, data);
    return data;
  }

  // ---- Fixtures ----
  // ESPN only accepts one date per request, so callers ask day by day.
  async function getMatches(leagueId, date, opts) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard?dates=${ymd(date)}`;
    const data = await getJSON(url, opts);
    return (data.events || []).map(e => parseMatch(e, leagueId));
  }

  // Every game in a competition for a whole calendar year (used for national teams,
  // where games are spread out over months).
  async function getYear(leagueId, year, opts) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard?dates=${year}&limit=1000`;
    const data = await getJSON(url, opts);
    return (data.events || []).map(e => parseMatch(e, leagueId));
  }

  // "relegation-playoffs" -> "Relegation playoffs". Ignores slugs like "2026-international-friendly".
  function roundName(slug) {
    if (!slug || /^\d/.test(slug) || slug === "regular-season") return "";
    const text = slug.replace(/-/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function parseMatch(e, leagueId) {
    const c = e.competitions?.[0] || {};
    const side = homeAway => {
      const t = (c.competitors || []).find(x => x.homeAway === homeAway) || {};
      return {
        name: t.team?.shortDisplayName || t.team?.displayName || "TBD",
        fullName: t.team?.displayName || t.team?.shortDisplayName || "",
        logo: t.team?.logo,
        score: t.score,
        winner: t.winner,
      };
    };
    return {
      id: e.id,
      league: leagueId,
      date: new Date(e.date),
      home: side("home"),
      away: side("away"),
      state: e.status?.type?.state,          // "pre", "in" or "post"
      detail: e.status?.type?.shortDetail,   // e.g. "FT", "Postponed"
      clock: e.status?.displayClock,         // e.g. "67'"
      venue: c.venue?.fullName,
      tv: (c.broadcasts || []).flatMap(b => b.names || []),
      round: roundName(e.season?.slug),
    };
  }

  // ---- Standings ----
  // Returns a list of groups. Most leagues have one group; MLS has East and West.
  async function getStandings(leagueId) {
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`;
    const data = await getJSON(url);
    const groups = data.children?.length ? data.children : [data];
    return {
      season: groups[0]?.standings?.seasonDisplayName || "",
      groups: groups.map(g => ({
        name: groups.length > 1 ? g.name : "",
        rows: (g.standings?.entries || []).map(parseRow).sort((a, b) => a.rank - b.rank),
      })),
    };
  }

  function parseRow(entry) {
    const stat = name => {
      const s = (entry.stats || []).find(x => x.name === name);
      return s ? (s.displayValue ?? s.value) : "";
    };
    return {
      rank: Number(stat("rank")) || 0,
      team: entry.team?.shortDisplayName || entry.team?.displayName,
      fullName: entry.team?.displayName,
      logo: entry.team?.logos?.[0]?.href,
      played: stat("gamesPlayed"),
      won: stat("wins"),
      drawn: stat("ties"),
      lost: stat("losses"),
      goalsFor: stat("pointsFor"),
      goalsAgainst: stat("pointsAgainst"),
      goalDiff: stat("pointDifferential"),
      points: stat("points"),
      note: entry.note ? { text: entry.note.description, color: entry.note.color } : null,
    };
  }

  // ---- Highlights ----
  // Video clips ESPN has for one game (often none: it depends on ESPN's video rights).
  // Full "Highlights" clips are listed first, then goals and other clips.
  async function getVideos(leagueId, eventId) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/summary?event=${eventId}`;
    const data = await getJSON(url);
    return (data.videos || [])
      .map(v => ({
        type: "mp4",
        source: "ESPN",
        official: true,
        title: v.headline || "Video",
        seconds: v.duration || 0,
        thumbnail: v.thumbnail,
        src: v.links?.source?.HD?.href || v.links?.source?.href,
        url: v.links?.web?.href,
      }))
      .filter(v => v.src)
      .sort((a, b) => /highlight/i.test(b.title) - /highlight/i.test(a.title));
  }

  return { getMatches, getYear, getStandings, getVideos };
})();
