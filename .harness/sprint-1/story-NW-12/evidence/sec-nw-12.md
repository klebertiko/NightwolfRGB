# Security Review — Story NW-12

**Date:** 2026-09-04
**SEC:** independent gate (harness-sec subagent, fresh context)
**Entry signal:** `Approved for Architecture Review: Story NW-12` (QA), architecture review complete
**Scope:** shutdown/port-cleanup slice only — `scripts/desktop-shutdown.cjs`, `scripts/free-desktop-ports.cjs`, `scripts/run-desktop-electron.cjs`, `scripts/desktop-shutdown.test.cjs`, `electron/main.cjs`, `electron/preload.cjs`, `package.json` (`desktop` script + new devDeps). AC#3/AC#4 (typography) carry no security surface and were not reviewed.

## Verdict: FAIL ✗ — bounce @BE

One **P2** finding. The story's headline constraint is "must NEVER kill the wrong process," and the port-selection predicate in `free-desktop-ports.cjs:26` selects processes that are **not** on the target ports. `Cursor.exe` itself is safe (the image allowlist holds), but Cursor-spawned `node.exe` helpers are not.

No P0/P1. No secrets. No injection reachable today.

---

## P2 — SEC-1: Substring port match force-kills processes on unrelated ports

**Location:** `scripts/free-desktop-ports.cjs:26` (inside `listeningPids`, lines 17–31)

```js
const needle = `:${port}`;                                            // :26 → ":5173"
// ...
if (!local.endsWith(needle) && !local.includes(`${needle}`)) continue; // line 26
```

**Issue.** `endsWith` implies `includes`, so the disjunction collapses: the `endsWith` guard is dead and the effective test is **substring containment**. Any local address whose port merely *starts with* the target digits is selected.

- `:5173` also matches local ports **51730–51739**
- `:3001` also matches local ports **30010–30019**
- `:6742` is safe only by accident (`67420` > 65535)

51730–51739 sits inside the Windows default ephemeral range (49152–65535) — exactly where Node servers land when they bind with `listen(0)`. Language servers, MCP servers, debug adapters, and test runners all do this.

**Reproduction** (predicate transcribed verbatim from line 26, run against synthetic `netstat -ano` lines):

```
needle=:5173  local=127.0.0.1:5173    pid=34672  -> SELECTED FOR KILL  legit
needle=:5173  local=127.0.0.1:51730   pid=11111  -> SELECTED FOR KILL  *** FALSE MATCH ***
needle=:5173  local=127.0.0.1:51739   pid=22222  -> SELECTED FOR KILL  *** FALSE MATCH ***
needle=:3001  local=0.0.0.0:30015     pid=33333  -> SELECTED FOR KILL  *** FALSE MATCH ***
```

A live `netstat` sweep of this machine found no listener currently inside the false-match ranges, and both real listeners (`node` :5173 pid 34672, `node` :3001 pid 34544) matched exactly. The bug is latent right now, not absent — occupancy of those 20 ports rotates.

**Risk.** A falsely-matched pid whose image is `node.exe` clears the allowlist gate (`free-desktop-ports.cjs:57–62`) and is destroyed with `taskkill /PID <pid> /T /F` (`:46`) — force-kill, whole tree, no graceful shutdown, no confirmation. `freePorts()` runs on **three** paths per desktop session (`desktop` npm script pre-flight, `initiateQuit` at `electron/main.cjs:28–40`, and the post-exit sweep in `run-desktop-electron.cjs:65–68`), so exposure repeats several times per run.

Concretely: closing the Nightwolf window can force-kill an unrelated `node.exe` — a Cursor MCP server, a language server, another project's dev server, or a running migration/test process — with whatever unsaved state it held.

This directly undermines AC#2's stated guarantee. The test `KILL_TARGETS: Cursor is never in the kill allowlist` asserts the allowlist contents but never exercises the predicate that decides **which pids reach** the allowlist, so it gives false assurance on precisely the property it names.

**Fix.** Delete the dead disjunct — the `endsWith` check alone is correct and already handles `0.0.0.0:5173`, `127.0.0.1:5173`, and `[::]:5173`:

```js
if (!local.endsWith(needle)) continue;
```

