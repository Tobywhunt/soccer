# Matchday

A website for following the Premier League, Bundesliga, La Liga, MLS and national teams:
fixtures, league tables, international games and match highlights.

Open `index.html` in a browser to use it. There's nothing to install.

## Highlights for every league

Without any setup, highlights come from ESPN (great for La Liga) and Dailymotion (great for the
Bundesliga). Other games get a "Search YouTube" link instead.

To watch official highlights for **every** league right on the site, add a free YouTube API key.
This takes about 5 minutes and costs nothing.

### 1. Get a YouTube API key

1. Go to <https://console.cloud.google.com/> and sign in with a Google account.
2. Create a project: click the project picker at the top, then **New Project**. Any name works.
3. Open **APIs & Services → Library**, search for **YouTube Data API v3**, and click **Enable**.
4. Open **APIs & Services → Credentials**, click **Create credentials → API key**, and copy the key.
5. Recommended: click the key, and under **API restrictions** choose **Restrict key → YouTube Data API v3**.
   Once the site is online (step 3 below), you can also add your site's address under
   **Website restrictions**, so nobody else can use your key.

### 2. Put the key in the site

Open `js/config.js` and paste the key between the quotes:

```js
const YOUTUBE_API_KEY = "paste-your-key-here";
```

The free allowance is 100 searches a day. The site only searches when you open a game's
highlights, and it remembers the results, so that's plenty for personal use.

### 3. Open the site from a web address

YouTube videos won't play when the page is opened as a file (by double-clicking `index.html`).
Use one of these instead:

- **GitHub Pages (free, works on your phone too):** push this folder to GitHub, then in the repo go to
  **Settings → Pages**, set **Branch** to `main`, and save. The site will be at
  `https://<your-username>.github.io/<repo-name>/`.
- **On your own computer:** in this folder, run `python -m http.server 8000`, then open
  <http://localhost:8000>.

Note: anyone who views the site's code can see the API key. That's normal for a key used in a web
page, and why the restrictions in step 1.5 are worth setting.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure |
| `css/styles.css` | All the styling |
| `js/config.js` | Leagues, competitions, and the YouTube key |
| `js/utils.js` | Small shared helpers |
| `js/api.js` | Gets fixtures, tables and ESPN videos |
| `js/matches.js` | Draws match cards (shared by several tabs) |
| `js/fixtures.js` | Fixtures tab |
| `js/standings.js` | Standings tab |
| `js/nations.js` | Nations tab |
| `js/videos.js` | Finds highlight videos (ESPN, Dailymotion, YouTube) |
| `js/highlights.js` | Highlights tab and video player |
| `js/main.js` | Starts the site and switches tabs |

Match data comes from ESPN's public feeds.
