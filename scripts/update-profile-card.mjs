#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const commitMessage = process.env.PROFILE_CARD_COMMIT_MESSAGE ?? "docs: refresh profile card";

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  }).trim();
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
}

function hasChanges() {
  try {
    git(["diff", "--quiet", "--", "assets/profile-card.svg"]);
    return false;
  } catch {
    return true;
  }
}

function ensureGitIdentity() {
  let name = "";
  let email = "";

  try {
    name = git(["config", "--get", "user.name"]).trim();
  } catch {
    name = "";
  }

  try {
    email = git(["config", "--get", "user.email"]).trim();
  } catch {
    email = "";
  }

  if (!name) git(["config", "user.name", "Achref Soua"]);
  if (!email) git(["config", "user.email", "achref.soua@outlook.com"]);
}

run("node", ["scripts/generate-profile-card.mjs"]);

if (!hasChanges()) {
  console.log("Profile card is already up to date.");
  process.exit(0);
}

ensureGitIdentity();
git(["add", "assets/profile-card.svg"]);
run("git", ["commit", "-m", commitMessage]);
run("git", ["push"]);
