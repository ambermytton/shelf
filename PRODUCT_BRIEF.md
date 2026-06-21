# Shelf — Product Brief & Build Spec

A personal reading/watch list app for tracking books, movies, and shows you want to start, are partway through, or have finished. It auto-fetches cover art and metadata, tracks your progress/rating/notes over time, and runs a "fit" check against your own taste profile as you search for new titles.

This document is the build brief for Claude Code. It defines the product, the data model, the component architecture, the integrations, and a phased build plan. Build in the order of the phases.

---

## 0. Kicking this off in Claude Code

Suggested first prompt to paste into the Claude Code session:

> Read PRODUCT_BRIEF.md (and design.md, if present). Don't write any code yet — confirm your understanding of the data model and the build phases, flag anything ambiguous or that you'd approach differently, and ask me any questions. Once I confirm, start with **Phase 1 (scaffold) only** and stop for review before moving on.

Working rules for the session:
- **Go phase by phase.** Build the phases in Section 8 in order and pause for review between each. Do not one-shot the whole app — the ordering (persistence → fit engine → search → grid) is deliberate, and one-shotting tends to produce the generic look this project is trying to avoid.
- **Port the fit logic, don't call the Skill.** The `taste-fit-review` Skill runs inside Claude, not in the browser. Reimplement its rule logic as a pure JS function (Section 4). If the `taste-fit-review` or `media-metadata-formatter` Skills are available in the session, use them **only as reference** for the porting and schema-shaping — the running app must not depend on them at runtime.
- **Model:** Sonnet 4.6 is a fine default for this build — the spec is detailed and the work is well-scoped. Switch to a heavier model only if you hit a genuinely tricky design problem.
- **Match filenames exactly** (case-sensitive) when referencing this brief or any companion docs.

---

## 1. Goals & non-goals

**Goal:** a clean, single-user, fully client-side app that makes adding a title nearly effortless (search → metadata auto-fills → fit check → add) and makes reviewing your list pleasant (grid, filters, sort, progress, ratings).

**Non-goals (out of scope for v1):** accounts/auth, multi-user sync, a real backend database, social features, recommendations beyond the taste-fit check.

**Design intent:** intentional, considered UI. No generic dashboard/AI-template look — opinionated typography, restrained color, status communicated through visual treatment rather than loud labels.

---

## 2. Stack & hosting

- **Vite + React** (JavaScript or TypeScript — TypeScript recommended for the data model).
- **Routing:** `react-router-dom` (three routes: Library, Settings, optional Stats).
- **Styling:** CSS Modules or a single design-token CSS file. Avoid a heavy component library so the UI stays bespoke.
- **Hosting:** GitHub repo → Vercel (static SPA build, `vite build` → `dist`).
- **No backend.** Everything runs in the browser.

---

## 3. Data & persistence — read this carefully

You asked whether we can set up a JSON file in the repo that loads each time. Here's the honest constraint and the chosen approach.

**The constraint:** Vercel static hosting is *read-only at runtime*. A browser app can `fetch()` a JSON file that's committed to the repo, but it **cannot write back** to that file on the server. So the repo JSON can only ever be the *starting* data, not the live save file.

**Chosen approach — seed JSON in repo + localStorage at runtime:**

