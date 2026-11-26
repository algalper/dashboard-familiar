# Panel familiar

Web app for the family iPad (Alfonso = Papá, Alba = Mamá, baby Sofía, born 1 Jun 2026).
Approved PRD: https://claude.ai/artifact/2rs4hDuzPc1kHpG3RiJhxi — read it before building screens.

## Fixed decisions (from the PRD)

- **UI language: Spanish**, everywhere (labels, dates, errors). Alfonso writes to Claude in English.
- **Zero cost**, no login, minimalist, one shared view. Landscape iPad, large type, big tap targets.
- **Weeks start on Monday** (L M X J V S D). Weekly goals reset Monday 00:00.
- **People and colours** (one colour per person, used everywhere):
  | Person | Label | Colour | Prefix |
  |---|---|---|---|
  | Alfonso | Papá | dark blue `#1F3A68` | `P` |
  | Alba | Mamá | cream yellow `#F3E3A3` | `M` |
  | Sofía | Sofía | cream pink `#F4D3D6` | `S` |
  | everyone | Familia | warm grey `#8A8580` | none |
  Pale colours are tinted backgrounds with dark text.
- **Owner = title prefix**: `P:`, `M:`, `S:` or the letter plus a space (`M devolver chaqueta`). No prefix = Familia. The dashboard hides the prefix and shows the colour. Items created from the dashboard get the prefix automatically. Same rule for calendar events.
- **Apple data**: one shared iCloud family calendar; Reminders lists **"Compra"** (shopping) and **"La Bicholista"** (tasks, Sofía's milestones, errands). Events and tasks can be created from the dashboard.
- **V1 screens** (left sidebar, as in the reel screenshots IMG_7175–IMG_7191): Hoy (home, with weather and air quality for Rincón de la Victoria via Open-Meteo), Semana, Compra, Menú (typed by hand, no Thermomix/Cookidoo), Tareas, Metas. Out: sleep/baby logs, Sunday shopping message, washer alert.

## Sync architecture

Reminders cannot be reached by CalDAV (since iOS 13) and Apple has no web API for them, so:

```
iPad / iPhone Shortcut "Sincronizar panel"  <-->  Cloudflare Worker + KV ("buzón")  <-->  dashboard on GitHub Pages
```

- Only the Shortcut touches Apple data. The Worker never sees an Apple password.
- The Shortcut: fetches `/api/pendientes`, applies them in Reminders, then uploads a plain-text snapshot to `/api/foto?hasta=N` (clears actions up to id N).
- The dashboard reads `/api/estado` and writes taps to `/api/accion`. Every request carries `?clave=` (family key, a Worker secret `CLAVE`; never commit it).
- Reminders are matched by list + title (+ due date later); Shortcuts has no stable reminder id.
- Conflict rule: Reminders wins.
- Actualizar button runs the Shortcut through `shortcuts://x-callback-url/run-shortcut?name=Sincronizar%20panel&x-success=…`.

## Repo layout

- `worker/worker.js` — Cloudflare Worker (pasted into the Cloudflare dashboard editor; KV binding `PANEL`, secret `CLAVE`).
- `docs/` — static site served by GitHub Pages (main branch, `/docs`). Currently the sync test page.

## Working with Alfonso

- One step at a time; ask before assuming anything ambiguous.
- Setup steps for him must be plain, numbered and non-technical (no command line).
