#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const login = process.env.PROFILE_LOGIN ?? "achref-soua";
const avatarPath = resolve(repoRoot, "assets/avatar.svg");
const outputPath = resolve(repoRoot, "assets/profile-card.svg");

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error("Set GITHUB_TOKEN/GH_TOKEN or authenticate with `gh auth login`.");
  }
}

async function graphql(query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${getToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

function extractAvatarPng() {
  const avatar = readFileSync(avatarPath, "utf8");
  const match = avatar.match(/data:image\/png;base64,([^"]+)/);
  if (!match) {
    throw new Error(`Could not find embedded PNG data in ${avatarPath}`);
  }
  return match[1];
}

function format(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function renderStats(stats) {
  const statCards = [
    ["CONTRIB", format(stats.contributions)],
    ["COMMITS", format(stats.commits)],
    ["PRS", format(stats.pullRequests)],
    ["REPOS", format(stats.repositories)],
    ["ISSUES", format(stats.issues)],
    ["REVIEWS", format(stats.reviews)],
    ["STARS", format(stats.stars)],
    ["FORKS", format(stats.forks)],
  ];

  return statCards
    .map((stat, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 514 + col * 104;
      const y = 78 + row * 54;
      return `<g>
    <rect x="${x}" y="${y}" width="90" height="42" rx="7" fill="#07111f" stroke="#1e3a5f" />
    <text x="${x + 45}" y="${y + 15}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="9" fill="#64748b">${stat[0]}</text>
    <text x="${x + 45}" y="${y + 33}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="17" font-weight="800" fill="#d1fae5">${stat[1]}</text>
  </g>`;
    })
    .join("\n  ");
}

function renderActivityBars(days) {
  const counts = days.slice(-30).map((day) => day.contributionCount);
  const max = Math.max(...counts, 1);

  return counts
    .map((value, index) => {
      const x = 44 + index * 29;
      const height = Math.max(2, Math.round((value / max) * 36));
      const y = 324 - height;
      const fill =
        value === 0 ? "#1f2937" : value > max * 0.72 ? "#38bdf8" : value > max * 0.38 ? "#22c55e" : "#164e63";
      return `<rect x="${x}" y="${y}" width="13" height="${height}" rx="2" fill="${fill}" />`;
    })
    .join("\n  ");
}

function renderMatrix() {
  const blocks = [];
  for (let col = 0; col < 16; col += 1) {
    for (let row = 0; row < 8; row += 1) {
      const x = 734 + col * 13;
      const y = 54 + row * 13;
      const active = (col * 7 + row * 5) % 4 === 0;
      const opacity = active ? 0.58 : 0.16;
      const fill = active ? "#22c55e" : "#38bdf8";
      blocks.push(`<rect x="${x}" y="${y}" width="5" height="5" rx="1" fill="${fill}" opacity="${opacity}" />`);
    }
  }
  return blocks.join("\n  ");
}

function renderGridDots() {
  const dots = [];
  for (let x = 32; x <= 928; x += 24) {
    for (let y = 56; y <= 336; y += 24) {
      if ((x + y) % 72 === 0) {
        dots.push(`<rect x="${x}" y="${y}" width="2" height="2" fill="#334155" opacity="0.45" />`);
      }
    }
  }
  return dots.join("\n  ");
}

function renderProjects() {
  const projects = [
    ["quiver", "vector database", "rust · ann"],
    ["galley", "latex studio", "tauri · svelte"],
    ["pulse", "clinical ai demo", "fastapi · rag"],
    ["helio", "growth platform", "temporal · ai"],
  ];

  return projects
    .map((project, index) => {
      const x = 40 + index * 224;
      return `<g>
    <rect x="${x}" y="188" width="196" height="70" rx="8" fill="#07111f" stroke="#1e293b" />
    <text x="${x + 16}" y="211" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13" fill="#22c55e">$ cd ${project[0]}</text>
    <text x="${x + 16}" y="232" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" fill="#cbd5e1">${project[1]}</text>
    <text x="${x + 16}" y="248" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" fill="#38bdf8">${project[2]}</text>
  </g>`;
    })
    .join("\n  ");
}

function renderSvg({ avatarPng, activityDays, stats }) {
  const scanLines = Array.from(
    { length: 11 },
    (_, index) => `<line x1="20" y1="${62 + index * 24}" x2="940" y2="${62 + index * 24}" stroke="#0f172a" stroke-opacity="0.55" />`,
  ).join("\n  ");

  return `<svg width="960" height="360" viewBox="0 0 960 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="avatarClip"><circle cx="92" cy="104" r="48" /></clipPath>
    <filter id="terminalGlow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#020617" flood-opacity="0.38" /></filter>
    <linearGradient id="terminalBg" x1="0" y1="0" x2="960" y2="360"><stop stop-color="#020617" /><stop offset="1" stop-color="#06131f" /></linearGradient>
  </defs>
  <rect x="8" y="8" width="944" height="344" rx="18" fill="url(#terminalBg)" stroke="#1e3a5f" filter="url(#terminalGlow)" />
  <rect x="8" y="8" width="944" height="36" rx="18" fill="#07111f" />
  <rect x="8" y="26" width="944" height="18" fill="#07111f" />
  <circle cx="30" cy="26" r="5" fill="#ef4444" opacity="0.9" />
  <circle cx="48" cy="26" r="5" fill="#f59e0b" opacity="0.9" />
  <circle cx="66" cy="26" r="5" fill="#22c55e" opacity="0.9" />
  <text x="92" y="30" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="#94a3b8">achref@github:~/portfolio</text>
  <text x="838" y="30" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" fill="#38bdf8">DATA · TERMINAL</text>
  ${scanLines}
  ${renderGridDots()}
  ${renderMatrix()}

  <circle cx="92" cy="104" r="56" fill="#020617" stroke="#38bdf8" stroke-width="2" />
  <circle cx="92" cy="104" r="52" fill="#0f172a" stroke="#22c55e" stroke-width="2" opacity="0.85" />
  <image href="data:image/png;base64,${avatarPng}" x="36" y="40" width="112" height="112" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)" />

  <text x="174" y="84" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="15" fill="#22c55e">$ whoami</text>
  <text x="174" y="116" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" fill="#e5e7eb">Achref Soua</text>
  <text x="176" y="143" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="15" fill="#38bdf8">role: data science</text>
  <text x="176" y="164" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="#64748b">status: building</text>

  ${renderStats(stats)}
  ${renderProjects()}

  <text x="40" y="290" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" fill="#22c55e">$ git activity --last-30-days</text>
  <line x1="40" y1="330" x2="918" y2="330" stroke="#1e293b" />
  ${renderActivityBars(activityDays)}
  <text x="918" y="290" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" fill="#64748b">▦ ▧ ▦ ▧ ▦ ▧ ▦</text>
</svg>
`;
}

async function main() {
  const now = new Date();
  const userQuery = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){
      createdAt
      repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
        totalCount
        nodes{
          stargazerCount
          forkCount
          issues{ totalCount }
          pullRequests{ totalCount }
        }
      }
      contributionsCollection(from:$from,to:$to){
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoryContributions
        restrictedContributionsCount
        contributionCalendar{
          totalContributions
          weeks{ contributionDays{ date contributionCount } }
        }
      }
    }
  }`;

  const seed = await graphql(`query($login:String!){ user(login:$login){ createdAt } }`, { login });
  const from = seed.user.createdAt;
  const to = now.toISOString();
  const data = await graphql(userQuery, { login, from, to });
  const user = data.user;
  const repositories = user.repositories.nodes;
  const contributions = user.contributionsCollection;

  const stats = {
    contributions: contributions.contributionCalendar.totalContributions,
    commits: contributions.totalCommitContributions,
    pullRequests: contributions.totalPullRequestContributions,
    repositories: user.repositories.totalCount,
    issues: contributions.totalIssueContributions,
    reviews: contributions.totalPullRequestReviewContributions,
    stars: repositories.reduce((total, repository) => total + repository.stargazerCount, 0),
    forks: repositories.reduce((total, repository) => total + repository.forkCount, 0),
  };

  const activityDays = contributions.contributionCalendar.weeks.flatMap((week) => week.contributionDays).slice(-30);
  const svg = renderSvg({ avatarPng: extractAvatarPng(), activityDays, stats });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, svg);
  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