**Also required — close the test gap.** `scripts/free-desktop-ports.cjs` has **no test file**. `desktop-shutdown.test.cjs` covers only `KILL_TARGETS`, `killTreeArgs`, and `quitDesktop`; the module that actually enumerates and kills by port is untested, which is why this survived the QA gate. Extract the netstat-line parser behind an injectable seam and add a RED test asserting `51730` / `30015` are **not** selected for `:5173` / `:3001`.

**Route:** @BE. Re-enters at Gate 2 (QA), returns to Gate 4.

---

## OWASP Top 10 Scan

| # | Category | Result |
|---|---|---|
| A01 | Broken Access Control | **N/A** — no HTTP endpoints or authz surface added. IPC surface (`preload.cjs:1–10`) exposes only `minimize`/`maximize`/`close`, all parameterless; renderer cannot influence which pid is killed. |
| A02 | Cryptographic Failures | **N/A** — no crypto, no credentials, no data at rest introduced. |
| A03 | **Injection** | **✓ PASS** — see analysis below. |
| A04 | Insecure Design | **✗ see SEC-1** — force-kill by port with an over-permissive match and no dry-run/confirmation. |
| A05 | Security Misconfiguration | **✓ PASS** with P3 notes (SEC-4, SEC-5). `webPreferences` (`electron/main.cjs:135–140`) is correctly hardened: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Single-instance lock present. |
| A06 | Vulnerable Components | **P3** — see SEC-6. |
| A07 | Auth & Identity | **N/A** — no auth flow touched. |
| A08 | Integrity Failures | **✓ PASS** — no deserialization, no unverified remote script, no auto-update path in this diff. |
| A09 | Logging & Monitoring | **✓ PASS** — `free-desktop-ports.cjs:60,63` logs pid + image name only. No secrets or PII. |
| A10 | SSRF | **✓ PASS** — `run-desktop-electron.cjs:23` and `main.cjs:12` read `NIGHTWOLF_DEV_URL` from env (developer-controlled, not attacker-controlled) and default to `http://127.0.0.1:5173`. No user-supplied URL is fetched. |

### A03 — Injection, detailed

**Primary kill path — clean.** `desktop-shutdown.cjs:32` builds `{ cmd: 'taskkill', args: ['/PID', String(pid), '/T', '/F'] }` and `quitDesktop` (`:52–68`) passes it to `spawn` with **no `shell: true`** (`:56–60`), so argv goes to `CreateProcess` unparsed by any shell. The pid source is `backendProcess?.pid` (`electron/main.cjs:32`) — an OS-assigned integer from Node's own `spawn`, never renderer- or user-supplied. Safe on two independent grounds.

**Secondary path — no reachable injection, but a latent sink (P3, SEC-2).** `free-desktop-ports.cjs` interpolates into shell strings:

