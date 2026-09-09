# ARCH Re-Review Evidence — Story NW-12

**Date:** 2026-09-04
**ARCH:** harness-arch (independent spawn)
**Entry signal:** `Approved for Architecture Review: Story NW-12` (QA re-entry, 29/29 pass)
**Prior ARCH state:** `ARCH Review Bounce — Story NW-12` (A1 + A2, @BE) — see `arch-nw-12.md`
**Scope:** verification of blocking findings A1 and A2 only, plus regression check on the fix itself. AC#1–4 were re-verified by QA and are not re-litigated.
**Exit state:** `Ready for Security Review: Story NW-12` (see §Verdict)

**Constraints honoured:** no PR created, no git commit, no production code modified.

---

## Verdict

**A1 CLOSED. A2 CLOSED. → Ready for Security Review.**

Both blocking findings are resolved at the seam I asked for, not patched at the call site. The fix is better than the minimum: BE implemented numeric port equality where SEC's independent required fix asked only for `endsWith`, which is strictly stronger and self-documenting.

One residual from A2 (`imageName` still shell-interpolated) is **carried as advisory, not a bounce** — reasoning in §A2-r below.

| Finding | Prior | Now | Evidence |
|---|---|---|---|
| A1 — prefix port match, no test seam | BLOCKING | **CLOSED** | `desktop-shutdown.cjs:46–61`, `free-desktop-ports.cjs:17–20`, 12 tests at `desktop-shutdown.test.cjs:33–91` |
| A2 — duplicated shell kill mechanism | BLOCKING | **CLOSED** | `free-desktop-ports.cjs:34–37` |
| A2-r — `imageName` shell interpolation | (part of A2) | Advisory P3 | `free-desktop-ports.cjs:24` — SEC graded P3 independently |
| A9 — no `test:shutdown` npm script | *(new)* | Advisory | `package.json` scripts block |
| A10 — module docblock stale | *(new)* | Advisory | `desktop-shutdown.cjs:8–11` |
| A11 — `wait-on` now dead dependency | *(new, = SEC-7)* | Advisory | `package.json` devDependencies |
| A3, A4, A5, A6, A7 | Advisory | Unchanged | carried forward |

---

## A1 — CLOSED · Exact numeric port match behind a pure seam

**Verified at** `scripts/desktop-shutdown.cjs:46–61`:

```js
function parseListeningPids(netstatOutput, port) {
    const pids = new Set();
    for (const line of netstatOutput.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const cols = line.trim().split(/\s+/);
        const local = cols[1] || '';
        const m = /:(\d+)$/.exec(local);
        if (!m) continue;
        if (Number(m[1]) !== port) continue;
        const pid = cols[cols.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(Number(pid));
    }
    return [...pids];
}
```

**Substring logic is gone entirely** — I checked for both halves of the original defect, not just the one that was named:

- The collapsed `!local.endsWith(needle) && !local.includes(needle)` conjunction is deleted.
- The `if (!line.includes(needle)) continue;` whole-line pre-filter, which was a *second* substring test in the same function, is also gone. Only the anchored numeric comparison remains.

**Trace against the original false-positive class:** `'127.0.0.1:51730'` → `/:(\d+)$/` captures `"51730"` → `Number("51730") !== 5173` → skipped. `'0.0.0.0:30015'` → `30015 !== 3001` → skipped. `'127.0.0.1:15173'` → `15173 !== 5173` → skipped. The regex is anchored at `$`, so no prefix or suffix collision survives.

**True positives preserved across address forms:** `0.0.0.0:5173`, `127.0.0.1:5173`, `[::1]:5173`, and `:::5173` all terminate in `:<digits>`, so one regex covers IPv4 and IPv6. Scoped IPv6 (`[fe80::1%12]:5173`) also matches — wider coverage than SEC's suggested `endsWith` fix, at no cost.

**Seam placement is correct — this is the part that actually closes the finding.** My bounce framed A1 as *"the missing seam is the architectural defect; the prefix bug is what the missing seam let through."* The seam now exists and has the right shape:

- `parseListeningPids(netstatOutput, port)` is **pure** — string and number in, array out, no `child_process`, no OS contact. It is exported at `desktop-shutdown.cjs:98`.
- `listeningPids` in `free-desktop-ports.cjs:17–20` is now a three-line adapter that supplies `netstat -ano` stdout and delegates.
- The split lands on the existing module character: `desktop-shutdown.cjs` was already the injected-dependency, no-I/O module; `free-desktop-ports.cjs` is the OS adapter. Cohesion improved rather than diluted.

