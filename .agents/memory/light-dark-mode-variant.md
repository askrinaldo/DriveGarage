---
name: Light/dark mode variant
description: How theming works in vintage-garage — dark is default, light is html.light-mode class; dark: prefix doesn't fire.
---

# Light/dark mode variant in vintage-garage

## The rule
Never use `dark:` Tailwind prefix for theming in `artifacts/vintage-garage`. Use the `light:` custom variant instead.

**Why:** The app is dark-mode-by-default. CSS variables in `:root` define dark colors; the `.dark` class block is intentionally empty. The `@custom-variant dark` selector targets `(&:is(.dark *))` — but no `.dark` ancestor is ever added to the DOM. So `dark:` classes are dead code and base classes always apply.

Light mode is toggled by adding `light-mode` to the `<html>` element (`html.light-mode`).

## How to apply
1. `index.css` already has `@custom-variant light (&:is(html.light-mode *));` — use this.
2. Write base classes for dark mode, then add `light:` overrides for light mode:
   ```
   bg-white/[0.02] border-white/[0.08] light:bg-white light:border-border
   ```
3. Never write `dark:bg-xxx` — it will never fire and the base class will always apply in both modes.

## Worked example (billing.tsx cards)
- Wrong: `bg-white dark:bg-white/[0.02]` → solid white in BOTH modes
- Right: `bg-white/[0.02] light:bg-white` → transparent in dark, white in light
