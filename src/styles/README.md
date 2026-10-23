# Diamond UI Design System

`design-tokens.css` is loaded before `index.css` and `diamonds-skin.css` in `main.jsx`. Use its typography, control, spacing, and radius values inside CSS Modules. Existing `--di-*` and `--dsk-*` colors remain available for branded surfaces and the Diamonds Kit skin.

## Typography

| Role | Token | Desktop | Mobile |
| --- | --- | --- | --- |
| Page title | `--font-page-title` | 30px | 22px |
| Section title | `--font-section-title` | 22px | 18px |
| Card title | `--font-card-title` | 18px | 17px |
| Body | `--font-md` | 15px | 15px |
| Secondary / button | `--font-sm` | 13px | 13px |
| Caption | `--font-xs` | 12px | 12px |

Typography tokens use `rem`, so browser font preferences continue to work. Let content wrap or change the layout when a narrow card cannot fit its text.

## Controls and spacing

Buttons use `--button-sm` (36px), `--button-md` (44px), and `--button-lg` (52px). The shared Button raises its small size to 44px on mobile. Inputs use `--input-height` (44px). Spacing uses `--space-1`, `2`, `3`, `4`, `6`, and `8` (4–32px); radii use `--ui-radius-sm` through `xl` (8–24px).

Use `Button`, `Input`, and `Card` from `src/components/ui` for new repeated UI. `Button` supports `primary`, `secondary`, and `danger` variants plus `sm`, `md`, and `lg` sizes. `Input` supports `appearance="bare"` inside an existing search field wrapper. `Card` supports an `as` prop for semantic elements. All three accept `className` for screen-specific styling. Keep specialized controls such as the large recording microphone in their current module, but use shared tokens for their supporting text and controls.

```jsx
<Button variant="primary" size="md">Tiếp tục</Button>
<Input aria-label="Tìm kiếm" placeholder="Tìm kiếm..." />
<Card as="section" className={styles.practiceCard}>...</Card>
```

Migrate existing modules when editing a screen: replace repeated font, spacing, height, and radius literals with tokens, then check the narrow mobile layout. Preserve screen-specific composition and Diamonds Kit effects.
