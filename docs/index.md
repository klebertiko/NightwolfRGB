# Nightwolf RGB

> O RGB do PC, no seu controle. O motor é o OpenRGB. Nightwolf é 100% compatível e traz o OpenRGB no bundle.

## Product

- **Name:** Nightwolf RGB
- **One-liner:** Lighting console for PC RGB. Paint hardware through OpenRGB. No account.
- **License:** MIT
- **Author:** klebertiko
- **Repository:** https://github.com/klebertiko/NightwolfRGB
- **Landing:** https://klebertiko.github.io/NightwolfRGB/
- **Based on:** OpenRGB (https://openrgb.org/ · https://gitlab.com/CalcProgrammer1/OpenRGB)
- **Screenshot:** https://klebertiko.github.io/NightwolfRGB/images/studio.png

## Install

One line. PowerShell or Git Bash. The script installs the closed build. Then `nightwolfrgb update` or Atualizar in-app. Both also check OpenRGB. There is no zip download path.

PowerShell:

```
irm https://github.com/klebertiko/NightwolfRGB/releases/latest/download/install.ps1 | iex
```

Git Bash:

```
curl -fsSL https://github.com/klebertiko/NightwolfRGB/releases/latest/download/install.sh | bash
```

From a clone: `npm install` then `npm run desktop`.

## Views

In-app rail (shortcuts `1–6`): Studio · Luz · Explorar · Efeitos · Biblioteca · Cenas.

Landing page anchors (screenshot folds):

- [Studio](https://klebertiko.github.io/NightwolfRGB/#studio): live stage of connected hardware
- [Luz](https://klebertiko.github.io/NightwolfRGB/#luz): device, zone, modes, per-LED colour
- [Efeitos](https://klebertiko.github.io/NightwolfRGB/#efeitos): live effects console
- [Cenas](https://klebertiko.github.io/NightwolfRGB/#cenas): Nightwolf scene vs native OpenRGB `.orp` profile

Explorar (catalog) and Biblioteca (installed) ship in the desktop app; see [ADR 0001](./adr/0001-three-surface-effects-ia.md).

## Notes for agents

- Mate conflicting RGB software so the SDK can talk to the hardware (iCUE, Armoury Crate, Aura, Synapse, Mystic Light, CAM, RGB Fusion, Polychrome, SignalRGB, G HUB, SteelSeries GG, NGENUITY, and similar). The in-app Limpeza lists running processes and closes only what the operator requests.
- Do not tell people to download a zip.
- Do not brand the landing as Windows-only.