- `:35` — `` execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`) ``
- `:46` — `` execSync(`taskkill /PID ${pid} /T /F`) ``

`execSync` routes through `cmd.exe`. Injection is **not reachable today**: the only caller is `freePorts`, and every pid is filtered by `/^\d+$/.test(pid)` then coerced with `Number()` at `:28` before reaching either function. Both are module-private and take no external input. This is a hardening item, not a live vulnerability — but it is one refactor away from becoming one. Prefer `execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'])` and `execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'])`, which removes the sink class entirely.

`execSync('netstat -ano')` (`:18`) is a static string — no interpolation.

---

## Secrets Scan

Pattern sweep (`api[_-]?key|secret|password|token|bearer|AKIA|ghp_|sk-|AIza|xox[baprs]-|PRIVATE KEY|credential`, case-insensitive) across `desktop-shutdown.cjs`, `free-desktop-ports.cjs`, `run-desktop-electron.cjs`, `desktop-shutdown.test.cjs`, `electron/main.cjs`, `electron/preload.cjs`:

```
(no matches)
```

- No `.env` tracked in git — `git ls-files` returns only `backend/.env.example`. ✓
- `.gitignore` diff adds `bin/OpenRGB/VERSION.json` and `brand/derived/` — no secret-handling regression. ✓
- No secrets in commit messages — **nothing committed** (all NW-12 files untracked, per HITL instruction). ✓
- `electron/main.cjs:99` passes `{ ...process.env, FORCE_COLOR: '1' }` to the backend child. Standard for a spawned dev server; no new exposure (the child already inherits the same trust domain).

**Result: clean.**

---

## P3 findings — Product Backlog, non-blocking

**SEC-2 — Shell interpolation in `execSync` (`free-desktop-ports.cjs:35,46`).** Latent command-injection sink, currently unreachable. Switch to `execFileSync` with argv arrays. Detail in A03 above.

**SEC-3 — System binaries resolved via `PATH`.** `taskkill` (`desktop-shutdown.cjs:32`), `netstat` (`free-desktop-ports.cjs:18`), and `tasklist` (`:35`) resolve through `PATH` rather than an absolute path. An attacker with write access to any earlier `PATH` directory gains code execution when the app quits. Low severity — that prerequisite already implies broader compromise, and `System32` precedes user paths by default. Harden with `path.join(process.env.SystemRoot, 'System32', 'taskkill.exe')`.

**SEC-4 — `shell.openExternal` with no protocol allowlist (`electron/main.cjs:165`).** *Pre-existing, outside the NW-12 diff.* `setWindowOpenHandler` forwards any renderer-initiated `window.open` URL straight to the OS protocol handler. Renderer hardening (`sandbox`, `contextIsolation`) makes this hard to reach, but an XSS in the dashboard could invoke `file:` or a custom protocol handler. Standard Electron hardening: allowlist `http:`/`https:` before calling `openExternal`.

**SEC-5 — `remote-debugging-port 9229` (`electron/main.cjs:14–16`).** Correctly gated behind `isDev` (`!app.isPackaged`), so it never ships. Informational: while running, any local process — or a web page via DNS-rebinding against CDP — can execute arbitrary JS in the app context. Bind-to-loopback is already the CDP default; no change required for a dev-only switch.

**SEC-6 — Electron 33.2.1 pinned to an EOL major (`package.json:27`).** Electron supports only the latest three majors; 33.x (Nov 2024) no longer receives Chromium security backports. Exposure is bounded here — the renderer loads localhost only, sandboxed, with context isolation — so this is backlog, not a gate block. Plan an upgrade to a supported major before any packaged release.

**SEC-7 — `wait-on ^8.0.1` is now an unused dependency (`package.json:28`).** NW-12 replaced the `npx wait-on` fragment with a native `http.get` poller (`run-desktop-electron.cjs:27–45`); the only remaining reference is a comment at `:6`. Dead dependencies are unnecessary supply-chain surface. Remove it.

---

## Informational — not defects

**Scope of authority on port 3001.** `ensureBackend` (`electron/main.cjs:109–113`) skips `startBackend()` when the port is already open, leaving `backendProcess === null`. `quitDesktop` then skips the `taskkill` tree kill (`desktop-shutdown.cjs:53`) and `freePorts` reclaims 3001 by port instead — so Electron terminates a backend it did not spawn, e.g. one the developer started from a terminal. AC#1 explicitly requires 3001 to be free after close, so this is per-spec. Documented so it is a recorded decision rather than a surprise.

**`taskkill /T` direction.** `/T` kills descendants only, never ancestors. The backend tree kill therefore cannot walk up into a parent shell or into Cursor. Confirmed the backend is spawned with `shell: true` on Windows (`electron/main.cjs:97`), so `backendProcess.pid` is `cmd.exe` and `/T` is required to reach npm → node. Correct as written.

**DoD gap (QA/ARCH concern, not security).** `package.json` has `test:update`, `test:engine`, and `test:type-roles`, but no `test:shutdown` for `scripts/desktop-shutdown.test.cjs`. The DoD calls for the new `node --test scripts/*.test.cjs` suites to be runnable. Flagging for @BE to fold in alongside the SEC-1 fix.

---

## Exit State

**Security Gate Failure — Story NW-12: P2, substring port match in `free-desktop-ports.cjs:26` force-kills `node.exe` processes on ports 51730–51739 / 30010–30019 → @BE**

Re-review budget: 1 of 2 used. On resubmission SEC verifies (a) the predicate change at `:26`, and (b) a RED→GREEN test proving `51730` and `30015` are not selected.
