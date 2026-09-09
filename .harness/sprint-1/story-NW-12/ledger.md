# Ledger — Story NW-12

## Entries

- 2026-09-04 — PO/SM — Sprint 1 Goal confirmado pelo pedido de implementação. Story NW-12 In Progress. FE owns AC#3–4. BE owns AC#1–2. Não commitar.

## Seams

| AC | Seam | Test file |
|---|---|---|
| AC#1 | `scripts/desktop-shutdown.cjs` via `electron/main.cjs` `window:close` | `scripts/desktop-shutdown.test.cjs` |
| AC#2 | shutdown + `package.json` `desktop` cleanup / `free-desktop-ports.cjs` | `scripts/desktop-shutdown.test.cjs` |
| AC#3 | `.nw-display` + empty state `Dashboard.tsx` | `scripts/type-roles.test.cjs` |
| AC#4 | `Titlebar.tsx` + `BrandMark.tsx` + `.nw-display` | `scripts/type-roles.test.cjs` |

## TDD slices

_(implementers append RED/GREEN here)_

---

**TDD slice — AC#1 (BE) · killTreeArgs + KILL_TARGETS + quitDesktop unit tests**
- Seams: `scripts/desktop-shutdown.cjs` via `scripts/desktop-shutdown.test.cjs`
- RED: `node --test scripts/desktop-shutdown.test.cjs` — `Error: Cannot find module './desktop-shutdown.cjs'` (module did not exist yet)
- GREEN: same 11 tests PASS (`node --test scripts/desktop-shutdown.test.cjs` — 11/11 pass, 87 ms)
  - `killTreeArgs` returns `taskkill` with `/PID`, `/T`, `/F`
  - `KILL_TARGETS` covers exactly ports 5173/3001/6742 with correct name sets; Cursor absent
  - `quitDesktop` with backendPid 9999: spawns `taskkill /PID 9999 /T /F`, calls freePorts, calls exit(0)
  - `quitDesktop` with null backendPid: skips spawn, calls freePorts, calls exit(0)

**TDD slice — AC#2 (BE) · electron/main.cjs wiring + package.json desktop script**
- Seams: `electron/main.cjs` (IPC + BrowserWindow close → `initiateQuit`), `package.json` desktop script → `run-desktop-electron.cjs`
- Changes (integration wiring — no additional unit tests; covered by AC#1 tests above):
  - `electron/main.cjs`: imports `quitDesktop`/`freePorts`; `quitting` flag; `initiateQuit()`; IPC `window:close` → `initiateQuit()`; BrowserWindow `close` event → `initiateQuit()`; `window-all-closed` → `initiateQuit()`; removed old `before-quit` handler
  - `scripts/run-desktop-electron.cjs` (new): waits Vite → spawns Electron → unconditionally runs `free-desktop-ports.cjs` → exits with Electron code
  - `scripts/free-desktop-ports.cjs`: refactored to import `KILL_TARGETS` from `desktop-shutdown.cjs`; exports `freePorts()`; retains standalone `require.main` execution
  - `package.json` desktop: changed inner Electron command from `npx wait-on … && npx electron .` to `node scripts/run-desktop-electron.cjs`
- GREEN: `node --test scripts/desktop-shutdown.test.cjs` — 11/11 pass (no regression)

---

**TDD slice — AC#3 (FE) · .nw-display line-height**
- Seams: `frontend/src/index.css` via `scripts/type-roles.test.cjs`
- RED: `AC#3 · .nw-display line-height >= 1.25` — `line-height: 1.1 — need >= 1.25 so the Syne 700 descender at 22 px (~4.6 px below baseline) stays inside the line box`
- GREEN: same test PASS (`node --test scripts/type-roles.test.cjs` — 6/6 pass)

**TDD slice — AC#3 (FE) · empty-state title .nw-display class**
- Seams: `frontend/src/components/Dashboard.tsx` via `scripts/type-roles.test.cjs`
- RED: already green at baseline (title carried `.nw-display`; no change needed)
- GREEN: `AC#3 · empty-state title "Nada ligado ainda" carries .nw-display` PASS

**TDD slice — AC#3 (FE) · empty-state subtitle gap**
- Seams: `frontend/src/components/Dashboard.tsx` via `scripts/type-roles.test.cjs`
- RED: already green at baseline (`mt-2` = 8 px satisfies the gap; no change needed)
- GREEN: `AC#3 · empty-state subtitle has mt >= 8 px` PASS

**TDD slice — AC#4 (FE) · Titlebar header overflow-visible**
- Seams: `frontend/src/components/Titlebar.tsx` via `scripts/type-roles.test.cjs`
- RED: already green at baseline (`overflow-visible` already present; no change needed)
- GREEN: `AC#4 · Titlebar <header> has overflow-visible` PASS

**TDD slice — AC#4 (FE) · Titlebar header min-height >= 44px**
- Seams: `frontend/src/components/Titlebar.tsx` via `scripts/type-roles.test.cjs`
- RED: `AC#4 · Titlebar <header> min-height >= 44 px` — `h-9 (36px) does not satisfy >= 44px WCAG AA`
- Fix: changed `h-9` → `h-11` (44px) in Titlebar.tsx
- GREEN: same test PASS (`node --test scripts/type-roles.test.cjs` — 6/6 pass)

**TDD slice — AC#4 (FE) · BrandMark wrapper overflow-visible**
- Seams: `frontend/src/components/BrandMark.tsx` via `scripts/type-roles.test.cjs`
- RED: `AC#4 · BrandMark wrapper span has overflow-visible` — `wrapper span missing overflow-visible; ember glow clipped`
- Fix: added `overflow-visible` to the wrapper `<span>` in BrandMark.tsx
- GREEN: same test PASS (`node --test scripts/type-roles.test.cjs` — 6/6 pass)

---

**TDD slice — BOUNCE fix · parseListeningPids exact-port matching**
- Bounce root: `listeningPids` in `free-desktop-ports.cjs` used substring match —
  `:5173` matched `:51730`–`:51739` and `:15173`; `:3001` matched `:30010`–`:30019`.
  Collateral node.exe PIDs (Cursor language servers, MCP) were being killed.
- Seams: `scripts/desktop-shutdown.cjs` (new export `parseListeningPids`) via `scripts/desktop-shutdown.test.cjs`
- RED: 12 new tests fail — `TypeError: parseListeningPids is not a function`
  (`node --test scripts/desktop-shutdown.test.cjs` — 11 pass, 12 fail)
- Fix applied:
  1. Added `parseListeningPids(netstatOutput, port)` to `desktop-shutdown.cjs`.
     Uses `/:(\d+)$/.exec(local)` to extract the numeric port, then compares
     `Number(match) === port` — exact equality, no substring. IPv4 and IPv6
     (`[::1]:5173`, `:::5173`) are handled by the same regex. ESTABLISHED lines
     and pid 0 continue to be filtered out.
  2. Replaced `listeningPids` body in `free-desktop-ports.cjs` to delegate to
     `parseListeningPids(execSync('netstat -ano', ...), port)`.
  3. Fixed `killPid` in `free-desktop-ports.cjs` to use `killTreeArgs` + `execFileSync`
     instead of `execSync(\`taskkill /PID ${pid}\`)`.
- GREEN: all 23 tests PASS (`node --test scripts/desktop-shutdown.test.cjs` — 23/23, 97 ms)
