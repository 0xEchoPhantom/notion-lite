# Dark Mode Strategy and QA Plan (Tailwind v4)

This document defines a complete, testable plan to make dark mode fully reliable across the app before writing further code.

## Goals
- Manual toggle reliably switches all UI between light/dark without FOUC.
- All text has sufficient contrast in dark mode (WCAG AA target).
- No hard-coded light colors that ignore dark mode.
- Works with Tailwind v4 and the current Next.js/React setup.

## Activation Model
- Primary selector: the `.dark` class on the `<html>` element.
- Optional attribute: `data-theme="dark|light"` on `<html>` for custom CSS variables and non-Tailwind styles.
- Implementation sources:
  - Early boot (inline in `<head>`): `ThemeScript` sets `.dark`, `data-theme`, and `color-scheme` before paint to avoid FOUC.
  - Client toggles: `ThemeContext` mirrors the same logic and persists `localStorage.theme`.

## Tailwind v4 Dark Variant
- Default Tailwind v4 uses prefers-color-scheme. Our app uses manual toggle via `.dark`.
- Two acceptable options:
  1) Rely on Tailwind’s `dark:*` utilities with `.dark` class activation (recommended).
  2) Define a custom dark variant in CSS using `@custom-variant dark (&:where(.dark, .dark *))` (optional)
     - Note: Some editors warn on `@custom-variant`; Tailwind v4 processes it during CSS build.

## Design Tokens (CSS Variables)
Use custom properties for global foreground/background so most text can inherit:

- Light
  - `--background`: `#ffffff`
  - `--foreground`: `#0f172a`
- Dark
  - `--background`: `#0f172a`
  - `--foreground`: `#f1f5f9`
- Apply on `html`/`body`: `background: var(--background); color: var(--foreground);`
- Keep headings, paragraphs, and default text uncolored when possible to inherit.

## Do/Don’t Rules
- Do: Always pair light utilities with dark counterparts:
  - `bg-white dark:bg-gray-900`
  - `text-gray-700 dark:text-gray-300`
  - `text-gray-900 dark:text-gray-100`
  - `border-gray-200 dark:border-gray-700`
- Do: Prefer inheritance from `body` color for base text.
- Don’t: Use arbitrary light hex without a dark pair (e.g., `bg-[#FBFBFA]` alone).
- Don’t: Force `text-gray-900` everywhere; if used, add `dark:text-gray-100`.

## High-Risk Areas to Audit
- Arbitrary colors: `bg-[#...]`, `text-[#...]`, `border-[#...]`.
- Explicit text colors without dark pair: `text-gray-800`, `text-gray-900`.
- Borders/dividers: `border-gray-200` needs `dark:border-gray-700`.
- Hover/active: `hover:bg-gray-100` needs `dark:hover:bg-gray-700`.
- Disabled/placeholder (forms): add `dark:` variants.
- Overlays/backdrops: ensure `bg-black/30 dark:bg-black/50`.
- Icons using `currentColor`: ensure container text color changes in dark.
- Modals/sheets/dropdowns: background + text + border + shadow.
- TipTap content/placeholder/selection.
- Code blocks and inline code.
- Scrollbars and native controls (`color-scheme`).
- Images/logos: provide dark-capable assets or invert.

## QA Checklist (Routes/Flows)
1) App Workspace (`/app`)
   - Sidebar (desktop/mobile): background, text, hover, dividers.
   - Header/toolbars: background, icons, active states.
   - Content: headings, paragraphs, lists, links.
2) Settings (`/settings` and nested)
   - Toggles, inputs, selects: bg, text, border, focus rings.
   - Helper text, placeholders.
3) Recycle Bin (`/recycle-bin`)
   - Sidebar + list states.
4) Editor (TipTap)
   - Paragraphs, headings, code, quotes, tasks, placeholders.
   - Slash menu, dropdowns, suggestion lists.
5) Dialogs/Toasts/Overlays
   - Backdrop opacity, panel colors, contrast.
6) AI/Chat widgets
   - Message bubbles, meta text (timestamps), input area.

Acceptance per screen:
- No black/dark text on dark backgrounds; contrast meets AA.
- Links and icons are visibly distinct.
- No light-only backgrounds bleeding through.

## Automation Aids
- Grep scans to flag risky patterns (can be added to `scripts/verify-before-push.js`):
  - Arbitrary backgrounds: `bg-\[#` without `dark:` nearby.
  - Darkest text without dark pair: `text-gray-(800|900)` without `dark:text-` nearby.
  - Hover-only light: `hover:bg-gray-100` without `dark:hover:bg-` nearby.
  - Borders: `border-gray-200` without `dark:border-` nearby.

## Implementation Plan (Phased)
1) Foundation (no visual breakage)
   - `ThemeScript` sets `.dark`, `data-theme`, and `color-scheme` before paint.
   - `ThemeContext` mirrors these on mount/toggle and persists to localStorage.
   - `globals.css` ensures variables and `color-scheme` are defined for both themes.
   - Decide on `@custom-variant` usage; keep simple with `.dark` only unless needed.
2) Tokenize base text
   - Let `body` color drive default text; remove redundant `text-gray-900` where safe.
3) Component passes (by directory)
   - UI sidebars/headers/modals: add dark variants for bg/text/border/hover.
   - Workspaces (GTD/Notes): content wrappers and page headers get dark variants.
   - TipTap styling for content/placeholder/selection.
4) Hardening
   - Run grep scan; fix remaining offenders.
   - QA checklist across all routes/states.

## Known Pitfalls & Fixes
- Editor CSS may override utilities → scope `.tiptap` dark styles.
- Third-party components may default to light → wrap with containers that set `text-*` for inheritance.
- Focus outlines were removed globally → reintroduce accessible focus rings in both themes on interactive elements.

## Definition of Done
- Toggle switches every targeted surface without flashes.
- QA checklist passes; grep scan shows no critical offenders.
- No new TS errors introduced.

---

Once you approve this plan, we’ll execute Phase 1–3 in small patches and validate each with the QA checklist, then add a minimal grep check in the verify script.
