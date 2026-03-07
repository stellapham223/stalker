# UX/UI Design Decisions

This file logs important UX/UI design decisions made by the UX Designer agent. Other agents should reference this file when their work involves UI-related changes.

---

## [2026-03-06] Initial Design System Baseline
**Agent:** UX Designer
**Decision:** Documented the current design system state as the baseline for future improvements.
**Rationale:** Need a clear starting point to track design evolution and ensure consistency.
**Current state:**
- shadcn/ui New York style with neutral base color
- 2 UI components: Button (6 variants), Card (compound)
- HSL design tokens in globals.css (light mode only)
- Known gaps: no dark mode, hardcoded colors in pages, missing Input/Table/Tabs/Dialog/Skeleton components
- Loading states are plain text, empty states are minimal
**Affected files:** `apps/web/app/globals.css`, `apps/web/components/ui/`

---

## [2026-03-06] UX Review — Overall Layout & UI Writing
**Agent:** UX Designer
**Decision:** Comprehensive UX review identified 12 issues across layout, UI writing, and design system consistency.
**Key findings:**
1. **CRITICAL — Mixed language (Vi/En):** Login, admin, unauthorized pages use Vietnamese; sidebar, feature pages, dashboard use English. Must standardize to one language.
2. **CRITICAL — Mislabeled button:** Guide Docs page says "Add Competitor" (copy-paste error), should be "Add Guide".
3. **WARNING — Hardcoded colors:** `bg-red-500`, `text-green-600`, `border-amber-500`, etc. used instead of design tokens across sidebar badges, tab active states, diff displays, and status dots.
4. **WARNING — No loading skeletons:** All pages use plain `<p>Loading...</p>` instead of skeleton loaders.
5. **WARNING — Raw HTML inputs:** Forms use raw `<input>` with manual styling instead of shadcn Input component.
6. **WARNING — No mobile responsive layout:** Sidebar is fixed `w-64` with no collapsible/drawer behavior for small screens.
7. **WARNING — Tab bar overflow:** No horizontal scroll handling when many tabs are present.
8. **SUGGESTION — No page subtitles:** Feature pages lack descriptive subtitles for new user context.
9. **SUGGESTION — Inconsistent tagline:** Three different taglines across sidebar, login, and meta description.
10. **SUGGESTION — Native confirm() dialogs:** Delete actions use browser `confirm()` instead of shadcn AlertDialog.
11. **SUGGESTION — Sparse dashboard:** Main dashboard doesn't reflect the 6 feature areas.
12. **SUGGESTION — No dark mode tokens:** Only light theme defined in globals.css.
**Rationale:** These issues collectively degrade polish, accessibility, and new-user comprehension. Mixed language is the most impactful — users encounter a jarring switch between Vietnamese and English depending on which page they're on.
**Affected files:** All page files in `apps/web/app/`, `apps/web/components/sidebar.js`, `apps/web/components/app-shell.js`, `apps/web/app/globals.css`

---

## [2026-03-06] Visual Identity Overhaul — "Deep Ocean" Theme
**Agent:** UX Designer
**Decision:** Complete visual redesign with "mysterious + technology" aesthetic. Implemented the "Deep Ocean" palette (deep navy-black + electric cyan) with both dark and light mode support.
**Changes made:**
1. **Color palette:** Replaced neutral grayscale with Deep Ocean — navy-black backgrounds (220 25% 6%), electric cyan accents (190 90% 55%). Added semantic tokens for success, warning, info, diffs, and notifications.
2. **Typography:** Added Space Grotesk (body/headings) + JetBrains Mono (code/data) via next/font/google.
3. **Visual effects:** Card glow shadows, button hover glow, breathing pulse animation on login page.
4. **Sidebar:** Glass-morphism (backdrop-blur + transparency), border-left active indicator with cyan highlight instead of solid bg.
5. **Theme switching:** Added `next-themes` for dark/light toggle with Sun/Moon button in sidebar.
6. **Hardcoded colors cleanup:** Replaced ALL hardcoded Tailwind colors (bg-red-500, text-green-600, etc.) with semantic design tokens across all feature pages.
7. **Login page:** Replaced emoji with Lucide Radar icon, added gradient text title, glow animation.
**Rationale:** Deep Ocean chosen over Cyber Violet and Matrix Emerald for best data readability, professional credibility, and natural diff color contrast. Space Grotesk provides technical character without sacrificing readability.
**Affected files:** `apps/web/app/globals.css`, `apps/web/tailwind.config.js`, `apps/web/app/layout.js`, `apps/web/components/providers.js`, `apps/web/components/sidebar.js`, `apps/web/components/ui/card.js`, `apps/web/components/ui/button.js`, `apps/web/app/login/page.js`, all `_components/` files across feature pages, `docs/design-system.md`

---

## [2026-03-07] Full UX Review — All Pages Against Brand Guideline v1.0
**Agent:** UX Designer
**Decision:** Comprehensive UX review of all pages against the newly created brand guideline. Reviewed 30+ files across login, dashboard, 6 feature pages, admin, user guide, competitors, changes, and shared components.

**Overall assessment:** The Deep Ocean visual identity is well-implemented. Design tokens are used correctly across ~98% of the codebase. Typography, layout patterns, and semantic HTML are consistent. The main gaps are in component states and interaction patterns.

**Issues found (7 categories, ~40 instances):**

1. **CRITICAL — Loading states still use plain text (12 files)**
   All pages show `<p>Loading...</p>` instead of skeleton placeholders. This was flagged in the 2026-03-06 review but not yet fixed.
   Files: All `page.js` files + `dashboard-tab.js` + detail components across all 6 features, plus admin, changes, competitors pages.

2. **CRITICAL — Browser confirm() for destructive actions (8 files)**
   All delete actions use native `confirm()` instead of a proper AlertDialog component. Affects every feature page + admin + competitors.

3. **WARNING — Tab close buttons not semantic + missing aria-label (6 files)**
   Delete "x" in tab-button.js uses `<span onClick>` instead of `<button>`, and has no `aria-label`. Affects all 6 feature tab-button components.

4. **WARNING — Empty states incomplete (8+ files)**
   Dashboard tabs and detail views show text-only empty states without the full icon + heading + description + CTA pattern.

5. **WARNING — Hardcoded `text-white` in badge (6 files)**
   Tab-button badge notification uses `text-white` instead of `text-destructive-foreground`. Minor but violates token rule.

6. **SUGGESTION — Unauthorized page uses emoji instead of Lucide icon**
   `unauthorized/page.js` uses emoji instead of Lucide icon, and doesn't use Button component.

7. **SUGGESTION — Inconsistent date formatting**
   Some files use `toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })`, others use bare `toLocaleString()`.

**What's working well:**
- Design tokens: ~98% compliance (only Google OAuth SVG colors are hardcoded, which is intentional)
- Typography hierarchy: consistent text-3xl/text-sm/text-xs scale
- Semantic HTML: proper table/button/form usage
- Diff visualization: correct use of --diff-add/--diff-remove tokens
- Table patterns: proper headers, hover states, overflow handling
- Button labels: specific action verbs ("Add Competitor", "Scrape All", etc.)
- Language: 100% English UI (mixed language issue from 2026-03-06 is resolved)
- Sidebar: excellent accessibility, proper aria-labels, glass-morphism, consistent nav pattern
- Login page: strong branded experience with gradient text, glow animation, clear error states

**Affected files:** All page and component files across the app
**Cross-refs:** See TASK-001 through TASK-004 in docs/tasks.md for developer handoff
