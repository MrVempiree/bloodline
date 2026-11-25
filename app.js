// bloodline — GitHub profile card generator
// Pure functions are exported for tests; UI wiring only runs in a browser.

const API_BASE = "https://api.github.com/users";

/**
 * Build a stats object from GitHub REST API payloads.
 * @param {object} userJson - GET /users/<name> response
 * @param {Array} reposJson - GET /users/<name>/repos response
 * @param {Date} [now] - injectable clock for deterministic tests
 */
export function summarizeProfile(userJson, reposJson, now = new Date()) {
  const user = userJson && typeof userJson === "object" ? userJson : {};
  const repos = Array.isArray(reposJson) ? reposJson : [];

  const totalStars = repos.reduce(
    (sum, repo) => sum + (Number(repo?.stargazers_count) || 0),
    0
  );
  const totalForks = repos.reduce(
    (sum, repo) => sum + (Number(repo?.forks_count) || 0),
    0
  );

  // Language ranking: count repos per language, ignore null/empty.
  const languageCounts = new Map();
  for (const repo of repos) {
    const language = repo?.language;
    if (typeof language === "string" && language.trim() !== "") {
      languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
    }
  }
  const languageTotal = [...languageCounts.values()].reduce((a, b) => a + b, 0);
  const topLanguages = [...languageCounts.entries()]
    .map(([language, count]) => ({
      language,
      count,
      percent: languageTotal > 0 ? Math.round((count / languageTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language))
    .slice(0, 5);

  let mostStarredRepo = null;
  for (const repo of repos) {
    const stars = Number(repo?.stargazers_count) || 0;
    if (!mostStarredRepo || stars > mostStarredRepo.stars) {
      mostStarredRepo = {
        name: repo?.name ?? "",
        stars,
        url: repo?.html_url ?? "",
        description: repo?.description ?? "",
      };
    }
  }
  if (mostStarredRepo && mostStarredRepo.stars === 0 && repos.length === 0) {
    mostStarredRepo = null;
  }

  const createdAt = user.created_at ? new Date(user.created_at) : null;
  let accountAgeDays = null;
  let accountAgeYears = null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    accountAgeDays = Math.max(
      0,
      Math.floor((now.getTime() - createdAt.getTime()) / 86400000)
    );
    accountAgeYears = Math.round((accountAgeDays / 365.25) * 10) / 10;
  }

  return {
    login: user.login ?? "",
    name: user.name || user.login || "",
    bio: user.bio ?? "",
    avatarUrl: user.avatar_url ?? "",
    profileUrl: user.html_url ?? "",
    followers: Number(user.followers) || 0,
    following: Number(user.following) || 0,
    publicRepos:
      typeof user.public_repos === "number" ? user.public_repos : repos.length,
    repoCount: repos.length,
    totalStars,
    totalForks,
    topLanguages,
    mostStarredRepo,
    createdAt: user.created_at ?? null,
    accountAgeDays,
    accountAgeYears,
  };
}

/** Compact number formatting: 999 -> "999", 1200 -> "1.2k", 3400000 -> "3.4M". */
export function formatNumber(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/**
 * Turn a stats object into display-ready card data (strings only, no DOM).
 */
export function formatCardData(stats) {
  const s = stats && typeof stats === "object" ? stats : {};
  const years = s.accountAgeYears;
  let accountAge = "Unknown";
  if (typeof years === "number") {
    if (years < 1) {
      const months = Math.max(1, Math.round((s.accountAgeDays ?? 0) / 30.44));
      accountAge = `${months} mo`;
    } else {
      accountAge = `${years} yr`;
    }
  }

  const joined = s.createdAt
    ? new Date(s.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : "";

  return {
    title: s.name || s.login || "Unknown",
    handle: s.login ? `@${s.login}` : "",
    bio: s.bio || "No bio on GitHub.",
    avatarUrl: s.avatarUrl || "",
    profileUrl: s.profileUrl || "",
    accountAge,
    joined,
    stats: [
      { label: "Followers", value: formatNumber(s.followers) },
      { label: "Following", value: formatNumber(s.following) },
      { label: "Public repos", value: formatNumber(s.publicRepos) },
      { label: "Total stars", value: formatNumber(s.totalStars) },
    ],
    languages: (s.topLanguages || []).map((entry) => ({
      language: entry.language,
      count: entry.count,
      percent: entry.percent,
      label: `${entry.language} · ${entry.percent}%`,
    })),
    mostStarred: s.mostStarredRepo
      ? {
          name: s.mostStarredRepo.name,
          stars: formatNumber(s.mostStarredRepo.stars),
          url: s.mostStarredRepo.url,
          description: s.mostStarredRepo.description || "",
          label: `${s.mostStarredRepo.name} ★ ${formatNumber(s.mostStarredRepo.stars)}`,
        }
      : null,
    shareText: `${s.name || s.login} (@${s.login}) — ${formatNumber(s.followers)} followers · ${formatNumber(s.publicRepos)} repos · ${formatNumber(s.totalStars)} stars on GitHub`,
  };
}

/**
 * Built-in sample payload (MrVempiree) for offline / rate-limit mode.
 * Returns raw { user, repos } so it flows through the same pipeline.
 */
export function buildSampleData() {
  return {
    user: {
      login: "MrVempiree",
      name: "Lavish Gangwar",
      bio: "Vempire — building open-source tools in the dark.",
      avatar_url: "https://github.com/MrVempiree.png",
      html_url: "https://github.com/MrVempiree",
      followers: 128,
      following: 64,
      public_repos: 6,
      created_at: "2022-03-15T00:00:00Z",
    },
    repos: [
      {
        name: "bloodline",
        stargazers_count: 42,
        forks_count: 5,
        language: "JavaScript",
        html_url: "https://github.com/MrVempiree/bloodline",
        description: "GitHub profile card generator",
      },
      {
        name: "vclipper",
        stargazers_count: 31,
        forks_count: 3,
        language: "JavaScript",
        html_url: "https://github.com/MrVempiree/vclipper",
        description: "Highlight clip finder",
      },
      {
        name: "night-owl",
        stargazers_count: 18,
        forks_count: 2,
        language: "Python",
        html_url: "https://github.com/MrVempiree/night-owl",
        description: "Late-night focus timer",
      },
      {
        name: "crimson-ui",
        stargazers_count: 12,
        forks_count: 1,
        language: "CSS",
        html_url: "https://github.com/MrVempiree/crimson-ui",
        description: "Dark crimson glass components",
      },
      {
        name: "bat-signal",
        stargazers_count: 7,
        forks_count: 0,
        language: "Python",
        html_url: "https://github.com/MrVempiree/bat-signal",
        description: "Tiny notification helper",
      },
      {
        name: "crypt-notes",
        stargazers_count: 3,
        forks_count: 0,
        language: "HTML",
        html_url: "https://github.com/MrVempiree/crypt-notes",
        description: "Markdown notes viewer",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Browser UI (guarded — importing this module in Node has no side effects)
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchProfile(username) {
  const encoded = encodeURIComponent(username);
  const userResponse = await fetch(`${API_BASE}/${encoded}`);
  if (userResponse.status === 404) {
    throw new Error(`GitHub user "${username}" was not found.`);
  }
  if (userResponse.status === 403 || userResponse.status === 429) {
    throw new Error("GitHub API rate limit reached. Try the sample card, or retry in a few minutes.");
  }
  if (!userResponse.ok) {
    throw new Error(`GitHub API error (HTTP ${userResponse.status}).`);
  }
  const user = await userResponse.json();
  const reposResponse = await fetch(`${API_BASE}/${encoded}/repos?per_page=100`);
  const repos = reposResponse.ok ? await reposResponse.json() : [];
  return { user, repos: Array.isArray(repos) ? repos : [] };
}

function renderCard(card) {
  const statsHtml = card.stats
    .map(
      (stat) => `
        <div class="stat">
          <span class="stat-value">${escapeHtml(stat.value)}</span>
          <span class="stat-label">${escapeHtml(stat.label)}</span>
        </div>`
    )
    .join("");

  const languagesHtml =
    card.languages.length > 0
      ? card.languages
          .map(
            (entry) => `
              <li>
                <span>${escapeHtml(entry.language)}</span>
                <span class="lang-bar"><span style="width:${entry.percent}%"></span></span>
                <span>${entry.percent}%</span>
              </li>`
          )
          .join("")
      : `<li class="muted">No language data yet.</li>`;

  const starredHtml = card.mostStarred
    ? `<p class="starred">Most-starred: <a href="${escapeHtml(card.mostStarred.url)}" target="_blank" rel="noreferrer">${escapeHtml(card.mostStarred.name)}</a> ★ ${escapeHtml(card.mostStarred.stars)}</p>`
    : "";

  return `
    <div class="card-head">
      <img class="avatar" src="${escapeHtml(card.avatarUrl)}" alt="Avatar of ${escapeHtml(card.title)}" width="88" height="88" />
      <div>
        <h2>${escapeHtml(card.title)}</h2>
        <p class="handle">${escapeHtml(card.handle)}</p>
        <p class="joined">On GitHub for ${escapeHtml(card.accountAge)}${card.joined ? ` · since ${escapeHtml(card.joined)}` : ""}</p>
      </div>
    </div>
    <p class="bio">${escapeHtml(card.bio)}</p>
    <div class="stats">${statsHtml}</div>
    <h3>Top languages</h3>
    <ul class="languages">${languagesHtml}</ul>
    ${starredHtml}
    <div class="card-actions">
      <a class="btn btn-ghost" href="${escapeHtml(card.profileUrl)}" target="_blank" rel="noreferrer">View on GitHub</a>
      <button class="btn btn-ghost" type="button" id="copy-share">Copy share text</button>
    </div>`;
}

if (typeof document !== "undefined") {
  const form = document.querySelector("#lookup-form");
  const input = document.querySelector("#username");
  const status = document.querySelector("#status");
  const cardEl = document.querySelector("#card");
  const sampleBtn = document.querySelector("#sample-btn");

  const showCard = (user, repos, note) => {
    const card = formatCardData(summarizeProfile(user, repos));
    cardEl.innerHTML = renderCard(card);
    cardEl.hidden = false;
    status.textContent = note || "";
    const copyBtn = cardEl.querySelector("#copy-share");
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(card.shareText);
        status.textContent = "Share text copied to clipboard.";
      } catch {
        status.textContent = card.shareText;
      }
    });
  };

  const showSample = () => {
    const { user, repos } = buildSampleData();
    showCard(user, repos, "Showing the built-in sample card (MrVempiree).");
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = input.value.trim().replace(/^@/, "");
    if (!username) {
      status.textContent = "Enter a GitHub username first.";
      return;
    }
    status.textContent = `Fetching @${username} from GitHub…`;
    cardEl.hidden = true;
    try {
      const { user, repos } = await fetchProfile(username);
      showCard(user, repos, "");
    } catch (error) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      status.textContent = `${offline ? "You appear to be offline. " : ""}${error.message} You can view the built-in sample card instead.`;
      cardEl.hidden = true;
    }
  });

  sampleBtn?.addEventListener("click", showSample);
}
