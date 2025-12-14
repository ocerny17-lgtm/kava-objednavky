# ☕ Káva v Obyváku - Objednávkový systém

Webová aplikace pro objednávání kávy v obyváku u Anet, Ondry a Sunny.

## 🚀 Deployment

Tato aplikace je připravena pro deployment na **Vercel** přes GitHub.

📖 **Podrobné instrukce najdete v [README-VERCEL.md](./README-VERCEL.md)**

### Rychlý start:

1. Pushněte kód do GitHub repository
2. Připojte repository k Vercel
3. Deployujte!

## ✨ Funkce

### Pro zákazníky:
- ✅ Zadání jména
- ✅ Výběr z 8 druhů kávy/čaje (Latte Macchiato, Cappuccino, Flat White, Lungo, Logr, Rozpustná káva, Čaj, Espresso)
- ✅ Volba s mlékem nebo bez mléka
- ✅ Nastavení počtu lžiček cukru (0-10)
- ✅ Zobrazení všech aktuálních objednávek
- ✅ Automatická aktualizace každé 3 sekundy
- ✅ Zobrazení, kdo na objednávce pracuje a jak dlouho

### Pro baristy:
- ✅ Přihlášení (jméno: **Sunny**, heslo: **1711**)
- ✅ Zobrazení všech objednávek
- ✅ Přijetí objednávky (změna statusu na "Připravuje se")
- ✅ Označení objednávky jako odnášené (objednávka se smaže)

## 🎨 Design

- 🎨 Moderní gradient design
- 📱 Plně responzivní pro mobilní telefony
- ✨ Animace a hover efekty
- 🖥️ Optimalizováno pro desktop i mobil

## 🛠️ Technické informace

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Datové úložiště:** In-memory (pro produkci doporučeno Vercel KV)
- **Deployment:** Vercel

## 📝 Struktura projektu

```
kava-objednavky/
├── index.html          # Hlavní HTML stránka
├── style.css           # CSS styly
├── script.js           # Frontend JavaScript
├── api/
│   ├── orders.js       # Serverless API (in-memory)
│   └── orders-kv.js    # Serverless API s Vercel KV (pro produkci)
├── package.json        # NPM konfigurace
├── vercel.json         # Vercel konfigurace
├── .gitignore          # Git ignore soubor
├── README.md           # Tento soubor
└── README-VERCEL.md    # Podrobné instrukce pro Vercel
```

## ⚠️ Důležité poznámky

### Úložiště dat

Aplikace aktuálně používá **in-memory storage**. To znamená:
- ⚠️ Data se ztratí při restartu serverless funkce
- ✅ Pro produkční použití použijte **Vercel KV** (viz README-VERCEL.md)

### Bezpečnost

- Přihlašovací údaje jsou hardcoded v JavaScriptu
- Aplikace je určena pro lokální/domácí použití
- Pro produkční prostředí doporučujeme:
  - Implementovat bezpečnější autentizaci
  - Použít HTTPS (Vercel to poskytuje automaticky)

## 📚 Dokumentace

- [README-VERCEL.md](./README-VERCEL.md) - Podrobné instrukce pro deployment na Vercel
- [Vercel Documentation](https://vercel.com/docs) - Oficiální dokumentace Vercel

## 🐛 Řešení problémů

Pokud máte problémy:
1. Zkontrolujte konzoli prohlížeče (F12)
2. Zkontrolujte Vercel logs v dashboardu
3. Ověřte, že API endpoint `/api/orders` funguje
4. Přečtěte si [README-VERCEL.md](./README-VERCEL.md) pro podrobnější instrukce

