// Small helper functions used across the site.

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Date -> "20261121", the format ESPN expects.
function ymd(d) {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

function sameDay(a, b) {
  return ymd(a) === ymd(b);
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Makes text safe to put inside HTML.
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Finds a club league or national-team competition by its ESPN code.
function leagueById(id) {
  return LEAGUES.find(l => l.id === id) || NATIONS.find(l => l.id === id);
}

// Remembers small settings (like which leagues are selected) between visits.
const storage = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
