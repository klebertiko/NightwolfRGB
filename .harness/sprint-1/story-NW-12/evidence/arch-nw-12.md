# ARCH Evidence — Story NW-12

**Date:** 2026-09-04
**ARCH:** harness-arch (independent spawn)
**Entry signal:** `Approved for Architecture Review: Story NW-12` (QA, 27/27 pass)
**Scope:** Stage-1 architecture review — pattern compliance, ADR compliance, seam placement, performance, blast radius. Bug-level correctness was QA's gate and is not re-litigated here.
**Exit state:** `ARCH Review Bounce — Story NW-12` (see §Verdict)

**Constraints honoured:** no PR created, no git commit, no production code modified.

---

## Files reviewed

| File | Role in NW-12 |
|---|---|
| `scripts/desktop-shutdown.cjs` | new module — kill semantics + `KILL_TARGETS` |
| `scripts/free-desktop-ports.cjs` | port-cleanup adapter (consumes `KILL_TARGETS`) |
| `scripts/run-desktop-electron.cjs` | new wrapper — wait → Electron → always free ports |
| `electron/main.cjs` | quit wiring (`initiateQuit`, 3 call sites) |
| `package.json` → `desktop` script | pre-flight cleanup + `concurrently -k` |
| `frontend/src/index.css` → `.nw-display` | line-height token 1.1 → 1.3 |
| `frontend/src/components/Titlebar.tsx` | `h-11` + `overflow-visible` |
| `frontend/src/components/BrandMark.tsx` | `overflow-visible` + `shadow-ember` |
| `frontend/tailwind.config.js`, `design.md` | token cross-check |
| `scripts/desktop-shutdown.test.cjs`, `scripts/type-roles.test.cjs` | seam coverage audit |

---

## Verdict

**BOUNCE** — two blocking findings, both in `scripts/free-desktop-ports.cjs`, both routed to **@BE**. They sit twelve lines apart and share one fix pass plus one new test seam, so this is a single round-trip, not two.

The Electron/quit architecture (`desktop-shutdown.cjs` + `initiateQuit` + `run-desktop-electron.cjs`) is **sound** and is not what is bouncing. The defect is concentrated in the one module that was left without a test seam.

| # | Finding | Severity | Route |
|---|---|---|---|
| A1 | Port matcher is prefix-based — `:5173` also matches `:51730`–`:51739`; untested seam | **BLOCKING** | @BE |
| A2 | Kill mechanism duplicated; safe argv version bypassed for shell-interpolated `execSync` | **BLOCKING** | @BE |
| A3 | No timeout/watchdog on the shutdown path | Advisory | @BE |
| A4 | `freePorts` is sync-blocking where the injected contract promises async | Advisory | @BE |
| A5 | Shutdown path is silently Windows-only; no ADR, no `docs/adr/` at all | Advisory | @BE + ADR |
| A6 | NW-12's new invariants (44px, overflow-visible) live only in the test, not `design.md` | Advisory | @TW / @FE |
| A7 | Pre-existing type-role bypasses in `Dashboard.tsx` / wordmark | Observation | @PO (debt story) |
| A8 | QA evidence mis-describes the `desktop` script | Note | @QA |

---

## A1 — BLOCKING · Port matcher is prefix-based; the destructive seam is untested

**Where:** `scripts/free-desktop-ports.cjs:26` (inside `listeningPids`)

```js
const needle = `:${port}`;                                        // ":5173"
// …
if (!local.endsWith(needle) && !local.includes(`${needle}`)) continue;
```

`endsWith(x)` logically implies `includes(x)`, so the conjunction collapses to `!local.includes(needle)`. The `endsWith` guard — the half that encodes the actual intent, *the local address must end at this port* — is dead code. What remains is a substring match.

**Consequence.** `'127.0.0.1:51730'.includes(':5173')` is `true`. Windows' ephemeral port range is 49152–65535, so **51730–51739 are ordinary ephemeral ports**, and any of them held by a LISTENING process is matched as though it owned :5173. The same collapse gives `:3001` → `:30010`–`:30019`.

