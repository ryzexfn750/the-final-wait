# The Final Wait — Road to Leonida

## Community Live Hype — sviluppo predisposto

Account Google, nickname, reazioni WebSocket per fuso orario, newsletter
facoltativa via Sender e verifica Cloudflare Turnstile sono implementati in
modalità **non pubblica**. Servono le credenziali Supabase/Sender, il Worker
Durable Objects e la revisione dei Termini/Privacy prima del lancio.

**Guida di installazione:** [docs/COMMUNITY_SETUP.md](docs/COMMUNITY_SETUP.md)

**Test:** `node --test tests/community.test.mjs`

---


Sito fan-made e non ufficiale dedicato al conto alla rovescia di **Grand Theft Auto VI**.
Sviluppato come progetto **statico per GitHub Pages**, senza backend e senza dipendenze JavaScript runtime.

Sito pubblico: https://ryzexfn750.github.io/the-final-wait/

## Struttura della repository

```text
/
├── index.html                  Countdown, timeline e contenuti principali
├── today.html                  Articolo del giorno
├── timeline.html               Articoli dell'archivio cronologico
├── intel.html                  Dossier Inside Leonida
├── css/
│   ├── base.css                Design condiviso dalle quattro pagine
│   └── experience.css          Countdown, preview e finale (solo homepage)
├── js/
│   ├── config.js               Configurazione, timeline e schede Intel
│   ├── app.js                  Timer, scene, UI e navigazione
│   ├── clock.js                Audio di background e milestone
│   ├── milestones.js           Simulatore, musica e finale
│   ├── motion.js               Animazioni condivise
│   ├── language.js             Integrazione traduzioni
│   ├── article.js              Pagina Today
│   ├── timeline-article.js     Pagina Timeline
│   └── intel-article.js        Pagina Intel
├── content/
│   ├── today.json              Articolo del giorno
│   ├── timeline.json           Articoli storico/timeline
│   └── intel.json              Dossier
├── assets/
│   ├── scenes.json             Catalogo delle scene
│   ├── screenshots/desktop/    Immagini WebP desktop
│   ├── screenshots/mobile/     Immagini WebP smartphone
│   └── audio/                  Audio di sottofondo e finale
├── tools/                      Utility Python per immagini e social card
└── tests/                      Test logici e integrità del sito
```

## Fogli CSS

La homepage carica **`css/base.css`** e **`css/experience.css`**. Le altre tre pagine
caricano soltanto **`css/base.css`**.

I precedenti fogli `v6.css` ... `v29-phase2.css` sono stati consolidati mantenendo
l'ordine originale delle regole: in questo modo non cambiano le priorità della cascata.
Dentro i bundle, i commenti `SHARED` / `EXPERIENCE` individuano le sezioni, mentre
il refactoring progressivo può successivamente sostituire le sovrascritture obsolete
**solo dopo un controllo visivo**. Non rimuovere selettori solo perché duplicati:
potrebbero appartenere a breakpoint o stati diversi.

Quando un CSS viene modificato, aggiornare la query `?v=` dei link negli HTML
per evitare versioni in cache.

## Modificare contenuti e scene

- **Articolo del giorno:** aggiornare `content/today.json`.
- **Archivio timeline:** aggiornare `content/timeline.json` e, se necessario, le
  schede/ID in `js/config.js`.
- **Intel:** aggiornare `content/intel.json` e le schede in `js/config.js`.
- **Immagini:** usare gli ID di `assets/scenes.json`, non incollare nuove URL
  direttamente nei file HTML. Le scene hanno versioni desktop e mobile.

Per creare/aggiornare la social card:

```bash
python -m pip install pillow
python tools/build_today_card.py
```

Per aggiungere nuove immagini:

```bash
python tools/add_screenshots.py incoming/
```

Questa utility aggiorna `assets/scenes.json`, i WebP e
`assets/source-hashes.json`, conservato appositamente per rilevare duplicati.

## Countdown, audio e simulatore

La data predefinita del conto alla rovescia è **19 novembre 2026, 00:00, Europa/Roma**,
modificabile dal selettore dei fusi orari. L'impostazione del visitatore è salvata
nel browser. La data è un target del sito fan e non una garanzia dell'orario di
uscita globale.

Per vedere il simulatore delle milestone senza cambiare l'orologio reale:

https://ryzexfn750.github.io/the-final-wait/?preview=1

L'audio ambientale principale è `assets/audio/background-v26.mp3`, con
`background-live.mp3` come **fallback intenzionale**: non cancellarlo come se
fosse una vecchia traccia inutilizzata. La musica ambientale sfuma prima dei
-30 minuti. Il sistema di finale usa le sue tracce audio dedicate. Alcuni browser
richiedono un'interazione dell'utente prima di consentire la riproduzione.

## Test e pubblicazione

Servono Node.js 22+ e Python per verificare il progetto:

```bash
node --test tests/*.test.mjs
python -m py_compile tools/add_screenshots.py tools/build_today_card.py
```

I test includono integrità dei link locali, riferimenti alle risorse, struttura
di ogni pagina, scene, eventi del countdown e regressioni del finale.

GitHub Actions esegue i test automaticamente sulle pull request e sui push a
`main`. Pubblicare tramite una pull request, controllare l'esito della pipeline
e verificare il deploy di GitHub Pages prima di considerare la versione pronta.
I test automatici non sostituiscono la verifica visiva in browser del finale.

## Disclaimer

Questo è un progetto fan non ufficiale, senza affiliazione o approvazione di
Rockstar Games o Take-Two Interactive. Marchi e immagini appartengono ai
rispettivi titolari.
