# Brand Guideline — Competitor Stalker

> This document is co-owned by **Mina Nakamura** (UX Designer) and the **Product Owner**.
> All brand decisions should be logged here using the standard decision format.

---

## 1. Brand Essence

### Mission
Help Shopify app developers stay ahead by surfacing competitor changes they'd otherwise miss — automatically, daily, without the manual grind.

### Brand Promise
"We watch so you don't have to." — Competitor Stalker gives you the intelligence advantage without the time cost.

### Brand Values

| Value | What it means in practice |
|-------|--------------------------|
| **Reliability** | The tool runs every day, never misses a change. Users trust it like a morning newspaper. |
| **Clarity** | Data is presented cleanly — no clutter, no confusion. Every screen answers a clear question. |
| **Insight** | We don't just show raw data. We highlight what changed and why it matters (diffs, badges, alerts). |
| **Discretion** | Like a good detective — powerful but quiet. The tool works in the background without demanding attention. |

### Brand Personality
If Competitor Stalker were a person, they'd be:

- **The Quiet Analyst** — calm, observant, always prepared with the right data at the right time
- **Professional but not corporate** — speaks plainly, avoids jargon, gets to the point
- **Trustworthy** — consistent, predictable, never alarming without reason
- **Subtly sharp** — the detective metaphor (favicon trench coat character) reflects this: smart, watchful, a step ahead

**Competitor Stalker is NOT:** flashy, aggressive, gamified, or social. It's a precision tool, not a marketing platform.

---

## 2. Visual Identity

### Theme: "Deep Ocean"
The Deep Ocean theme communicates depth, intelligence, and calm professionalism. Dark mode is default — it suits the monitoring/analytics use case and reduces eye strain during long data review sessions.

**Why Deep Ocean:** Chosen over Cyber Violet (too playful) and Matrix Emerald (too hacker-aesthetic). Deep Ocean balances professional credibility with visual distinction. The navy-black background lets data breathe, while electric cyan draws attention to what matters.

### Color Palette

