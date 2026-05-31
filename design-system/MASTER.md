# CRM Pro Admin — Design System MASTER

> **Single source of truth.** All pages inherit from this file.
> Page overrides live in `design-system/pages/<name>.md`.

---

## 1. Identity

| Attribute | Value |
|-----------|-------|
| **Style** | Modern Minimal Professional |
| **Brand color** | Violet `#3b28cc` |
| **Neutral** | Slate scale |
| **Font** | Heebo — RTL-ready, high legibility at small sizes |
| **Sidebar** | Dark (`#0f172a`) — creates strong visual anchor |
| **Corner radius** | Tight (4–12px) — serious, data-focused |
| **Shadow** | Purple-tinted, very subtle — depth without noise |

---

## 2. Color System

### Brand Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--color-violet-700` | `#3b28cc` | Primary actions, active states |
| `--color-violet-600` | `#5f4fe0` | Primary hover |
| `--color-violet-500` | `#7b6eea` | Sidebar active indicator, secondary accents |
| `--color-violet-50`  | `#f5f3ff` | Primary surface, table header bg |
| `--color-violet-100` | `#ece9fd` | Deep primary surface, selected rows |
| `--color-violet-200` | `#d9d4fb` | Muted surface, borders on hover |

### Surface Hierarchy

| Token | Hex | Use |
|-------|-----|-----|
| `--ds-surface-0` | `#ffffff` | Card, panel, input backgrounds |
| `--ds-surface-1` | `#f8f7ff` | Page / layout background |
| `--ds-surface-2` | `#f0eeff` | Hover states, subtle highlight |
| `--ds-surface-3` | `#e9e6fd` | Selected rows, active cells |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `--ds-text-primary`   | `#0f0a2e` | Main content, headings |
| `--ds-text-secondary` | `#475569` | Labels, secondary info, captions |
| `--ds-text-tertiary`  | `#94a3b8` | Placeholders, disabled hints |
| `--ds-text-disabled`  | `#cbd5e1` | Disabled elements |
| `--ds-text-inverse`   | `#ffffff` | Text on dark/colored backgrounds |

### Status Colors (with surfaces)

| Status | Foreground | Surface | Use |
|--------|-----------|---------|-----|
| Success | `#16a34a` | `#dcfce7` | Paid, active, approved |
| Warning | `#d97706` | `#fef3c7` | Pending, expiring, review needed |
| Error   | `#dc2626` | `#fee2e2` | Failed, expired, rejected |
| Info    | `#3b28cc` | `#f5f3ff` | Informational, in progress |

> **Rule:** Status colors always appear with matching surface backgrounds in tags/badges,
> never on plain white. This ensures WCAG AA contrast.

### Chart Palette (10 colors, colorblind-friendly)

```
1. #3b28cc  violet   (primary)
2. #16a34a  green
3. #0891b2  cyan
4. #d97706  amber
5. #0d9488  teal
6. #1d4ed8  blue
7. #dc2626  red
8. #7c3aed  violet2
9. #ea580c  orange
10. #be185d  pink
```

---

## 3. Typography

**Font:** Heebo (Google Fonts) — loaded at weights 300, 400, 500, 600, 700, 800.
**Fallback stack:** `system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`
**Mono font:** `JetBrains Mono` → for IDs, amounts, timestamps, code.

### Type Scale

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--ds-font-size-6xl` | 48px | 800 | Hero / splash numbers |
| `--ds-font-size-5xl` | 40px | 700 | — |
| `--ds-font-size-4xl` | 32px | 700 | Page hero KPIs |
| `--ds-font-size-3xl` | 28px | 700 | H1 page titles |
| `--ds-font-size-2xl` | 24px | 600 | H2 section headers |
| `--ds-font-size-xl`  | 20px | 600 | H3 card titles |
| `--ds-font-size-lg`  | 18px | 500 | Subheadings |
| `--ds-font-size-md`  | 16px | 400 | Body (large) |
| `--ds-font-size-base`| 14px | 400 | Body default, table cells |
| `--ds-font-size-sm`  | 13px | 400/500 | Secondary text, form labels |
| `--ds-font-size-xs`  | 12px | 500/600 | Tags, badge text, table headers |
| `--ds-font-size-2xs` | 10px | 600 | Badge count, fine print |

### Rules

- **Table headers:** 12px · uppercase · 500 weight · `letter-spacing: 0.07em` · slate-600 color
- **Form labels:** 13px · 500 weight · slate-600 color
- **KPI values:** tabular-nums · bold · tight letter-spacing
- **Amounts/IDs:** mono font · tabular-nums
- **Body line-height:** 1.5 (reading comfort)
- **Heading line-height:** 1.25 (tight, impactful)

---

## 4. Spacing

**Base unit: 4px.** All spacing is a multiple.

```
0.5 →  2px    1 →  4px    1.5 →  6px    2 →  8px
2.5 → 10px    3 → 12px    3.5 → 14px    4 → 16px
5   → 20px    6 → 24px    7   → 28px    8 → 32px
10  → 40px   12 → 48px   14  → 56px   16 → 64px
```

### Patterns

| Context | Value |
|---------|-------|
| Between icon and label in a button | 8px |
| Card body padding | 24px (16px on mobile) |
| Card header padding | 16px 24px |
| Between cards in a grid | 16–24px |
| Page padding desktop | 28px |
| Page padding mobile | 16px |
| Table cell padding (default) | 12px block · 16px inline |
| Table cell padding (compact) | 8px block · 12px inline |
| Form item gap | 20px |
| Section gap (between major blocks) | 32–48px |

---

## 5. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--ds-radius-xs`  | 2px  | Checkbox, small elements |
| `--ds-radius-sm`  | 4px  | Buttons, tags, inputs, menu items |
| `--ds-radius-md`  | 6px  | Select, datepicker, dropdowns |
| `--ds-radius-lg`  | 8px  | Cards (default), alerts |
| `--ds-radius-xl`  | 12px | Modals, notifications |
| `--ds-radius-2xl` | 16px | Large panels (future) |
| `--ds-radius-full`| 9999px | Pills, dots, avatars |

