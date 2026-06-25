# Shelf — Product Brief 2.0

A second iteration of the Shelf reading/watch list app, responding to tutor feedback after the v1 deploy. The app is built (Vite + React + TypeScript, deployed to Vercel, data in localStorage, Open Library + TMDB for metadata, a ported JS fit engine). This brief defines the changes for v2 — it does not re-spec the existing app, only what changes.

Work the sections roughly in order: fix correctness and UX issues first (4, 2, 5), then the identity redesign (3) and onboarding (1), then the new feature (6) and dev tooling (7).

---

## How to work through this brief — read first

**Do one thing at a time. Do not batch.** Work through this brief **one section at a time, in order**, and within each section **one discrete change at a time**. Fully complete and verify a step before starting the next. Do not jump ahead, and do not combine multiple sections or fixes into a single sweeping change — that is how specifics get jumbled and regressions slip in.

For every step:

1. State which single step you are about to do.
2. Make only that change.
3. Verify it (build still passes, the specific behaviour now works, nothing else broke) and show the result.
4. **Stop and wait for my review** before moving to the next step.

If you discover something out of scope or a change would affect another area, **pause and tell me** rather than fixing it inline. Keep each change small, isolated, and reviewable. Slow and correct beats fast and tangled.

---

## 1. Onboarding — explain the app in the Library empty state

**Decision:** the explanation lives in the Library page's empty state — the screen shown when no titles have been added (currently the "Set up your taste profile…" message).

Expand that empty state into a proper, on-brand explainer that does three things:

- **Says what Shelf is** in a sentence or two: a personal place to track books, films, and shows you want to start, are partway through, or have finished — with automatic cover art and metadata, and a taste-based "fit" check on everything you consider adding.
- **Shows the three core actions** briefly: track across Want to / In progress / Finished; get a fit verdict against your taste profile as you search; record progress, rating, and notes.
- **Gives two clear calls to action:** "Set up your taste profile" and "Add your first title" (the latter opens the add/search flow).

It must be styled in the v2 visual identity (see §3), not a plain text block, and should disappear naturally once the library has items. No separate About page is needed.

---

## 2. UI fixes — overlap and overflow

Two concrete defects the tutor flagged, plus a sweep for the same class of issue:

- **Cards overlap when hovered.** The dock-magnification effect grows a tile so it collides with neighbours. Fix so a hovered/magnified card renders cleanly above others without displacing or clipping them: reduce the magnification scale, set an appropriate `transform-origin`, raise `z-index` on hover, and ensure row spacing accommodates the grown state. The grid must never look broken mid-hover.
- **Popups/modals run off-screen.** The detail/edit modal (and any other overlay) can extend past the viewport. Fix so every overlay is constrained to the viewport: max height with internal scrolling, centered and responsive positioning, and safe margins on small screens. Test at narrow widths.
- **Sweep:** check all hover states, dropdowns, tooltips, and overlays for the same overlap/overflow problems and fix consistently.

---

## 3. Visual identity — distinctive, dark, motion-led (SUI-inspired)

**Decision:** retire the glassmorphism/frosted-glass treatment. Move to a dark, characterful, motion-led identity inspired by the Sui site (sui.io — Awwwards Honorable Mention). Character comes from a confident dark canvas, one electric accent, a signature illustrated motif, and well-crafted motion — not from frosted glass. The app's own cover art remains the richest colour and visual; the design's job is to *frame* it with character, never compete with it.

Reference: **https://www.sui.io/** (and its Awwwards breakdown). Study its hover interactions, main navigation, custom illustrations, intro loader, and gradient transitions, and emulate that *character* — adapted to a personal media-tracking app.

### Palette
- **Canvas:** near-pure black `#000000` (with very slightly raised near-black surfaces for cards/panels, e.g. `#0A0A0B`, for subtle separation without glass).
- **Accent:** a single electric blue `#298DFF`, used deliberately and sparingly — active nav, primary actions, the loader, key highlights, focus states, hover edges.
- **Neutrals:** a disciplined grayscale ramp for text and borders.
- **Type colours (reconciliation):** the previous Books/Films/Shows three-colour system is **demoted**. The single electric-blue accent is the identity. Differentiate types primarily by their existing text **type chip** (neutral), not by three competing hues. In Stats charts, use electric-blue plus neutral grays / blue tints rather than three saturated colours, so the single-accent identity holds. (If type colours are ever wanted back for legibility, keep them as small, muted functional tags only — never the hero.)

### Typography
- Bold, confident hierarchy: large expressive headings (build on the existing serif "Shelf" wordmark), paired with a clean, modern sans for UI and body. Strong scale contrast between display and UI text. Generous spacing and an authored, intentional layout rhythm.

### Signature character — the blob mascot
A soft, gradient electric-blue **blob mascot** is Shelf's recurring character. Its identity comes from *material behaviour and motion* (squash, stretch, settle, morph) rather than a fixed face — SUI's "identity through behaviour, not features" principle, applied with warmth. Build it as **one base rig** (a single SVG shape) and get all personality from **motion curves and context**, never by redrawing a new character per use — this is the only way it stays maintainable.

