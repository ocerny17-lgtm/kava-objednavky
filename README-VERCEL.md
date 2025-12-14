# Káva v Obyváku - Deployment na Vercel

Webová aplikace pro objednávání kávy v obyváku u Anet, Ondry a Sunny.

## 🚀 Rychlý start s Vercel

### Metoda 1: Deployment přes GitHub (Doporučeno)

1. **Vytvořte GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VASE_UZIVATELSKE_JMENO/kava-objednavky.git
   git push -u origin main
   ```

2. **Připojte k Vercel:**
   - Jděte na [vercel.com](https://vercel.com)
   - Přihlaste se pomocí GitHub účtu
   - Klikněte na "New Project"
   - Vyberte vaše repository `kava-objednavky`
   - Vercel automaticky detekuje nastavení
   - Klikněte na "Deploy"

3. **Hotovo!** Vaše aplikace bude dostupná na adrese typu `https://kava-objednavky.vercel.app`

### Metoda 2: Deployment přes Vercel CLI

1. **Nainstalujte Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deployujte:**
   ```bash
   cd kava-objednavky
   vercel
   ```

3. **Postupujte podle instrukcí v terminálu**

## 📝 Důležité poznámky

### Úložiště dat

Aplikace aktuálně používá **in-memory storage** (data se ukládají pouze do paměti serverless funkcí). To znamená:
- ⚠️ **Data se ztratí při restartu serverless funkce** (což se může stát při nečinnosti)
- ✅ Pro produkční použití doporučujeme použít **Vercel KV** (Redis)

### Upgrade na Vercel KV (Trvalé úložiště)

1. **Vytvořte Vercel KV databázi:**
   - V Vercel dashboardu jděte na "Storage"
   - Klikněte na "Create Database"
   - Vyberte "KV" (Redis)
   - Vytvořte databázi

2. **Nainstalujte závislosti:**
   ```bash
   npm install @vercel/kv
   ```

3. **Přejmenujte soubor:**
   - Přejmenujte `api/orders-kv.js` na `api/orders.js`
   - (Přepište existující soubor)

4. **Nastavte environment variables:**
   - V Vercel dashboardu jděte do Settings → Environment Variables
   - Vercel automaticky přidá potřebné proměnné pro KV

5. **Redeploy:**
   - Pushněte změny do GitHubu nebo použijte `vercel --prod`

## 🔧 Konfigurace

### Environment Variables

Pokud používáte Vercel KV, nejsou potřeba žádné další environment variables - Vercel je nastaví automaticky.

### Custom Domain

1. V Vercel dashboardu jděte do Settings → Domains
2. Přidejte vaši doménu
3. Postupujte podle instrukcí pro DNS nastavení

## 🎯 Funkce aplikace

### Pro zákazníky:
- ✅ Zadání jména
- ✅ Výběr z 8 druhů kávy/čaje
- ✅ Volba s mlékem nebo bez mléka
- ✅ Nastavení počtu lžiček cukru
- ✅ Zobrazení všech aktuálních objednávek
- ✅ Automatická aktualizace každé 3 sekundy
- ✅ Zobrazení, kdo na objednávce pracuje a jak dlouho

### Pro baristy:
- ✅ Přihlášení (jméno: **Sunny**, heslo: **1711**)
- ✅ Zobrazení všech objednávek
- ✅ Přijetí objednávky
- ✅ Označení objednávky jako odnášené

## 📱 Responzivní design

Aplikace je plně responzivní a funguje na:
- 💻 Desktop počítačích
- 📱 Tabletech
- 📱 Mobilních telefonech

## 🔒 Bezpečnost

- Aplikace je určena pro lokální/domácí použití
- Přihlašovací údaje jsou hardcoded v JavaScriptu
- Pro produkční prostředí doporučujeme:
  - Implementovat bezpečnější autentizaci
  - Použít HTTPS (Vercel to poskytuje automaticky)
  - Přidat rate limiting

## 🐛 Řešení problémů

### Objednávky se nezobrazují
- Zkontrolujte konzoli prohlížeče (F12) pro chyby
- Ověřte, že API endpoint `/api/orders` funguje
- Zkontrolujte Vercel logs v dashboardu

### Data se ztrácejí
- To je normální chování s in-memory storage
- Upgrade na Vercel KV pro trvalé úložiště

### Deployment selhal
- Zkontrolujte, že všechny soubory jsou v repository
- Ověřte, že `package.json` existuje
- Zkontrolujte Vercel build logs

## 📞 Podpora

Pro problémy s Vercel:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