---

## 6. Shadow System

| Token | Value | Use |
|-------|-------|-----|
| `--ds-shadow-xs`   | `0 1px 2px rgba(0,0,0,0.04)` | Tight raised element |
| `--ds-shadow-card` | `0 1px 3px rgba(59,40,204,0.07), 0 1px 2px rgba(59,40,204,0.04)` | Default card elevation |
| `--ds-shadow-sm`   | `0 1px 3px rgba(0,0,0,0.08), ...` | Card on hover |
| `--ds-shadow-md`   | `0 4px 6px rgba(0,0,0,0.06), ...` | Sticky header |
| `--ds-shadow-dropdown` | `0 8px 24px rgba(0,0,0,0.12), ...` | Dropdowns, popovers |
| `--ds-shadow-modal` | `0 24px 48px rgba(0,0,0,0.18), ...` | Modals, drawers |
| `--ds-shadow-focus` | `0 0 0 3px rgba(59,40,204,0.15)` | Focus ring on inputs |

---

## 7. Animation

| Token | Value | Use |
|-------|-------|-----|
| `--ds-duration-fast`   | 100ms | Micro-feedback (button press) |
| `--ds-duration-base`   | 200ms | Default transitions |
| `--ds-duration-slow`   | 300ms | Content transitions, panels |
| `--ds-duration-slower` | 500ms | Page-level transitions |
| `--ds-ease-out`   | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements (default) |
| `--ds-ease-in`    | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |
| `--ds-ease-in-out`| `cubic-bezier(0.4, 0, 0.2, 1)` | State changes |
| `--ds-ease-spring`| `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful reveals (sparingly) |

**Rules:**
- Micro-interactions (hover, press): 100–200ms + ease-out
- Overlay open: 200ms ease-out · Close: 150ms ease-in (exit faster than enter)
- Never animate `width`/`height`/`top`/`left` — use `transform` + `opacity` only
- Always add `prefers-reduced-motion` support (already in global.css)

---

## 8. Z-Index Scale

| Token | Value | Use |
|-------|-------|-----|
| `--ds-z-raised`       | 10  | Floating elements within content |
| `--ds-z-sticky`       | 200 | Sticky headers, column freeze |
| `--ds-z-fixed`        | 300 | Fixed sidebar, navbar |
| `--ds-z-overlay`      | 400 | Drawer backdrops |
| `--ds-z-modal`        | 500 | Modals, dialogs |
| `--ds-z-notification` | 600 | Toast messages |
| `--ds-z-tooltip`      | 700 | Tooltips (always on top) |

---

## 9. Layout

```
┌────────────────────────────────────────────────────────┐
│  Sidebar 248px (fixed, dark)    │  Header 56px (sticky)│
│  --ds-sidebar-bg: #0f172a       │  --ds-surface-0      │
│                                 │                      │
│  Logo: centered, max 120px wide │  Account name        │
│  Menu items: 40px height        │  Notifications       │
│  Active: branded left bar (3px) │  Settings / Logout   │
│  Language switcher at bottom    │                      │
├─────────────────────────────────┴──────────────────────┤
│                Content area                            │
│  Padding: 28px desktop / 16px mobile                  │
│  Max-width: 1440px (wide) · 960px (narrow forms)      │
│  Background: --ds-surface-1 (#f8f7ff)                 │
└────────────────────────────────────────────────────────┘
```

### Responsive breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|---------|
| Mobile | < 768px | Sidebar collapses to drawer (right side) |
| Tablet | 768–1024px | Sidebar visible, content compressed |
| Desktop | > 1024px | Full 248px sidebar, 28px content padding |
| Wide | > 1440px | Content max-width kicks in, centered |

---

## 10. Sidebar Design

| Property | Value |
|----------|-------|
| Background | `#0f172a` (Slate 900) |
| Width | 248px fixed |
| Item height | 40px |
| Item radius | 4px (within 12px margin) |
| Icon size | 16px |
| Icon-label gap | 10px |
| Item margin inline | 12px |
| Item margin block | 2px between items |
| Active bg | `rgba(99,71,221,0.22)` — violet tint |
| Active left bar | 3px solid `#7b6eea`, offset top/bottom 7px |
| Hover bg | `rgba(255,255,255,0.06)` |
| Default text | `rgba(255,255,255,0.65)` |
| Active text | `#ffffff` |
| Border right | `rgba(255,255,255,0.07)` |
| Language switcher | Bottom, 14px padding, dark theme |

---

## 11. Component Patterns

### Data Tables

```
Header:   12px · uppercase · semibold · letter-spacing 0.07em · slate-600
Body:     14px · regular · line-height 1.375
Cell pad: 12px vertical · 16px horizontal (compact: 8/12)
Row hover: --ds-surface-2 (#f0eeff) · transition 100ms
Selected:  --ds-surface-3 (#e9e6fd)
Border:    --ds-border-subtle (#ece9fd)
Header bg: --ds-color-primary-surface (#f5f3ff)
```

### Forms

```
Labels:     13px · medium · slate-600 · margin-bottom 4px
Inputs:     14px · border-radius 6px · 36px height
Focus ring: 0 0 0 3px rgba(59,40,204,0.15)
Error:      12px · red · below field · margin-top 2px
Gap:        20px between form items
Required:   Red asterisk after label
```

### Cards

```
Background:    white (#ffffff)
Border:        1px solid #ece9fd (subtle violet)
Border-radius: 8px
Shadow:        --ds-shadow-card (purple-tinted)
Hover shadow:  --ds-shadow-sm
Padding:       24px body / 16px body (small)
Header:        14px · semibold · 48px height
```

### Status Tags

```
Active/Success: green text on #dcfce7 bg · border #bbf7d0
Warning:        amber text on #fef3c7 bg · border #fde68a
Error/Expired:  red text on #fee2e2 bg · border #fecaca
Info:           violet text on #f5f3ff bg · border #d9d4fb
Neutral:        slate-600 text on slate-100 bg

All: 12px · medium · border-radius 4px · padding 0 6px
```

### KPI / Stat Cards

```
Layout:      3–4 per row on desktop · 2 on tablet · 1–2 on mobile
Value:       32px · extrabold · tight letter-spacing · tabular-nums
Label:       12px · medium · uppercase · caps letter-spacing · slate-600
Delta:       13px · green/red with arrow icon · semibold
Divider:     subtle violet border between value and detail
```

---

## 12. Accessibility Checklist

- [ ] All colors: minimum 4.5:1 contrast (body text), 3:1 (large text / UI)
- [ ] Focus ring: visible on all interactive elements (2px primary, offset 2px)
- [ ] Icon-only buttons: have `aria-label`
- [ ] Form inputs: always have visible `<label>` (not placeholder-only)
- [ ] Error messages: `role="alert"` or `aria-live="polite"`
- [ ] Tables: proper `scope` on `<th>` elements
- [ ] Status: never conveyed by color alone (add icon or text)
- [ ] `prefers-reduced-motion` respected (handled in global.css)

---

## 13. How to Use in Code

### CSS Variables (anywhere in JSX/TSS)

```tsx
// Inline style
<div style={{ background: "var(--ds-surface-1)", padding: "var(--ds-space-6)" }}>

// Status tag pattern
<Tag style={{
  background: "var(--ds-color-success-surface)",
  color: "var(--ds-color-success)",
  border: "1px solid #bbf7d0"
}}>Active</Tag>
```

### Design Tokens in TypeScript

```tsx
import { tokens, chartPalette } from "@/styles/designSystem";

// Colors
tokens.colors.primary          // "#3b28cc"
tokens.colors.successSurface   // "#dcfce7"
tokens.colors.textSecondary    // "#475569"

// Spacing (returns number in px)
tokens.space[6]   // 24
tokens.space[4]   // 16

// Shadows
tokens.shadow.card    // "0 1px 3px rgba(59,40,204,0.07)..."
tokens.shadow.modal   // "0 24px 48px rgba(0,0,0,0.18)..."

// Chart palette
chartPalette[0]  // violet (primary series)
chartPalette[1]  // green (second series)
```

### Utility Classes (global.css)

```tsx
<h1 className="ds-page-title">Dashboard</h1>
<p className="ds-page-subtitle">Overview of all accounts</p>
<span className="ds-kpi-value">₪12,400</span>
<span className="ds-kpi-label">Revenue</span>
<span className="ds-mono">INV-2024-0091</span>
<span className="ds-truncate">Long text that needs to be cut off…</span>
<span className="ds-status-dot ds-status-dot--active" />
```
