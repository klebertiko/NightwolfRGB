# SEC Re-Review — Story NW-12 (Desktop shutdown / port cleanup)

**Agent:** SEC (independent, fresh context)
**Re-review:** 1 of 2 budget (1 remaining, unused)
**Scope:** verification of the P2 bounce fix — `scripts/desktop-shutdown.cjs`, `scripts/free-desktop-ports.cjs`
**Prior review:** `sec-nw-12.md` — bounced @BE on **SEC-1 (P2)**, substring port match at `free-desktop-ports.cjs:26`
**Verdict:** ✅ **PASS — Ready for HITL Review**

---

## 1. Bounce closure — SEC-1 (P2)

### What was wrong

`free-desktop-ports.cjs:26` selected kill targets with a substring predicate:

```js
const needle = `:${port}`;
if (!local.endsWith(needle) && !local.includes(`${needle}`)) continue;
```

The `includes` disjunct made the whole guard permissive: `:5173` matched `:51730`–`:51739`
and `:15173`; `:3001` matched `:30010`–`:30019`. Those ranges sit inside the Windows
ephemeral port range (49152–65535 dynamic, plus 3xxxx in practice), so any `node.exe`
that happened to listen there — Cursor language servers, MCP servers — was a valid
kill candidate under the `node/node.exe` allowlist. The allowlist did not save it,
because the collateral processes *are* node.

### What changed

The predicate moved to a pure, exported, testable function in `desktop-shutdown.cjs:46-61`:

```js
const m = /:(\d+)$/.exec(local);      // anchored at end of local-address column only
if (!m) continue;
if (Number(m[1]) !== port) continue;  // numeric equality — no substring
```

`free-desktop-ports.cjs:17-20` now delegates to it; the `line.includes(needle)`
pre-filter is gone entirely.

### Why this closes it — structural argument

The new selection set is a **strict subset** of the old one, so the fix cannot
widen the kill surface:

> New selects a line ⟺ `cols[1]` ends in exactly `:<port>` ⟹ `cols[1].endsWith(':'+port)`
> ⟹ the old `endsWith` disjunct also passed. Therefore new ⊆ old, and every element
> old-selected-but-new-skipped is a false positive that has been removed.

Two further narrowings fall out of the rewrite:
- Only `cols[1]` (local address) is parsed. Previously an unanchored match could be
  satisfied by text elsewhere on the line, including the **foreign** address column.
- The port is compared as a **number**, so `:517`, `:5174`, and `10.0.5173.1:80`
  cannot alias `:5173`.

### Verification — adversarial probe

`node` is unavailable on PATH in this shell and in WSL (`NO_NODE_IN_WSL`), so the suite
could not be executed here. The predicate was instead transcribed faithfully into
PowerShell and driven against a corpus that **super-sets** the BE's own test fixture:

| Local address | Port queried | Expected | Result |
|---|---|---|---|
| `0.0.0.0:5173` | 5173 | select | ✅ selected (2001) |
| `127.0.0.1:5173` | 5173 | select | ✅ selected (2002) |
| `[::1]:5173` | 5173 | select | ✅ selected (2003) |
| `[::]:5173` — *not in BE suite* | 5173 | select | ✅ selected (2004) |
| `[fe80::1%12]:5173` — *zone index, not in BE suite* | 5173 | select | ✅ selected (2005) |
| `127.0.0.1:51730` | 5173 | **spare** | ✅ spared |
| `127.0.0.1:51739` | 5173 | **spare** | ✅ spared |
| `127.0.0.1:15173` | 5173 | **spare** | ✅ spared |
| `127.0.0.1:5174` — *not in BE suite* | 5173 | **spare** | ✅ spared |
| `127.0.0.1:517` — *not in BE suite* | 5173 | **spare** | ✅ spared |
| `10.0.5173.1:80` — *octet alias, not in BE suite* | 5173 | **spare** | ✅ spared |
| foreign-addr `127.0.0.1:5173` on a `:9000` listener — *not in BE suite* | 5173 | **spare** | ✅ spared |
| `0.0.0.0:30015` | 3001 | **spare** | ✅ spared |
| `127.0.0.1:5173` **ESTABLISHED** | 5173 | **spare** | ✅ spared |
| `0.0.0.0:135` pid 0 | 135 | **spare** | ✅ spared |

```
legit targets MISSED (false negatives): none
collateral SELECTED (false positives): none
```

### Verification — live machine, no functional regression

Real listeners on this host, old rule vs. new rule:

```
:5173  OLD => 127.0.0.1:5173(pid 34672)          NEW => 127.0.0.1:5173(pid 34672)
:3001  OLD => 0.0.0.0:3001 [::]:3001 (pid 34544) NEW => 0.0.0.0:3001 [::]:3001 (pid 34544)
:6742  OLD => 0.0.0.0:6742(pid 34072)            NEW => 0.0.0.0:6742(pid 34072)
```

All three legitimate Nightwolf targets — Vite, backend, OpenRGB — are still selected,
including the dual IPv4/IPv6 binding on 3001. **No false negatives introduced.**
No collateral node listener happens to occupy an ephemeral alias right now, which is
exactly why the original bug was intermittent rather than deterministic.

### Regression lock

`scripts/desktop-shutdown.test.cjs` adds 12 tests against `parseListeningPids`,
covering both directions (`:51730`/`:51739`/`:15173`/`:30010`/`:30015`/`:30019` spared;
`0.0.0.0:5173`, `127.0.0.1:5173`, `[::1]:5173`, `0.0.0.0:3001` selected) plus ESTABLISHED
and pid-0 filtering. Ledger records RED (`TypeError: parseListeningPids is not a function`,
11 pass / 12 fail) → GREEN (23/23, 97 ms). This satisfies the regression-test condition
attached to the bounce.

