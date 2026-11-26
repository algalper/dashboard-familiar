# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The repository has no application code yet: no build, lint or test commands exist. Add them here when the first code lands.

The approved PRD is a Claude Doc: https://claude.ai/artifact/2rs4hDuzPc1kHpG3RiJhxi. Read it before building; it holds the detailed decisions summarised below. The screenshots of the reel being recreated are in the project files (`IMG_7175.PNG` to `IMG_7191.PNG`).

## What this is

A family dashboard web app for one shared iPad (latest iPadOS, signed in with Alfonso's Apple ID). No login, a single shared view, zero running cost, minimalist design.

- **All UI text is in Spanish.** Conversation with the owner is in English.
- Left sidebar with six pages: Hoy (home, includes weather), Semana, Compra, Menú, Tareas, Metas.
- Weather for Rincón de la Victoria (Málaga) from Open-Meteo (free, no key, attribution required).
- Weeks start on Monday.
- Out of scope for v1: Thermomix/Cookidoo links, Sunday shopping message, washing-machine reminder, sleep tracking.

## People and ownership

- Labels and colours: Papá (Alfonso) dark blue, Mamá (Alba) creamy light yellow, Sofía (born 1 June) creamy light pink. Items with no owner belong to "Familia".
- Ownership comes from a prefix in the item title within one shared list, e.g. `M devolver chaqueta` → Mamá. Prefixes: `P`, `M`, `S`; none = Familia. Strip the prefix for display.

## Data sources

- iCloud Reminders lists: **"Compra"** (shopping) and **"La Bicholista"** (tasks, milestones, important things).
- One shared iCloud family calendar.
- The dashboard can create calendar events and tasks, not only read them.
- The Menú is typed by hand in the dashboard.

## Sync architecture

Apple Reminders are not reachable over CalDAV (since iOS 13 upgraded reminders), so data flows through an iOS Shortcut rather than a server talking to iCloud directly:

- Static app hosted on GitHub Pages.
- iOS Shortcut "Sincronizar panel" on the iPad and both iPhones reads/writes Reminders and Calendar, without an Apple password. It is triggered by the dashboard's Actualizar button (x-callback; output comes back in `result`), by time-of-day automations on the iPad, and by a "Reminders opened" automation on the iPhones.
- A free Cloudflare Worker + KV acts as the mailbox between Shortcut runs and the page, enabling scheduled hands-off sync. Stay within KV free limits (100k reads / 1k writes per day), so batch writes.

Still unverified on device: matching reminders by list + title + due date, automations running without a confirmation prompt, and that Shortcuts cannot read a reminder's creator/assignee (hence the title-prefix convention).
