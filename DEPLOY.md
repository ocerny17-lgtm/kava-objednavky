# 🚀 Rychlý návod na deployment

## Krok 1: Vytvořte GitHub repository

```bash
cd kava-objednavky
git init
git add .
git commit -m "Initial commit - Káva objednávkový systém"
git branch -M main
```

Pak vytvořte nové repository na GitHubu a pushněte:

```bash
git remote add origin https://github.com/VASE_UZIVATELSKE_JMENO/kava-objednavky.git
git push -u origin main
```

## Krok 2: Připojte k Vercel

1. Jděte na [vercel.com](https://vercel.com)
2. Přihlaste se pomocí **GitHub** účtu
3. Klikněte na **"New Project"**
4. Vyberte vaše repository `kava-objednavky`
5. Vercel automaticky detekuje nastavení - **nechte vše jako je**
6. Klikněte na **"Deploy"**

## Krok 3: Hotovo! 🎉

Vaše aplikace bude dostupná na adrese typu:
`https://kava-objednavky.vercel.app`

## ⚠️ Důležité: Upgrade na trvalé úložiště

Aktuálně aplikace používá in-memory storage (data se mohou ztratit). Pro produkční použití:

1. V Vercel dashboardu: **Storage** → **Create Database** → **KV** (Redis)
2. Nainstalujte: `npm install @vercel/kv`
3. Přejmenujte `api/orders-kv.js` na `api/orders.js`
4. Pushněte změny a redeploy

Více informací v [README-VERCEL.md](./README-VERCEL.md)

