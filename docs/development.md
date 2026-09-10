# Nightwolf RGB - Desenvolvimento

## 🚀 Início Rápido

### Opção 1: Script com Admin Automático (Recomendado)

```powershell
.\start-dev-admin.ps1
```

ou

```batch
.\start-dev-admin.bat
```

### Opção 2: Manual

```bash
# Como administrador, na raiz do repo
npm run desktop
```

## 📋 Pré-requisitos

- ✅ Node.js instalado (através do vfox)
- ✅ Dependências instaladas (`npm run install:all`)
- ✅ OpenRGB binário em `bin/OpenRGB/`
- ✅ **Executar como Administrador** (requerido pelo OpenRGB)

## Acesso

- **App**: janela nativa (`npm run desktop`)
- **Renderer (dev)**: Vite em http://127.0.0.1:5173 (não é o produto)
- **Backend API**: http://127.0.0.1:3001/
- **OpenRGB SDK**: localhost:6742

## 🛑 Parar os Servidores

Pressione `Ctrl+C` no terminal (ambos servidores serão encerrados)
