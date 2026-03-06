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
