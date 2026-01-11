# Nastavení trvalého úložiště (Vercel KV)

## Problém s mizením objednávek

Aplikace aktuálně používá **hybridní úložiště**:
- **Vercel KV** (doporučeno) - trvalé úložiště, data se neztratí
- **In-memory** (fallback) - data se mohou ztratit při restartu serverless funkce

## Jak nastavit Vercel KV (trvalé úložiště)

### 1. Vytvořte Vercel KV databázi

1. Jděte do [Vercel Dashboard](https://vercel.com/dashboard)
2. Vyberte váš projekt
3. Jděte na záložku **"Storage"**
4. Klikněte na **"Create Database"**
5. Vyberte **"KV"** (Redis)
6. Zadejte název (např. `kava-objednavky-kv`)
7. Vyberte region (doporučeno: nejbližší k vám)
8. Klikněte na **"Create"**

### 2. Propojte databázi s projektem

1. V Storage sekci klikněte na vaši KV databázi
2. Klikněte na **"Connect"** (nebo **"Link to Project"**)
3. Vyberte váš projekt `kava-objednavky`
4. Environment variables se přidají automaticky

### 3. Nainstalujte závislosti

```bash
npm install @vercel/kv
```

### 4. Deploy znovu

```bash
git add .
git commit -m "Add Vercel KV for persistent storage"
git push
```

Vercel automaticky deployne změny. Nebo použijte:

```bash
vercel --prod
```

### 5. Ověření

Po deployi:
1. Vytvořte testovací objednávku
2. Obnovte stránku
3. Objednávka by měla stále být viditelná

Pokud objednávky stále mizí, zkontrolujte:
- Vercel logs: Dashboard → Project → Functions → orders
- Zda je KV databáze správně propojená s projektem
- Zda jsou environment variables nastavené

## Bezplatná verze Vercel KV

Vercel KV má bezplatný tier:
- 256 MB úložiště
- Dostatečné pro malé aplikace
- Pro více dat lze upgradovat

## Alternativní řešení

Pokud nechcete používat Vercel KV, můžete:
- Použít externí databázi (PostgreSQL, MongoDB)
- Použít localStorage na frontendu (méně spolehlivé)
- Přijmout, že data se mohou ztratit při nečinnosti