**Why `KILL_TARGETS` does not save this.** The allowlist filters by *image name*, and the collateral victim is by definition also `node.exe` — the very name on the allowlist. Cursor's extension host, language servers, MCP servers over HTTP, and every other project's dev server on this machine are all `node.exe`. The process is then killed with `taskkill /T /F`: whole tree, force, no grace period, not recoverable.

QA's suite proves `Cursor` is never in the allowlist, and that is true and worth having. But the story's literal safety property ("nunca `Cursor`") is satisfied while its intent — never kill something that isn't ours — is not. `Cursor.exe` survives; the `node` processes Cursor owns do not.

**Blast radius is wider than shutdown.** `package.json` runs this same code **at startup**:

```
"desktop": "node scripts/free-desktop-ports.cjs && npx concurrently -k …"
```

so the over-broad kill fires before Nightwolf owns any port at all — the moment when a foreign match is *most* likely, since nothing of ours is listening yet.

**Why this is an ARCH finding and not a QA miss.** `free-desktop-ports.cjs` exports only `{ freePorts }`. `listeningPids`, `imageName`, and `killPid` are module-private, so there is **no seam to test them at**, and the story's own *Testing seams* section never named one — it stopped at `KILL_TARGETS`. QA tested the data exhaustively and structurally could not reach the logic. The missing seam is the architectural defect; the prefix bug is what the missing seam let through. This is exactly the shape of gap Stage-1 review exists to catch: the most destructive twelve lines in the story are the only twelve with no interface.

**Required fix (@BE):**
1. Anchor the match. Parse the port off the local column and compare numerically, e.g. `const m = local.match(/:(\d+)$/); if (!m || Number(m[1]) !== port) continue;`. Drop the redundant `includes` fallback.
2. Export a pure, injectable seam so the matcher is testable without touching the OS — e.g. `parseListeningPids(netstatOutput, port)` taking the raw text, with `listeningPids` as the thin adapter that supplies it.
3. Add RED→GREEN slices against that seam with fixture `netstat -ano` text, covering at minimum: exact `:5173` match; `:51730` **not** matched; `:30010` **not** matched; IPv6 `[::]:5173` matched; `ESTABLISHED` rows ignored; PID `0` ignored.

---

## A2 — BLOCKING · Kill mechanism duplicated; the safe path is bypassed

**Where:** `scripts/free-desktop-ports.cjs:35` and `:46`, against `scripts/desktop-shutdown.cjs:31`

`desktop-shutdown.cjs` establishes the kill mechanism as an argv array with no shell — safe by construction:

```js
function killTreeArgs(pid) {
    return { cmd: 'taskkill', args: ['/PID', String(pid), '/T', '/F'] };
}
```

`free-desktop-ports.cjs` already imports from that module (`KILL_TARGETS`), so the seam exists and is in use — then re-implements the *identical* command as a shell string:

```js
execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });   // :35
execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });                  // :46
```

`killPid` and `killTreeArgs` are byte-for-byte the same command expressed two ways. This is DRY drift against a single source of truth the story itself declared — `free-desktop-ports.cjs:7` states *"Kill rules live in desktop-shutdown.cjs (KILL_TARGETS) — single source of truth"* — and the duplication sits directly beneath that comment.

**On injection.** Not exploitable today: pids reach these calls only via `listeningPids`, which gates on `/^\d+$/`. But the validation lives in a *different function* from the interpolation, so the safety is conventional, not structural — one future caller of `imageName()` or `killPid()` from any other source reintroduces command injection with no local signal that anything is wrong. Two functions in this file take a `pid` parameter and neither validates it.

Independent of exploitability, `execSync` + template literal + `taskkill` is a shape SEC reads as OWASP A03 at Gate 4. Closing it here costs one edit; closing it at Gate 4 costs a second full bounce through Gate 2.

**Required fix (@BE):** use `execFileSync` with argv arrays, sourcing the kill args from the existing helper.

```js
const { execFileSync } = require('child_process');
const { KILL_TARGETS, killTreeArgs } = require('./desktop-shutdown.cjs');

function imageName(pid) {
    try {
        const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
        const match = out.match(/^"([^"]+)"/);
        return match ? match[1].toLowerCase() : '';
    } catch { return ''; }
}

function killPid(pid) {
    const { cmd, args } = killTreeArgs(pid);
    execFileSync(cmd, args, { stdio: 'ignore' });
}
```