1. Commit a `public/seed-data.json` to the repo. This holds the default taste profile and any starter items (can be empty arrays).
2. On app load: check `localStorage` for saved state.
   - If present → load it (this is the user's live data).
   - If absent (first ever visit) → `fetch('/seed-data.json')`, hydrate state, and write it to `localStorage`.
3. On **every change** (add/edit/delete item, edit profile) → serialize the whole store and write it to `localStorage`. This is the "written back on every change, loaded each time" behavior, just backed by the browser cache instead of a disk file.
4. Provide **Export JSON** and **Import JSON** buttons in Settings. Export downloads the current store as a `.json` file; Import replaces the store from an uploaded file. This gives a real, portable file and a backup path — and lets the user commit an updated `seed-data.json` to the repo by hand if they want a new baseline.

This satisfies the spec's intent (JSON shape, in-memory on load, persisted on change, no database). If true cross-device/server persistence is ever wanted, that's a later upgrade: a Vercel serverless function + a hosted KV store (e.g. Vercel KV). Explicitly out of scope for v1 — note it but do not build it.

### 3.1 Data store shape

```jsonc
{
  "version": 1,
  "tasteProfile": {
    "preferredGenres": ["sci-fi", "literary fiction", "mystery"],
    "avoidGenres": ["horror"],
    "maxBookPages": 450,
    "maxRuntimeMinutes": 150,
    "avoidContent": ["graphic violence", "sexual assault"],
    "minRating": 7.0          // 0–10 scale, normalized across sources
  },
  "items": [ /* Item objects, see below */ ]
}
```

### 3.2 Item shape (unified across types)

```jsonc
{
  "id": "uuid",
  "type": "book" | "movie" | "show",
  "title": "string",
  "creator": "string",        // author OR director/creator
  "year": 2021,
  "coverUrl": "string",       // Open Library or TMDB image URL
  "genres": ["string"],
  "length": {                 // shape depends on type
    "pages": 320,             // books
    "runtimeMinutes": 130,    // movies
    "seasons": 3, "episodes": 24  // shows
  },
  "sourceRating": 7.8,        // 0–10 normalized (TMDB vote_average, or Open Library if available)
  "status": "want" | "in_progress" | "finished",
  "progress": {               // only meaningful when in_progress
    "currentPage": 120,       // books
    "season": 2, "episode": 5 // shows
    // movies: treat as binary; no granular progress
  },
  "fit": {                    // computed at add-time, stored on the card
    "verdict": "good" | "partial" | "poor",
    "reason": "string",
    "matched": ["string"],
    "conflicting": ["string"]
  },
  "userRating": 8,            // 0–10, set when finished
  "notes": "string",
  "addedAt": "ISO date",
  "finishedAt": "ISO date | null"
}
```

A single `Item` type with optional fields keeps the grid uniform. Use a normalized 0–10 rating scale everywhere so `minRating` and `userRating` are directly comparable regardless of source.

---

## 4. The fit check (ported from the taste-fit-review Skill)

The `taste-fit-review` Skill runs inside Claude, not in a browser. Per your decision, **port its rule logic to a pure JS function** so the app is fast, offline, and free to run on every search result.

Implement `evaluateFit(candidate, tasteProfile)` returning the `fit` object above. Mirror the Skill's classification:

- **good** — meets all or nearly all stated criteria.
- **partial** — meets some criteria but conflicts with at least one soft criterion.
- **poor** — conflicts with a *hard constraint*: an explicitly avoided genre, an avoided content theme, or a length/rating limit exceeded by a wide margin.

Rules to implement (each contributes to `matched` or `conflicting`):

1. **Genre — preferred:** candidate shares ≥1 `preferredGenres` → matched. Shares none → soft conflict.
2. **Genre — avoided (hard):** candidate has any `avoidGenres` → conflicting, forces **poor**.
3. **Length (hard-ish):** book `pages > maxBookPages`, or movie/show `runtimeMinutes > maxRuntimeMinutes` → conflicting. Over by a small margin → partial; large margin → poor.
4. **Content to avoid (hard):** any `avoidContent` theme present in metadata → conflicting, forces **poor**. (Theme data is sparse from these APIs — match against TMDB keywords/overview text and Open Library subjects where available; absence ≠ safe, so keep this best-effort and say so in the reason.)
5. **Rating:** `sourceRating < minRating` → soft conflict (partial), not a hard fail.

`reason` should be one or two sentences citing the *specific* criterion (e.g. "Over your 450-page limit at 600 pages; horror is on your avoid list"), not a vague impression.

Put this in `src/lib/fit.js` (or `.ts`) with unit tests — it's the core differentiator and must be deterministic. Keep the rule weights in one config object so they're easy to tune.

> Note for the UI: the fit check supports a decision, it doesn't make it. Always let the user add a "poor fit" title anyway — sometimes breaking your own pattern is the point.

---

## 5. External APIs

### Open Library (books — no key)
- **Search:** `https://openlibrary.org/search.json?q={query}` → use `docs[]`: `title`, `author_name[0]`, `first_publish_year`, `cover_i`, `subject[]` (genres/themes), `number_of_pages_median`.
- **Cover art:** `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg` (no key). Handle missing covers with a placeholder.

### TMDB (movies + shows — key required)
- Key/token to be provided. Store as `VITE_TMDB_API_KEY` in `.env` locally and in Vercel project env vars. **Caveat:** any `VITE_`-prefixed var is bundled into client JS and therefore public. TMDB keys are low-risk, but if that's a concern, a Vercel serverless proxy route is the v2 fix (out of scope now).
- **Search:** `/search/multi` or separate `/search/movie` + `/search/tv`. Map `title`/`name`, `release_date`/`first_air_date` → year, `genre_ids` → genre names (fetch `/genre/movie/list` + `/genre/tv/list` once and cache), `vote_average` → `sourceRating`, `poster_path` → `https://image.tmdb.org/t/p/w342{poster_path}`.
- **Detail (on add):** fetch runtime (movies), seasons/episodes (shows), and keywords (for the content-avoid check).

Wrap both in a small `src/lib/api.js` with a normalizer that returns a common candidate shape `{ type, title, creator, year, coverUrl, genres, length, sourceRating, themes }` so the search UI and `evaluateFit` don't care about the source. Debounce search input (~300ms) and handle empty/error/no-results states.

---

## 6. UI / views

### 6.1 Library (home, `/`)
- Grid of cards, **sorted by status by default** (want → in_progress → finished, or a deliberate order you choose).
- **Card:** cover image, title, creator, year, a type chip (book/movie/show), a small **fit badge** (color-coded dot/pill), and a status treatment (e.g. progress bar for in_progress, rating stars for finished, muted/"queued" styling for want).
- **Controls bar:** filter by status, type, and fit verdict; sort by status, type, rating, or fit. Keep controls compact and quiet.
- **Card click → detail/edit panel** (modal or side panel): change status; for in_progress edit progress (page X of Y, or season/episode); for finished set rating + notes.

### 6.2 Add flow (search)
- Search input with a type toggle (book / movie / show / all).
- Results render as cards with cover, creator, year — **and the fit badge computed live** via `evaluateFit`, with its short reason visible before adding.
- "Add" picks a status (default **Want to**). The computed `fit` is frozen onto the item so the badge persists on the library card.

### 6.3 Settings / taste profile (`/settings`)
- Form to define/edit the taste profile: preferred genres, avoid genres, max book pages, max runtime, content to avoid, min rating.
- Export JSON / Import JSON buttons (Section 3).
- First-run: if no profile exists, route here (or show a first-run prompt) before searching.

### 6.4 Stats / "Year in review" (stretch, `/stats`)
- Totals by type and status, average `userRating`, most common genre, and a **prediction-accuracy** stat: how often the stored `fit.verdict` matched the eventual `userRating` (e.g. "good fit" items that you rated ≥ minRating). Build only after the core app works.

---

## 7. Component map

```
src/
  main.jsx
  App.jsx                 // router + global store provider
  store/
    useStore.js           // state + localStorage load/save (Section 3)
    seed handling
  lib/
    api.js                // Open Library + TMDB fetch & normalize
    fit.js                // evaluateFit() — ported Skill logic (+ tests)
    rating.js             // normalize ratings to 0–10
  components/
    Card.jsx
    FitBadge.jsx
    StatusControl.jsx
    ProgressEditor.jsx
    FiltersBar.jsx
    SearchResultCard.jsx
  views/
    Library.jsx
    AddSearch.jsx
    Settings.jsx
    Stats.jsx             // stretch
  styles/
    tokens.css            // colors, type scale, spacing
public/
  seed-data.json
```

State can be plain React context + `useReducer` (no Redux needed). Every mutating action funnels through one reducer so the localStorage write happens in exactly one place.

---

## 8. Build phases (do in order)

1. **Scaffold:** Vite + React + Router, three empty routes, `tokens.css`, design pass on a single dummy Card.
2. **Store + persistence:** store shape, localStorage load/save, seed-data.json hydration, Export/Import. Verify data survives reload.
3. **Taste profile:** Settings form writing to the store; first-run routing.
4. **Fit engine:** `evaluateFit` + unit tests against the rules in Section 4. Build before search so search can use it.
5. **Search + add:** Open Library and TMDB integration, normalizer, results grid with live fit badges, add-to-list with status.
6. **Library grid:** cards with status treatments, fit badge, detail/edit panel, progress + rating + notes.
7. **Filters & sort:** status/type/rating/fit filtering and sorting.
8. **Polish:** loading/empty/error states, missing-cover placeholders, responsive grid, keyboard niceties.
9. **Stretch — Stats view.**
10. **Deploy:** push to GitHub, import to Vercel, set `VITE_TMDB_API_KEY`, confirm build.

---

## 9. Acceptance checks

- Reloading the page preserves all items and the taste profile.
- Searching a book returns cover + author + year + a fit badge with a specific reason.
- Adding an item freezes its fit verdict onto the library card.
- An avoided-genre title reads **poor**; an over-length-but-otherwise-good title reads **partial**.
- A "poor fit" title can still be added.
- Filters and sort operate on the grid without losing data.
- `fit.js` unit tests pass.

---

## 10. Open items / assumptions

- **TMDB key** to be supplied; app should fail gracefully (clear message) if it's missing.
- **Content-avoid matching** is best-effort given sparse API theme data — surface that uncertainty in the fit reason rather than implying certainty.
- **TypeScript vs JS:** recommended TS for the `Item` model; either is acceptable.
- **Genre vocabulary** differs between Open Library subjects and TMDB genres — keep a small mapping/normalization table so the profile's genre names match both sources.