**Tests are real and non-tautological.** I read `desktop-shutdown.test.cjs:9–91` rather than trusting the pasted run output. `SAMPLE_NETSTAT` is a realistic fixture with the true netstat column layout, and every expected value is an independent literal pid baked into the fixture — nothing is recomputed the way the implementation computes it. All six false-positive cases I required are covered (51730, 51739, 15173, 30010, 30015, 30019), plus IPv4-any, loopback, IPv6 true positives, ESTABLISHED noise, and pid 0.

**Also satisfies SEC-1.** SEC's required fix was `if (!local.endsWith(needle)) continue;` plus a RED→GREEN test proving 51730 and 30015 are not selected. Numeric equality is a superset of `endsWith`, and both required test cases are present at `desktop-shutdown.test.cjs:33` and `:53`.

**Two coverage nits (advisory, do not gate):**

1. Every assertion is a single-pid `includes` / `!includes`. None asserts the *complete* returned set, so an over-broad match to a pid nobody enumerated would still pass. One line closes it: `assert.deepEqual(parseListeningPids(SAMPLE_NETSTAT, 5173).sort(), [2001, 2002, 2003]);`
2. Port 6742 is in the fixture (pid 6742) but no test selects on it — and 6742 is the one port SEC noted was safe only *by accident* under the old code (`67420 > 65535`). It is the port most worth a positive assertion now that the accident no longer carries it.

---

## A2 — CLOSED · Single source of truth restored, shell removed from the kill path

**Verified at** `scripts/free-desktop-ports.cjs:34–37`:

```js
function killPid(pid) {
    const { cmd, args } = killTreeArgs(pid);
    execFileSync(cmd, args, { stdio: 'ignore', windowsHide: true });
}
```

The DRY violation is gone. `killPid` no longer re-implements `taskkill /PID … /T /F`; it sources the argv from `killTreeArgs` at `desktop-shutdown.cjs:31`, so the kill mechanism now has exactly one home — matching the claim the module docblock had been making since the original submission. `execFileSync` with an argv array means no `cmd.exe` parse step, so the sink class is removed from this path by construction, not by convention.

Secondary benefit worth recording: `killPid` and `quitDesktop` now exercise the *same* struct that `desktop-shutdown.test.cjs:95–113` asserts on, so the four `killTreeArgs` tests transitively cover both kill call sites instead of one.

`windowsHide: true` was added — consistent with the `spawn` options in `quitDesktop` at `desktop-shutdown.cjs:84–88`. Good, and unprompted.

**Import hygiene checked:** `free-desktop-ports.cjs:14–15` imports `{ execSync, execFileSync }` and `{ KILL_TARGETS, killTreeArgs, parseListeningPids }` — all five are used, no dead imports left by the refactor.

---

## A2-r — Advisory (not a bounce) · `imageName` still shell-interpolated

`scripts/free-desktop-ports.cjs:24` retains:

```js
const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
```

My A2 fix instruction named this line alongside `killPid`, so I owe an explicit account of why it does not hold the gate.

**Why it does not bounce:**

1. **The security gate already ruled.** SEC reviewed this exact line independently and graded it **SEC-2, P3, non-blocking**, with A03 marked ✓ PASS overall (`sec-nw-12.md:112`, `:86`). Per GATES.md, P3 is "best practice: add to backlog, document in PR." ARCH is explicitly not the SEC agent; holding at Gate 3 over a severity call the Gate-4 owner has already made would substitute my judgment for theirs, outside my remit.
2. **My own stated rationale was predictive, and the prediction was tested.** The bounce argued *"SEC will read it as A03 at Gate 4; cheaper to close now."* SEC read it and did not. The cost-avoidance justification no longer holds, and the DRY justification — the part that was genuinely architectural — is satisfied.
3. **Unreachability is now stronger than when I wrote the bounce.** I argued "one future caller from any other source reintroduces injection." That overstated it: `imageName` is module-private (`module.exports = { freePorts }` at `:65`), has exactly one call site (`:48`), and its argument now arrives from `parseListeningPids:58`, which gates on `/^\d+$/` and coerces with `Number()`. Reaching it with a non-numeric pid requires editing this file, three lines below a visible guard.

**What remains true, and why it is still worth doing:** the file now holds two exec idioms side by side — `execFileSync` with argv in `killPid`, `execSync` with a template literal eight lines above in `imageName`. That inconsistency is the kind of thing that sediments. Fix is one line:

```js
const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
```

**Recommendation:** fold into the advisory hardening pass with A3/A4 and SEC-3 (absolute `System32` paths for `taskkill`/`netstat`/`tasklist`) — one edit, one file, closes SEC-2 and SEC-3 together.

