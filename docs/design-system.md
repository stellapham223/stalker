# Design System — Competitor Stalker

## Color Tokens

Defined in `apps/web/app/globals.css` using HSL format:

| Token | Value (HSL) | Usage |
|---|---|---|
| `--background` | 0 0% 100% | Page background |
| `--foreground` | 0 0% 3.9% | Primary text |
| `--card` | 0 0% 100% | Card background |
| `--card-foreground` | 0 0% 3.9% | Card text |
| `--primary` | 0 0% 9% | Primary buttons, active nav |
| `--primary-foreground` | 0 0% 98% | Text on primary |
| `--secondary` | 0 0% 96.1% | Secondary buttons |
| `--secondary-foreground` | 0 0% 9% | Text on secondary |
| `--muted` | 0 0% 96.1% | Muted backgrounds, hover |
| `--muted-foreground` | 0 0% 45.1% | Secondary text, metadata |
| `--accent` | 0 0% 96.1% | Accent backgrounds |
| `--accent-foreground` | 0 0% 9% | Text on accent |
| `--destructive` | 0 84.2% 60.2% | Destructive actions |
| `--destructive-foreground` | 0 0% 98% | Text on destructive |
| `--border` | 0 0% 89.8% | Borders |
| `--input` | 0 0% 89.8% | Input borders |
| `--ring` | 0 0% 3.9% | Focus ring |
| `--radius` | 0.5rem | Border radius |

## Typography

| Level | Classes | Usage |
|---|---|---|
| Page title | `text-3xl font-bold` | Main page heading |
| Section title | `text-lg font-bold` | Card titles, section headers |
| Body | `text-sm` | Default body text |
| Small | `text-xs` | Metadata, timestamps |
| Muted text | `text-muted-foreground` | Secondary information |

## Components

### Available (shadcn/ui)
- **Button** — 6 variants (default, destructive, outline, secondary, ghost, link), 4 sizes (default, sm, lg, icon)
- **Card** — Compound: Card, CardHeader, CardTitle, CardContent

### Needed (not yet installed)
- Input, Table, Tabs, Dialog, Tooltip, Skeleton, Toast

## Layout Patterns

### Page Structure
```
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-3xl font-bold">Page Title</h1>
    <Button>Action</Button>
  </div>
  <Card>
    <CardHeader><CardTitle>Section</CardTitle></CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>
```

### Sidebar Navigation
- Width: `w-64`
- Sticky: `sticky top-0 h-screen`
- Nav items: icon (`h-4 w-4`) + label + optional badge
- Active: `bg-primary text-primary-foreground`
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`

### Tables
- Header: `bg-muted/50 text-left text-sm font-medium`
- Rows: `border-b hover:bg-muted/50`
- Cells: `px-4 py-3 text-sm`

### Notification Badge
- `rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white`

## Spacing Convention
- Page padding: `p-6` (applied by AppShell main area)
- Section gaps: `space-y-6`
- Card internal: `p-6` (default CardContent)
- Form gaps: `gap-2` or `gap-4`
- Table cell padding: `px-4 py-3`