#### Primary Colors
| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--primary` | `190 90% 55%` (electric cyan) | `190 90% 40%` | CTAs, active states, links, key data |
| `--background` | `220 25% 6%` (navy-black) | `210 20% 98%` | Page backgrounds |
| `--card` | `220 20% 9%` | `0 0% 100%` | Card surfaces, elevated content |
| `--foreground` | `210 10% 90%` | `220 25% 10%` | Primary text |

#### Semantic Colors
| Token | Purpose | Usage |
|-------|---------|-------|
| `--success` | Positive outcomes | Additions in diffs, successful scrapes |
| `--warning` | Caution states | Stale data, approaching limits |
| `--destructive` | Danger/removal | Delete actions, removals in diffs, errors |
| `--info` | Neutral information | Metadata badges, informational callouts |
| `--muted` | De-emphasized | Secondary text, disabled states, borders |

#### Diff Colors
| Token | Purpose |
|-------|---------|
| `--diff-add` / `--diff-add-foreground` | Content additions (green family) |
| `--diff-remove` / `--diff-remove-foreground` | Content removals (red family) |

**Rules:**
- NEVER hardcode Tailwind colors (no `bg-red-500`, `text-green-600`, `bg-purple-50`)
- ALWAYS use semantic design tokens from `globals.css`
- When you need a new color purpose, create a new semantic token — don't reuse an existing one for a different meaning

### Typography

| Font | Variable | Usage |
|------|----------|-------|
| **Space Grotesk** | `--font-sans` | All headings, body text, UI labels |
| **JetBrains Mono** | `--font-mono` | Code snippets, data values, URLs, monospace content |

**Type Scale:**
| Style | Class | Usage |
|-------|-------|-------|
| Page title | `text-3xl font-bold` | One per page, top-left |
| Section heading | `text-lg font-semibold` or Card title | Card headers, section labels |
| Body text | `text-sm` | Default content, table cells, descriptions |
| Small text | `text-xs` | Timestamps, metadata, helper text |
| Metric/number | `text-2xl font-bold` | Dashboard stats, counts |

### Iconography
- **Library:** Lucide React
- **Standard size:** `h-4 w-4` (16px) for inline/nav icons
- **Large size:** `h-10 w-10` for hero/empty state icons
- **Style:** Outline (default Lucide style) — consistent with the clean, professional aesthetic
- **Color:** Inherit from parent text color, or use `text-primary` for emphasis

### Logo & Mascot
- **App icon/favicon:** Detective character in fedora/trench coat with glowing eyes — embodies the "stalker" detective metaphor
- **Text logo:** "Competitor Stalker" in Space Grotesk bold, optionally with gradient (`from-primary to-foreground`)
- **Tagline:** "Monitor competitor changes" — used consistently in sidebar and login page

### Visual Effects
| Effect | Class | Usage |
|--------|-------|-------|
| Card glow | `.card-glow` | Subtle elevation on cards |
| Button hover glow | `.btn-glow:hover` | Primary action buttons |
| Breathing pulse | `.animate-glow` | Login page card (sparingly used) |
| Glass-morphism | `bg-card/80 backdrop-blur-sm` | Sidebar |

**Rules:**
- Use glow effects sparingly — they're accents, not defaults
- `.animate-glow` should only be used on single focal elements (e.g., login card)
- Glass-morphism is reserved for persistent navigation (sidebar)

### Spacing & Layout
- **Border radius:** `rounded-md` (`--radius: 0.5rem`) for all interactive elements
- **Card padding:** `p-4` to `p-6`
- **Page padding:** `p-6` or `p-8`
- **Grid gaps:** `gap-4` for card grids, `gap-2` for inline elements
- **Sidebar width:** `w-64` (256px)

---

## 3. Tone of Voice

### Voice Characteristics

| Characteristic | What it means | Example |
|----------------|--------------|---------|
| **Clear** | Say it simply, no jargon | "3 changes found" not "3 differential mutations detected" |
| **Helpful** | Guide the user, don't just report | "No data yet. Click 'Scrape Now' to fetch." not "No data." |
| **Calm** | Don't alarm unnecessarily | "2 competitors need attention" not "WARNING: 2 COMPETITORS CHANGED!" |
| **Respectful** | Never blame the user | "We couldn't reach that URL" not "You entered an invalid URL" |
| **Concise** | Every word earns its place | "Monitor competitor changes" not "A comprehensive tool for monitoring and tracking competitor changes over time" |

### Writing Patterns

**Page titles:** Short, descriptive nouns
- "Keyword Rankings" / "App Listing" / "Guide Docs"

**Button labels:** Action verbs, specific
- "Add Competitor" / "Scrape All" / "View Changes" / "Sign out"
- Never vague: no "Submit", "OK", "Click here"

**Empty states:** Icon + heading + description + CTA
- Heading: what's missing ("No competitors tracked yet")
- Description: what to do next ("Add your first competitor to start monitoring changes")
- CTA: the action button ("Add Competitor")

**Error messages:** What happened + what to do
- "We couldn't scrape this URL. Check that it's a valid Shopify app page and try again."
- "Your email is not authorized. Contact an admin to get access."
- Never technical jargon: no "500 error", "null reference", "timeout exceeded"

**Success feedback:** Brief confirmation
- "Competitor added" / "Scrape started" / "Changes saved"

**Timestamps:** Relative when recent, absolute when old
- "2 hours ago" / "Yesterday" / "Mar 6, 2026"

### Language
- **Primary language:** English (all UI)
- All pages, labels, messages, and microcopy must be in English
- PRD and internal docs may use Vietnamese

---

## 4. UX Writing Principles

1. **Front-load the important word** — "3 changes detected" not "We detected 3 changes in your monitored competitors"
2. **Use the user's language** — "competitor" not "entity", "scrape" not "data extraction job"
3. **Be specific over generic** — "Add Keyword" not "Add Item", "Scrape All" not "Run"
4. **One idea per message** — Don't combine error explanation with recovery steps in one sentence
5. **Progressive disclosure** — Show the summary first, details on demand (diffs expand, details in modals)

---

## 5. Interaction Design Principles

1. **Respect attention** — Only notify for meaningful changes. Badge counts show real diffs, not noise.
2. **Show, don't tell** — Use visual diffs (green/red highlights) over text descriptions of changes.
3. **Predictable patterns** — Every feature page follows the same structure: header with actions, tab bar, content cards.
4. **Instant feedback** — Loading skeletons over blank screens. Optimistic updates where safe.
5. **Graceful degradation** — Empty states guide users forward. Errors explain recovery. No dead ends.
6. **Dark-first, light-ready** — Design for dark mode first (primary use case), then verify light mode works.

---

## 6. Component Patterns

All components follow the shadcn/ui + CVA pattern with `cn()` utility for class merging.

### Page Structure
```
<page>
  <header>  <!-- flex justify-between items-center mb-6 -->
    <h1>Page Title</h1>
    <actions>Add Button | Scrape All Button</actions>
  </header>
  <tabs />  <!-- if multiple views -->
  <content>
    <cards />  <!-- primary content in Card components -->
  </content>
