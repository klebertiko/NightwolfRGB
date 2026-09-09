# Story NW-12 — Fechar encerra o desktop; Syne não recorta o g

As an operador do Nightwolf RGB,
I want o X da janela matar o app inteiro, e os títulos em Syne mostrarem a perna do “g”,
So that não fique Vite/backend/OpenRGB zumbi na 5173, e o wordmark/empty state não nasçam cortados.

## Acceptance Criteria
1. Clicar Fechar (X) encerra o processo Electron; o backend (porta 3001) e o OpenRGB (porta 6742) não continuam escutando.
2. Depois desse Fechar, a porta 5173 não fica com um `node` Vite residual (o `concurrently -k` ou o cleanup pós-exit libera).
3. O título de empty state “Nada ligado ainda” mostra a perna inteira do “g”; a frase do SDK fica abaixo, sem sobrepor o glifo.
4. No header, o ícone com glow e o wordmark “Nightwolf RGB” mostram a perna inteira do “g” (e o glow não é recortado pela barra).

## Testing seams
- AC#1 → módulo `scripts/desktop-shutdown.cjs` (`quitDesktop` / kill da árvore do backend) → `scripts/desktop-shutdown.test.cjs` (node:test). `electron/main.cjs` só chama esse módulo no IPC `window:close` e no `close` da BrowserWindow.
- AC#2 → o mesmo módulo + o comando `desktop` em `package.json` (após o Electron sair, roda `free-desktop-ports`) → teste que a sequência de shutdown inclui liberar 5173/3001/6742 só para `node`/`OpenRGB`, nunca `Cursor`.
- AC#3 → contrato de tipo `.nw-display` em `frontend/src/index.css` + empty state em `Dashboard.tsx` → `scripts/type-roles.test.cjs` (lê CSS/TSX; line-height e gap que cabem o descendente da Syne; subtítulo não cobre o título).
- AC#4 → `Titlebar.tsx` + `BrandMark.tsx` + `.nw-display` → o mesmo `scripts/type-roles.test.cjs` (header `overflow: visible`, altura mínima da barra, glow não clipado).

## Definition of Done
- [ ] Feature code complete (não commitar — HITL pede commit à parte)
- [ ] TDD ledger: RED/GREEN recorded per AC slice (see `tdd` skill)
- [ ] Unit tests written (coverage ≥ 80% for new code)
- [ ] Integration tests passing (`npm run test:engine`, `npm run test:update`, novos `node --test scripts/*.test.cjs`)
- [ ] Documentation updated (if user-facing feature) — N/A salvo `design.md` line-height se o token Display mudar
- [ ] Security review complete
- [ ] PO accepted in Sprint Review

## Story Points
5

## Priority
P1 High
