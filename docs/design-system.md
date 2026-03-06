# Design System — Competitor Stalker

## Theme: "Deep Ocean"

Dark-first design with deep navy-black backgrounds and electric cyan accents. Supports dark (default) and light modes via `next-themes`.

## Color Tokens

Defined in `apps/web/app/globals.css` using HSL format. Dark mode is `:root`, light mode is `.light` class.

### Core Tokens (Dark / Light)

| Token | Dark (HSL) | Light (HSL) | Usage |
|---|---|---|---|
| `--background` | 220 25% 6% | 210 20% 98% | Page background |
| `--foreground` | 210 10% 90% | 220 25% 10% | Primary text |
| `--card` | 220 20% 9% | 0 0% 100% | Card background |
| `--card-foreground` | 210 10% 90% | 220 25% 10% | Card text |
| `--popover` | 220 20% 10% | 0 0% 100% | Popover background |
| `--popover-foreground` | 210 10% 90% | 220 25% 10% | Popover text |
| `--primary` | 190 90% 55% | 190 90% 40% | Electric cyan accent |
| `--primary-foreground` | 220 30% 6% | 0 0% 100% | Text on primary |
| `--secondary` | 220 15% 15% | 210 15% 93% | Secondary surfaces |
| `--secondary-foreground` | 210 10% 85% | 220 25% 15% | Text on secondary |
| `--muted` | 220 15% 13% | 210 15% 95% | Hover/subtle backgrounds |
| `--muted-foreground` | 220 10% 55% | 220 10% 45% | Secondary text |
| `--accent` | 190 90% 55% | 190 90% 40% | Same as primary |
| `--accent-foreground` | 220 30% 6% | 0 0% 100% | Text on accent |
| `--destructive` | 0 72% 55% | 0 84% 60% | Destructive actions |
| `--destructive-foreground` | 0 0% 100% | 0 0% 100% | Text on destructive |
| `--border` | 220 15% 18% | 210 15% 88% | Borders |
| `--input` | 220 15% 20% | 210 15% 88% | Input borders |
| `--ring` | 190 90% 55% | 190 90% 40% | Focus ring |

### Semantic Tokens

| Token | Usage | Tailwind class |
|---|---|---|
| `--success` | Positive states, active dots | `bg-success`, `text-success` |
| `--warning` | Warnings, attention needed | `bg-warning`, `text-warning` |
| `--info` | Informational badges | `bg-info`, `text-info` |
| `--diff-add` / `--diff-add-foreground` | Added content in diffs | `bg-diff-add`, `text-diff-add-foreground` |
| `--diff-remove` / `--diff-remove-foreground` | Removed content in diffs | `bg-diff-remove`, `text-diff-remove-foreground` |
| `--badge-notification` | Notification count badges | `bg-badge-notification` |
| `--glow` | Glow/shadow effects | Used in utility classes |

## Typography

### Font Stack
- **Primary (body + headings):** Space Grotesk — geometric sans-serif with technical character
- **Monospace (code, diffs, data):** JetBrains Mono — excellent character distinction
- Loaded via `next/font/google` in `apps/web/app/layout.js`

### Scale

| Level | Classes | Font |
|---|---|---|
| Page title | `text-3xl font-bold` | Space Grotesk |
| Section title | `text-lg font-bold` | Space Grotesk |
| Body | `text-sm` | Space Grotesk |
| Small | `text-xs` | Space Grotesk |
| Code/Diff | `font-mono text-sm` | JetBrains Mono |
| Data numbers | `font-mono text-sm tabular-nums` | JetBrains Mono |

## Visual Effects

### Utility Classes (defined in globals.css)
- `.card-glow` — subtle cyan box-shadow on cards (default on Card component)
- `.btn-glow` — glow effect on primary button hover
- `.animate-glow` — breathing pulse glow animation (used on login card)

## Components

### Available (shadcn/ui)
- **Button** — 6 variants (default with glow, destructive, outline, secondary, ghost, link), 4 sizes
- **Card** — Compound: Card (with card-glow), CardHeader, CardTitle, CardContent

### Needed (not yet installed)
- Input, Table, Tabs, Dialog, Tooltip, Skeleton, Toast

## Layout Patterns

### Sidebar Navigation
- Width: `w-64`, glass effect: `bg-card/80 backdrop-blur-sm`
- Active: `bg-primary/15 text-primary border-l-2 border-primary`
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Theme toggle (Sun/Moon) in footer
- Notification badges: `bg-badge-notification`

### Page Tabs (active/inactive)
- Active: `border-primary text-primary bg-primary/15`
- Inactive: `border-transparent text-muted-foreground hover:text-primary hover:border-primary/50`

### Tables
- Header: `bg-muted/50 text-left text-sm font-medium`
- Rows: `border-b hover:bg-muted/50`
- Cells: `px-4 py-3 text-sm`

## Spacing Convention
- Page padding: `p-6` (applied by AppShell)
- Section gaps: `space-y-6`
- Card internal: `p-6` (default CardContent)
- Form gaps: `gap-2` or `gap-4`
- Table cell padding: `px-4 py-3`

## Theme Switching
- Package: `next-themes` (in `apps/web/components/providers.js`)
- Default: dark mode
- Toggle: Sun/Moon button in sidebar footer
- CSS: `:root` = dark, `.light` = light mode
