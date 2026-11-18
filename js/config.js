// The leagues shown on the site. To add another league, add a line here.
// "id" is ESPN's league code; "logo" is ESPN's league logo.
const LEAGUES = [
  { id: "eng.1", name: "Premier League", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png" },
  { id: "ger.1", name: "Bundesliga",     logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png" },
  { id: "esp.1", name: "La Liga",        logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" },
  { id: "usa.1", name: "MLS",            logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png" },
];

// National-team competitions shown on the "Nations" tab. Competitions with no
// recent or upcoming games are hidden automatically, so it's fine to list
// tournaments that only happen every few years.
const NATIONS = [
  { id: "fifa.friendly",           name: "Friendlies",           logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/53.png" },
  { id: "uefa.nations",            name: "UEFA Nations League",  logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png" },
  { id: "concacaf.nations.league", name: "CONCACAF Nations League", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2406.png" },
  { id: "fifa.world",              name: "World Cup",            logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png" },
  { id: "fifa.worldq.uefa",        name: "WC Qualifying (UEFA)", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/67.png" },
  { id: "fifa.worldq.conmebol",    name: "WC Qualifying (CONMEBOL)", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/65.png" },
  { id: "uefa.euroq",              name: "Euro Qualifying",      logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/56.png" },
  { id: "uefa.euro",               name: "Euros",                logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/74.png" },
  { id: "conmebol.america",        name: "Copa América",         logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/83.png" },
  { id: "concacaf.gold",           name: "Gold Cup",             logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/59.png" },
  { id: "caf.nations",             name: "Africa Cup of Nations", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/76.png" },
];

const NATIONS_UPCOMING_LIMIT = 40; // how many upcoming national-team games to list
const NATIONS_RECENT_DAYS = 21;    // how far back "Recent results" goes

// ---------- Highlights ----------
// Paste a free YouTube API key between the quotes to get official highlights for
// every league (Premier League, Bundesliga, La Liga, MLS and national teams).
// How to get one: see README.md. Without a key the site still works, using ESPN and
// Dailymotion videos where available and a "Search YouTube" link for the rest.
const YOUTUBE_API_KEY = "";

// Official YouTube channels. Their videos are preferred over anything else found.
const OFFICIAL_YOUTUBE_CHANNELS = {
  "UCqZQlzSHbVJrwrn5XvzrzcA": "NBC Sports",       // Premier League (US)
  "UCG5qGWdu8nIRZqJ_GgDwQ-w": "Premier League",
  "UC6UL29enLNe4mqwTfAyeNuw": "Bundesliga",
  "UCTv-XvfzLX3i4IGWAm4sbmA": "LALIGA",
  "UCSZbXT5TLLW_i-5W8FZpFsg": "MLS",
  "UCooTLkxcpnTNx6vfOovfBFA": "FOX Soccer",
};

const DAYS_PER_PAGE = 7;        // how many days the fixtures view shows at once
const LIVE_REFRESH_MS = 60 * 1000; // how often to refresh while games are live