This removes the duplication, removes the shell, and makes `desktop-shutdown.cjs` the single source of truth for *both* the kill rules and the kill mechanism — which is what its module docblock already claims.

---

## A3 — Advisory · No watchdog on the shutdown path

`electron/main.cjs:22–40`. **No double-quit race was found** — this was checked explicitly. `quitting` is set synchronously before the async call, and all three entry points (`BrowserWindow 'close'` :155, `ipcMain 'window:close'` :203, `app 'window-all-closed'` :221) run on the main thread, so the plain boolean is sufficient. Registering a `window-all-closed` listener also correctly suppresses Electron's default auto-quit, so the app stays alive until `quitDesktop` reaches `app.exit(0)`. The guard is right.

The gap is the failure mode on the other side: if `taskkill` emits neither `close` nor `error`, or `execSync('netstat -ano')` blocks, `app.exit(0)` is never reached and Electron lingers with no window and no recovery path — the exact zombie state AC#1 exists to prevent, reached by a different route. Suggest bounding it:

```js
const HARD_EXIT_MS = 5000;
setTimeout(() => app.exit(0), HARD_EXIT_MS).unref();
```

placed in `initiateQuit` alongside the existing `.catch`.

---

## A4 — Advisory · Sync-blocking adapter behind an async-shaped interface

`desktop-shutdown.cjs:44–50` declares `freePorts: () => Promise<void>|void` and `quitDesktop` awaits it. The production adapter returns a `number` and is built on `execSync`: one `netstat -ano`, then one `tasklist` per candidate pid, then one `taskkill` per victim — all blocking the Electron main thread. The module was deliberately designed for injected async I/O; the concrete adapter discards that.

At shutdown the stall is tolerable. At **startup** it is not free: the `desktop` script runs the same blocking sweep before `concurrently` starts. Either move to `execFile` + promises, or accept the sync adapter and correct the JSDoc contract to `() => number | Promise<number>` so the interface stops promising something it does not deliver.

---

## A5 — Advisory · Windows-only shutdown, undeclared

`taskkill`, `netstat -ano`, and `tasklist` are used unguarded, while `electron/main.cjs:133` and `Titlebar.tsx:22` both branch on `darwin` — so the codebase presents as cross-platform while its shutdown path is not. Traced on macOS/Linux: `spawn('taskkill')` → `ENOENT` → swallowed by `child.on('error', resolve)` → `freePorts()` → `execSync('netstat -ano')` throws (`-o` is not a BSD flag) → propagates to `initiateQuit`'s `.catch` → `app.exit(1)`. The app exits, but with a non-zero code and the backend still running: AC#1 silently unmet off-Windows.

Two acceptable resolutions — pick one, don't leave it implicit:
- Guard on `process.platform === 'win32'` with a POSIX branch (`process.kill(-pid, 'SIGTERM')` against a detached process group), or
- Record an ADR: *"Nightwolf RGB desktop targets Windows only"* — justified by the OpenRGB SDK dependency.

**There is no `docs/adr/` directory in this repo.** No existing ADR was violated by NW-12 because none exist. This platform decision is a good first one; `design.md` currently carries the only written architectural contract in the project, and it covers design tokens only.

---

## A6 — Advisory · New invariants documented only in the test

**Token check passed — no drift introduced by NW-12:**

| Token | Code | `design.md` | Verdict |
|---|---|---|---|
| `.nw-display` line-height | `index.css:165` → `1.3` | `design.md:77` → `1.3` | ✅ in sync |
| Display size, titlebar | `Titlebar.tsx:28` → `text-[15px]` | `design.md:77` → "22–28px (titlebar 15px)" | ✅ sanctioned |
| Display size, empty state | `Dashboard.tsx:55` → `text-[22px]` | `design.md:77` → 22–28px | ✅ in range |
| `shadow-ember` | `tailwind.config.js:32` → `0 0 18px …` | named `boxShadow` token | ✅ token, not raw value |
| Ember colour | `var(--live)` via `ember` token | Rule 4 (named tokens only) | ✅ compliant |

The per-instance `text-[Npx]` is not a Rule-3 violation: `index.css:155` and the `design.md` Display row both explicitly delegate size to the instance for roles that span a range.

