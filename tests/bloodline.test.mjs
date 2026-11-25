import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeProfile,
  formatCardData,
  formatNumber,
  buildSampleData,
} from "../app.js";

// Fixture JSON shaped like the GitHub REST API — no network in tests.
const fixtureUser = {
  login: "octocat",
  name: "The Octocat",
  bio: "GitHub mascot",
  avatar_url: "https://github.com/octocat.png",
  html_url: "https://github.com/octocat",
  followers: 12000,
  following: 9,
  public_repos: 4,
  created_at: "2020-01-01T00:00:00Z",
};

const fixtureRepos = [
  { name: "alpha", stargazers_count: 100, forks_count: 10, language: "JavaScript", html_url: "https://github.com/octocat/alpha", description: "First" },
  { name: "beta", stargazers_count: 250, forks_count: 20, language: "Python", html_url: "https://github.com/octocat/beta", description: "Second" },
  { name: "gamma", stargazers_count: 50, forks_count: 5, language: "JavaScript", html_url: "https://github.com/octocat/gamma", description: "" },
  { name: "delta", stargazers_count: 0, forks_count: 0, language: null, html_url: "https://github.com/octocat/delta", description: "" },
];

const NOW = new Date("2024-01-01T00:00:00Z");

test("summarizeProfile computes star and fork totals", () => {
  const stats = summarizeProfile(fixtureUser, fixtureRepos, NOW);
  assert.equal(stats.totalStars, 400);
  assert.equal(stats.totalForks, 35);
  assert.equal(stats.repoCount, 4);
});

test("summarizeProfile copies identity fields with fallbacks", () => {
  const stats = summarizeProfile(fixtureUser, fixtureRepos, NOW);
  assert.equal(stats.login, "octocat");
  assert.equal(stats.name, "The Octocat");
  assert.equal(stats.followers, 12000);
  assert.equal(stats.publicRepos, 4);

  const nameless = summarizeProfile({ login: "ghost" }, [], NOW);
  assert.equal(nameless.name, "ghost");
  assert.equal(nameless.bio, "");
});

test("summarizeProfile ranks languages by repo count, ignoring null", () => {
  const stats = summarizeProfile(fixtureUser, fixtureRepos, NOW);
  assert.deepEqual(
    stats.topLanguages.map((entry) => entry.language),
    ["JavaScript", "Python"]
  );
  assert.equal(stats.topLanguages[0].count, 2);
  assert.equal(stats.topLanguages[0].percent, 67);
  assert.equal(stats.topLanguages[1].percent, 33);
});

test("summarizeProfile finds the most-starred repo", () => {
  const stats = summarizeProfile(fixtureUser, fixtureRepos, NOW);
  assert.equal(stats.mostStarredRepo.name, "beta");
  assert.equal(stats.mostStarredRepo.stars, 250);

  const empty = summarizeProfile(fixtureUser, [], NOW);
  assert.equal(empty.mostStarredRepo, null);
  assert.deepEqual(empty.topLanguages, []);
});

test("summarizeProfile computes account age from created_at", () => {
  const stats = summarizeProfile(fixtureUser, fixtureRepos, NOW);
  assert.equal(stats.accountAgeDays, 1461);
  assert.equal(stats.accountAgeYears, 4);

  const noDate = summarizeProfile({ login: "x" }, [], NOW);
  assert.equal(noDate.accountAgeDays, null);
});

test("summarizeProfile tolerates malformed input", () => {
  const stats = summarizeProfile(null, null, NOW);
  assert.equal(stats.totalStars, 0);
  assert.equal(stats.login, "");
  assert.deepEqual(stats.topLanguages, []);
});

test("formatNumber compacts large numbers", () => {
  assert.equal(formatNumber(999), "999");
  assert.equal(formatNumber(1200), "1.2k");
  assert.equal(formatNumber(12000), "12k");
  assert.equal(formatNumber(3400000), "3.4M");
  assert.equal(formatNumber(undefined), "0");
});

test("formatCardData produces display-ready strings", () => {
  const card = formatCardData(summarizeProfile(fixtureUser, fixtureRepos, NOW));
  assert.equal(card.title, "The Octocat");
  assert.equal(card.handle, "@octocat");
  assert.equal(card.accountAge, "4 yr");
  assert.deepEqual(
    card.stats.map((stat) => stat.label),
    ["Followers", "Following", "Public repos", "Total stars"]
  );
  assert.equal(card.stats[0].value, "12k");
  assert.equal(card.mostStarred.label, "beta ★ 250");
  assert.match(card.shareText, /@octocat/);
  assert.match(card.shareText, /400 stars/);
});

test("buildSampleData returns a MrVempiree sample that summarizes cleanly", () => {
  const { user, repos } = buildSampleData();
  assert.equal(user.login, "MrVempiree");
  assert.equal(user.name, "Lavish Gangwar");
  assert.ok(Array.isArray(repos) && repos.length >= 3);
  for (const repo of repos) {
    assert.equal(typeof repo.name, "string");
    assert.equal(typeof repo.stargazers_count, "number");
  }

  const stats = summarizeProfile(user, repos, NOW);
  assert.equal(stats.totalStars, 113);
  assert.equal(stats.mostStarredRepo.name, "bloodline");
  assert.equal(stats.topLanguages[0].language, "JavaScript");

  const card = formatCardData(stats);
  assert.equal(card.handle, "@MrVempiree");
  assert.ok(card.languages.length > 0);
});