**Where the mascot appears (scoped deliberately):**
- **Persistent companion (Tamagotchi-style)** — the mascot lives in the app as a small ambient pet (see below). This is the primary use.
- **Intro loader** — the mascot morphs (blob → page → reel → screen) beside the wordmark. See the loader section.
- **Empty states** — the mascot carries the moment where there's no cover art: e.g. peering with a small light into an empty shelf ("nothing added yet"), or with a magnifier for no search results.
- **Milestone moments (one-shot)** — a brief celebratory motion (small bounce/confetti) when a meaningful count of titles is finished. Transient only, never persistent.

**Where the mascot must NOT appear:**
- **Not on library cards.** Cards show real cover art as the hero; status is communicated by the clean, legible treatment in §2 (type chip, progress bar, "Finished" indicator) — **not** by a mascot/blob badge.
- Not as a persistent background behind the live grid, and not as per-genre character variants (parked for a possible future pass).

### Persistent companion (Tamagotchi-style)
The same blob rig lives in the app as a small, friendly companion that makes Shelf feel alive — a light "pet," not a demanding one.

- **Placement:** a small fixed spot in a corner (e.g. bottom-right), present across screens, sized so it never overlaps or competes with cover art or controls. Must be **dismissable/hideable** via a Settings toggle.
- **Interactive, but limited:** clicking/"petting" it triggers a brief one-off reaction (happy wobble/bounce). That is the full extent of interactivity — no feeding, menus, or care chores. Keep it simple and cheap.
- **Gentle mood tied to activity (encouraging, never nagging):** derive a mood from signals already in the data — recent activity date, items in progress, finished count. A small finite set of states driven by motion curves on the one rig, for example:
  - *Perky/active* — when you've recently added, progressed, or finished titles: upright, lively idle.
  - *Sleepy/resting* — when the shelf has been idle for a while: droopy, slow blink, occasional nap. This is a warm, low-key nudge to come back — **never** guilt-inducing language or sad/abandoned framing.
  - *Reactive one-shots* — a little cheer when you add a title, a contented settle when you finish one, the milestone celebration above.
- **Restraint:** motion is **occasional/idle**, not constant; no sound; never blocks interaction. Honour `prefers-reduced-motion` (settle to a calm static state). It should be easy to ignore for users who just want the utility.
- Built from the single base rig — moods and reactions come from motion curves and context, never new drawings.

**Build approach:** scalable SVG; for the loader morph use a free path-morphing approach (e.g. flubber or hand-authored morph states), not a paid library. Keep shapes simple enough to animate cheaply, and honour `prefers-reduced-motion` (settle to a static state).

Custom illustration is otherwise **light-touch by intent** — it appears only where there's no cover art (loader, empty states, iconography). Covers carry the visuals everywhere else.

### Intro loader (every load)
- A short branded intro loader on **every** app open: the Shelf wordmark + morphing blob mascot animating in over the black canvas with the electric-blue accent, resolving into the app via a smooth **gradient transition** (SUI-style).
- Keep it brief (~1–1.5s) so frequent opens never feel slow; ensure it never blocks interaction longer than necessary, and **skip/shorten it when `prefers-reduced-motion` is set**.

### Hover interactions (library cards) — emulate SUI, contained
Recreate the *feel* of SUI's hover work, but contained so it can never overlap or clip neighbours (the defect from §2):
- Smooth, eased motion (custom cubic-bezier, ~250–400ms) — cursor-aware where it adds polish.
- On hover: a contained response within the card's own bounds (subtle scale/parallax of the cover toward the cursor), title/metadata/fit **fading or sliding up** over the cover, and an electric-blue edge/glow highlight.
- Optionally dim/recede non-hovered cards slightly to focus attention (SUI-like) — via opacity, **not** by growing the hovered card past its neighbours.
- No tile may displace, overlap, or clip another at any point in the hover. Validate against §2.
- Note: precise frame-for-frame cloning of SUI's hover isn't possible from static reference; build a close, well-crafted equivalent and use the live site as the qualitative benchmark.

### Constraints
- Cohesive system: one type scale, one accent, consistent spacing and a single motion language across every screen (nav, Library, cards, detail panel, search/add, Settings, Stats).
- Performance and accessibility: GPU-cheap effects (transform/opacity), avoid jank, and honour `prefers-reduced-motion` for the loader, hover motion, and any ambient animation.

Deliverable: apply across all screens, then run the impeccable skill as a cohesion pass. Update DESIGN.md to reflect this new direction (the glass language is retired).

---

## 4. Fit engine — fix genre matching (correctness bug)

The tutor added a book tagged "Science-fiction" while "sci-fi" was a preferred genre, and got Partial fit because the genres didn't match. This is a genre-vocabulary mismatch between sources and the profile.

Fix the matching so equivalent genres are treated as equal:

