// Starts the site and switches between tabs.

const VIEWS = {
  fixtures:  { module: fixtures,  title: "This week's matches", sub: "Premier League, Bundesliga, La Liga and MLS, in your local time." },
  standings: { module: standings, title: "League tables",       sub: "Where every club stands this season." },
  nations:   { module: nations,   title: "National teams",      sub: "Upcoming international games and recent results." },
  highlights: { module: highlights, title: "Highlights",         sub: "Catch up on finished games. Watch the video right here, or find it on YouTube." },
};

const loaded = new Set();

function showView(view) {
  if (!VIEWS[view]) view = "fixtures";
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.view === view));
  for (const name of Object.keys(VIEWS)) {
    document.getElementById(`view-${name}`).hidden = name !== view;
  }
  document.getElementById("heroTitle").textContent = VIEWS[view].title;
  document.getElementById("heroSub").textContent = VIEWS[view].sub;
  storage.set("view", view);

  // Only fetch a tab's data the first time it is opened.
  if (!loaded.has(view)) {
    loaded.add(view);
    VIEWS[view].module.load();
  }
}

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => showView(tab.dataset.view)));

for (const v of Object.values(VIEWS)) v.module.init();
showView(storage.get("view", "fixtures"));