The gap is the other direction. NW-12 introduced two *new* structural contracts — titlebar `min-height ≥ 44px` (WCAG 2.1 AA touch target) and `overflow-visible` on both the header and the BrandMark wrapper — that are enforced by `type-roles.test.cjs` and recorded **nowhere else**. The test is currently the sole specification. A future `h-9` restyle will be caught, but the person doing it has no document telling them why 44px is load-bearing. Add a line to `design.md` under Typography or a new Titlebar section. Non-blocking.

---

## A7 — Observation · Pre-existing type-role drift (out of NW-12 scope)

Surfaced while reviewing the touched files; **not introduced by this story**, so it is not part of the bounce:

- `Dashboard.tsx:51,56` use raw `text-sm` (14px) for body copy where `design.md:78` locks Body to `.nw-body` at 13px — a role bypass, and `design.md:73` says "Five locked roles. No ad-hoc `text-[Npx]`."
- The wordmark splits across two roles: `nw-display` for "Nightwolf" (`Titlebar.tsx:28`) and `nw-meta` for "RGB" (`:29`), while `design.md:86` Rule 2 reserves mono for machine-readable strings. Defensible as a deliberate brand lockup, but it is undocumented as an exception.

Route to **@PO** as a type-system-cleanup debt story. Bouncing NW-12 for pre-existing drift would be scope creep.

---

## A8 — Note to @QA · Evidence inaccuracy

QA evidence line 53 describes the `desktop` script as `node scripts/run-desktop-electron.cjs`. The actual script is:

```
node scripts/free-desktop-ports.cjs && npx concurrently -k "npm run dev:frontend" "node scripts/run-desktop-electron.cjs"
```

AC#2 is still satisfied — arguably three times over (`quitDesktop`'s own `freePorts`, the wrapper's step 3, and `concurrently -k`). But the unreported half is the **pre-flight** `free-desktop-ports` invocation, which is precisely where finding A1's blast radius is widest. Worth tightening: quote the script verbatim rather than paraphrasing.

---

## Architecture that passed

Recorded so the bounce is not read as a verdict on the whole story:

- **Seam placement in `desktop-shutdown.cjs` is correct.** Injecting `spawn` / `exit` / `freePorts` gives a genuinely deep module — full shutdown behaviour behind a four-key options object, fully testable with no OS contact. This is the right shape and the reason AC#1's tests are meaningful rather than ceremonial.
- **`run-desktop-electron.cjs` replacing shell `&&` is the right call**, and the docblock states the invariant it buys (cleanup runs even on non-zero Electron exit). Minor asymmetry: the `waitForHttp` timeout path at `:53` exits `1` *without* running step 3, so "always" has one exception — `concurrently -k` covers it in practice.
- **`spawnSync(electronPath, ['.'], { shell: false })`** and `spawnSync(process.execPath, [absolute path])` — argv arrays throughout, no shell, path built with `path.join(__dirname, …)`. No injection surface in this file.
- **`require('electron')` returning the binary path** when run under plain `node` is the correct idiom, used correctly.
- **`KILL_TARGETS` as shared data with an explicit deny-by-default allowlist** is the right structure. The flaw is upstream in how ports are matched, not in the allowlist design.
- **Electron hardening intact:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `setWindowOpenHandler` denying in-app navigation, `requestSingleInstanceLock`. Untouched by NW-12 and still correct — flagged for SEC's benefit, not as an ARCH sign-off.
- **`.nw-display` change was made at the token, not the instance** — one CSS edit fixing every Display descender across the app, with the reason in an inline comment and `design.md` already updated. Correct locality.

---

## Re-entry path

Fix A1 + A2 in `scripts/free-desktop-ports.cjs` (one pass), add the `parseListeningPids` seam and its RED→GREEN slices to the ledger, then re-enter at **Gate 2 (QA)**. A3–A5 may ride along in the same pass or be tracked separately at @BE's discretion; A6–A7 do not gate.

**Exit state:** `ARCH Review Bounce — Story NW-12: prefix-matching port kill with no test seam (A1) + duplicated shell-interpolated kill mechanism (A2) in scripts/free-desktop-ports.cjs, @BE`