- **Normalize before comparing:** lower-case, trim, and strip punctuation/spacing differences (so "Science-fiction", "Science Fiction", and "sci-fi" all reduce to the same key).
- **Synonym/alias map:** maintain a small mapping of common equivalents across TMDB genres, Open Library subjects, and the profile's vocabulary — at minimum sci-fi / science fiction / science-fiction, and other obvious pairs (e.g. "kids"/"children", "rom-com"/"romance"). Keep it in one editable config.
- Apply this normalization everywhere genres are compared in the fit engine (preferred and avoided lists) and anywhere genres are displayed/grouped (e.g. Stats "Top genres").
- **Add unit tests** covering the "Science-fiction" vs "sci-fi" case and a few other aliases, so the regression can't return. Re-run the full fit-engine suite.

This affects verdict accuracy, so do it first.

---

## 5. Full QA pass — every page, every feature

Do a deliberate run-through of the whole app and confirm each feature works as intended, consistently. Report anything that fails; fix and re-verify.

- **Build & tests:** `npm run build` completes clean; fit-engine tests pass.
- **Library:** grid renders, status treatments (Not started / In progress / Finished) correct and consistent, filters and sort all work, recommendations row works (see §6).
- **Add/Search:** book (Open Library), film and show (TMDB) all return results with covers; fit badge computes live and is correct given the profile; adding freezes the verdict and sets status.
- **Detail panel:** opens within viewport, status change, progress update (books pages, shows season/episode with valid data and percentage), rating (typed 0–10 + golden-star visual), notes — all save and persist across reload.
- **Settings:** taste profile defines/edits, persists across reload, and actually drives fit verdicts.
- **Stats:** year picker, totals, per-type colours, activity, top genres, highest rated, prediction accuracy, pages & hours, surprises, notes & lessons — all render from real data with graceful empty states.
- **Data integrity:** covers match their titles; metadata is sourced, not placeholder.
- **Cross-cutting:** no console errors on any view; responsive at narrow widths; reduced-motion respected.

For high confidence, consider a structured pass that records a pass/fail per feature.

---

## 6. New feature — recommendations on the Library tab

**Decision:** add history-based recommendations surfaced on the Library (home) tab. One feature, done well.

- **Placement:** a "Recommended for you" section on the Library tab (e.g. a row/strip above or alongside the grid), unobtrusive and dismissable, hidden when there isn't enough history to recommend from.
- **Logic:** seed recommendations from the user's **finished, highly-rated** items and their **taste profile**:
  - Films/shows: use TMDB's recommendations/similar endpoints seeded from the user's top-rated finished titles.
  - Books: use Open Library by shared subjects/authors of top-rated finished books.
- **Filter through the fit engine:** run each candidate through `evaluateFit` against the current profile and prefer Good (and strong Partial) fits; show the fit badge on each recommendation.
- **Exclude** anything already on the shelf (any status).
- **Action:** each recommendation is addable directly (same add flow), and shows why it's suggested in a short line (e.g. "Because you rated Dune highly" / "Matches your sci-fi preference").
- **Empty/cold-start:** if there's no usable history yet, hide the section or show a gentle prompt to finish and rate a few titles first.

Keep it client-side and resilient to API/no-key failures (degrade quietly, like the rest of the app).

---

## 7. Dev-only sample data

**Decision:** a hidden, developer-only way to populate the shelf for testing — not a visible end-user button.

- Trigger via a URL flag (e.g. `?dev` or `?seed`) or a small dev menu, not a button in the normal UI.
- Populates a spread of realistic sample titles across types and statuses (with progress, ratings, notes, and frozen fit verdicts) so all views — including Stats and recommendations — have something to show.
- Include a matching "clear all" so the shelf can be reset to empty.
- Must never appear for normal users and must not affect the clean empty start (seed remains `items: []`).

---

## Acceptance criteria (v2)

- A "Science-fiction" book reads as a genre match against a "sci-fi" preference (Good fit if other criteria pass); alias tests pass.
- Hovering any card never causes overlap, clipping, or layout breakage; no modal extends off-screen at any width.
- The Library empty state clearly explains the app and offers "Set up taste profile" and "Add your first title".
- The app reads as a distinctive, intentional design — dark canvas, single electric-blue accent, motion-led — cohesive across all screens; the glassmorphism is fully retired.
- The blob mascot works as a dismissable Tamagotchi-style companion with limited petting interaction and gentle activity-based moods, and also powers the loader and empty states; it never appears as a card status badge, and respects reduced-motion.
- A QA run confirms every page/feature works, with a pass/fail recorded per feature; build and tests are green.
- The Library tab shows relevant, fit-checked recommendations drawn from finished/highly-rated history, excluding items already on the shelf.
- Sample data can be loaded and cleared via a hidden dev trigger only.

## Process notes

- Same stack and constraints as v1; no backend, data stays in localStorage, seed stays empty.
- Changes deploy automatically on push to GitHub (Vercel). After deploy, re-verify the live site: add a title, reload (persistence), and refresh on `/stats` (if it 404s, add the `vercel.json` SPA rewrite). Confirm `VITE_TMDB_API_KEY` is still set in Vercel for Production and Preview.
- Build phase by phase and pause for review between the major items, as in v1.