</page>
```

### Card Anatomy
```
<Card className="card-glow">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Navigation (Sidebar)
- Sticky left sidebar, `w-64`
- Glass-morphism background
- Active state: `bg-primary/15 text-primary border-l-2 border-primary`
- Inactive: `text-muted-foreground hover:bg-muted`
- Notification badges: red dot with count

### States Every Component Must Handle
1. **Default** — normal interactive state
2. **Loading** — skeleton placeholder (not "Loading..." text)
3. **Empty** — icon + message + CTA
4. **Error** — descriptive message + recovery action
5. **Hover/Focus** — visible feedback for interactive elements

---

## 7. Accessibility Standards

- **Target:** WCAG 2.1 AA compliance
- **Color contrast:** All text meets 4.5:1 ratio against backgrounds (verified for both themes)
- **Focus indicators:** Visible focus rings using `--ring` token
- **Interactive elements:** Minimum 44x44px touch targets on mobile
- **Labels:** All icon-only buttons must have `aria-label` (e.g., theme toggle)
- **Keyboard navigation:** All interactive elements reachable via Tab, activatable via Enter/Space
- **Screen readers:** Semantic HTML (nav, main, aside, h1-h6), meaningful alt text

---

## Decision Log

_Use this format for each brand decision:_

```
## [YYYY-MM-DD] Title
**Agent:** ux-designer / product-owner
**Decision:** What was decided
**Rationale:** Why this decision was made
**Affected files:** List of files impacted
```

## [2026-03-06] Deep Ocean Theme Adoption
**Agent:** ux-designer
**Decision:** Adopted "Deep Ocean" as the visual identity — navy-black + electric cyan palette with dark mode default
**Rationale:** Deep Ocean chosen for data readability, professional credibility, natural diff color contrast. Dark mode default suits monitoring/analytics use case.
**Affected files:** `apps/web/app/globals.css`, `apps/web/tailwind.config.js`, `apps/web/app/layout.js`, all UI components and pages

## [2026-03-07] Complete Brand Guideline v1.0
**Agent:** ux-designer
**Decision:** Defined complete brand guideline covering: brand values (Reliability, Clarity, Insight, Discretion), personality (The Quiet Analyst), tone of voice (Clear, Helpful, Calm, Respectful, Concise), UX writing principles, interaction design principles, component patterns, and accessibility standards.
**Rationale:** The visual identity was well-implemented but undocumented brand values and voice guidelines risked inconsistency as the product grows. This guideline ensures every new page, feature, and piece of microcopy aligns with the same personality.
**Affected files:** `docs/decisions/brand-guideline.md`