**SEC-1 (P2) — CLOSED.**

---

## 2. Second change reviewed — `killPid` (A03 Injection)

`free-desktop-ports.cjs:34-37` was previously `execSync(\`taskkill /PID ${pid} /T /F\`)` —
a string command through a shell. It is now:

```js
const { cmd, args } = killTreeArgs(pid);
execFileSync(cmd, args, { stdio: 'ignore', windowsHide: true });
```

- **argv form, no shell** — the pid can never be re-parsed as command syntax, regardless
  of what upstream validation does later.
- Shares `killTreeArgs` with `quitDesktop`, so the kill command has a single definition;
  the two call sites can no longer drift apart.
- `execFileSync` still throws on nonzero exit, so the existing `try/catch` at
  `free-desktop-ports.cjs:54-58` preserves the "process already gone" behaviour.

Shell-usage sweep across both files:

| Location | Call | Verdict |
|---|---|---|
| `free-desktop-ports.cjs:18` | `execSync('netstat -ano')` | constant string, no interpolation — safe |
| `free-desktop-ports.cjs:24` | `execSync(\`tasklist /FI "PID eq ${pid}" ...\`)` | interpolated — residual **P3 SEC-2**, see §4 |
| `free-desktop-ports.cjs:36` | `execFileSync(cmd, args)` | argv, no shell — ✅ |
| `desktop-shutdown.cjs:84` | `spawn(cmd, args, {windowsHide, stdio, detached:false})` | argv, no `shell: true` — ✅ |

This partially closes the prior P3 SEC-2 (kill path done; `imageName` remains).

---

## 3. OWASP Top 10 — delta scan on this diff

| # | Category | Finding |
|---|---|---|
| A01 | Broken access control | No change. IPC surface unchanged (`preload.cjs` exposes only platform + window controls). |
| A02 | Cryptographic failures | N/A — no crypto, no secrets in scope. |
| A03 | Injection | **Improved.** Kill path moved to argv `execFileSync`. Residual `tasklist` interpolation is P3 and unreachable (§4). |
| A04 | Insecure design | **Improved.** Target selection is now a pure function with an explicit test suite; the allowlist (`KILL_TARGETS`) still gates on image name, so exact-port matching and name allowlisting are defence in depth. Cursor remains structurally unkillable — asserted by test at `desktop-shutdown.test.cjs:140`. |
| A05 | Misconfiguration | Dev-only `remote-debugging-port 9229` (`main.cjs:15`) unchanged — P3, dev-gated. Hardening intact: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (`main.cjs:137-139`). |
| A06 | Vulnerable components | No new dependencies. Electron pinned `^33.2.1`, installed **33.4.11** — still the EOL line flagged as P3 SEC-6. |
| A07 | Auth failures | N/A — no auth in scope. |
| A08 | Integrity failures | No deserialization, no unsigned update path, no `eval`. |
| A09 | Logging failures | `console.log` on kill/skip decisions prints only pid, image name, port — no secrets or PII. Good audit trail for a destructive operation. |
| A10 | SSRF | `shell.openExternal(url)` at `main.cjs:165` unchanged — P3 SEC-4. |

### Secrets scan

```
scripts/*.cjs, electron/*.cjs, package.json → clean, no secret-like literals
tracked .env files → backend/.env.example only (placeholder file, correct)
```

No keys, tokens, passwords, or private key material. **PASS.**

---

## 4. Residual P3s — backlog, non-blocking

Carried over from `sec-nw-12.md`; none gate this story.

| ID | Location | Issue | Reachability |
|---|---|---|---|
| SEC-2 *(partial)* | `free-desktop-ports.cjs:24` | `tasklist` built by string interpolation | **Unreachable.** `pid` originates only from `parseListeningPids`, which validates `/^\d+$/` then returns `Number(pid)` (`desktop-shutdown.cjs:58`), so it is always a JS number. Latent sink; convert to `execFileSync` for symmetry with `killPid`. |
| SEC-3 | `desktop-shutdown.cjs:32`, `free-desktop-ports.cjs:18,24` | `taskkill`/`netstat`/`tasklist` invoked by bare name, resolved via `PATH` | Requires a pre-existing PATH-hijack, which is already game over. Pin to `%SystemRoot%\System32\` for defence in depth. |
| SEC-4 | `main.cjs:165` | `shell.openExternal(url)` with no scheme allowlist | Allowlist `https:`/`http:` before opening. |
| SEC-5 | `main.cjs:14-16` | `remote-debugging-port 9229` | Dev-gated by `isDev`; confirm it cannot be reached in a packaged build. |
| SEC-6 | `package.json:27` | Electron `^33.2.1`, installed 33.4.11 — EOL major | Plan a bump to a supported major. |
| SEC-7 | `package.json:28` | `wait-on` declared but unused after the runner rewrite | Remove — dependency hygiene. |

---

## 5. Verdict

The P2 that caused the bounce is closed, and closed correctly — not patched around.
The predicate was extracted into a pure function, tightened from substring to anchored
numeric equality, proven a strict subset of the old behaviour, locked by 12 regression
tests, and confirmed against an adversarial corpus that exceeds the BE's own fixture with
zero false positives and zero false negatives. The kill path was independently hardened
to argv execution. No new findings at P0/P1/P2. Secrets scan clean.

**Ready for HITL Review: Story NW-12** — security gate PASS. Six P3s to backlog.
Re-review budget: 1 of 2 used.