---

## New advisories surfaced by this pass

**A9 — no `test:shutdown` npm script.** `package.json` defines `test:update`, `test:engine`, and `test:type-roles`, but `scripts/desktop-shutdown.test.cjs` — now the largest suite at 23 tests and the one guarding the destructive path — has no alias. This is a convention gap, and the story's own DoD names "novos `node --test scripts/*.test.cjs`" as a deliverable. SEC flagged the same thing as a DoD concern (`sec-nw-12.md:132`), correctly routing it to ARCH's lane rather than treating it as security. One line: `"test:shutdown": "node --test scripts/desktop-shutdown.test.cjs"`. Worth adding before HITL merge so the suite is discoverable by convention rather than by memory.

**A10 — module docblock is now stale.** `desktop-shutdown.cjs:8–11` declares the module's public surface as `KILL_TARGETS`, `killTreeArgs`, `quitDesktop`. `parseListeningPids` is exported at `:98` but absent from that list. The docblock *is* this module's interface statement — it is the reason the module reads as deliberately designed — so leaving it incomplete undercuts the thing that made the seam legible in the first place. Add one line.

**A11 — `wait-on` is now a dead dependency** (= SEC-7). NW-12 replaced the `npx wait-on` fragment with the native `http.get` poller at `run-desktop-electron.cjs:27–45`; the only surviving reference is a comment at `:6`. This is dependency hygiene created by *this* story's refactor, so it belongs with the story rather than in general backlog. Endorsing SEC's call: remove `wait-on ^8.0.1` from devDependencies.

---

## Carried forward unchanged

A3 (no watchdog/timeout on the shutdown path), A4 (`freePorts` sync-blocks the main thread while the injected contract promises async — note the JSDoc at `desktop-shutdown.cjs:77` still reads `Promise<void>|void` while the adapter returns `number`), A5 (Windows-only shutdown, no ADR, no `docs/adr/` in the repo), A6 (44px / `overflow-visible` invariants live only in `type-roles.test.cjs`, not `design.md`), A7 (pre-existing `text-sm` role bypasses in `Dashboard.tsx` → @PO debt story).

A5 is worth reiterating now that the module has grown: `parseListeningPids` parses `netstat -ano` output, and `-o` is not a BSD flag. The Windows coupling is now spread across three functions in two modules with no platform guard and no recorded decision. Either guard it or write the ADR — this would be the repo's first.

---

## Handoff to SEC — coordinates for a cheap re-review

SEC has **1 of 2** re-review budget remaining, so precise pointers matter. Note that **the predicate moved modules**, which makes SEC's original reference stale:

| SEC's finding | Old location | Current location | Status |
|---|---|---|---|
| SEC-1 (P2) predicate | `free-desktop-ports.cjs:26` | `desktop-shutdown.cjs:46–61` | Fixed — numeric equality, exceeds the `endsWith` fix SEC required |
| SEC-1 required tests | none existed | `desktop-shutdown.test.cjs:33–91` | Present — 51730 at `:33`, 30015 at `:53`, both asserting NOT selected |
| SEC-2 (P3) `killPid` | `free-desktop-ports.cjs:46` | `free-desktop-ports.cjs:34–37` | Fixed — `execFileSync` + `killTreeArgs` |
| SEC-2 (P3) `imageName` | `free-desktop-ports.cjs:35` | `free-desktop-ports.cjs:24` | **Outstanding** — unchanged, still P3 |
| SEC-3 (P3) PATH resolution | `:18`, `:35`, `desktop-shutdown.cjs:32` | `free-desktop-ports.cjs:18`, `:24`; `desktop-shutdown.cjs:32` | Unchanged |

The P2 that failed Gate 4 is closed. SEC-2 is half-closed; the surviving half plus SEC-3 are the P3 items ARCH recommends bundling post-merge.

---

## Exit State

**Ready for Security Review: Story NW-12 — ARCH A1 (prefix port match / missing seam) and A2 (duplicated shell kill mechanism) both CLOSED; `parseListeningPids` exact-match seam verified pure, exported, and covered by 12 non-tautological tests; `killPid` sources argv from `killTreeArgs` via `execFileSync`. Residual `imageName` shell interpolation carried as advisory per SEC's independent P3 grading. Re-enters Gate 4 with SEC budget 1 of 2 remaining.**

**PR: intentionally not created.** The profile makes PR creation an ARCH deliverable at this exit, but HITL instruction for this story forbids both PR creation and commit. Flagging so the gap is a recorded decision rather than an ARCH omission — the PR and its evidence package are deferred to HITL.
