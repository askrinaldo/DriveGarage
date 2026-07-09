---
name: i18n setup
description: How multi-language support is structured in the vintage-garage frontend
---

# i18n Setup

**Stack:** `i18next` + `react-i18next`, initialized in `src/i18n/index.ts`, imported in `src/main.tsx`.

**Languages:** `no` (default), `sv`, `da`, `en` — stored in `localStorage` under key `"vg-lang"`.

**Translation files:** `src/i18n/translations/{no,sv,da,en}.ts`
- `no.ts` exports the master object and derives `type Translations` from it (no `as const` — required so other languages can use different string values without literal-type conflicts)
- `sv.ts`, `da.ts`, `en.ts` import and implement `Translations`

**Why no `as const`:** Using `as const` makes every string a narrow literal type. Other language files can't satisfy that type with different strings. Without `as const`, `typeof no` produces `string` types throughout, so all translations can implement the same interface.

**Date/number locale:** `getCurrentLocale()` from `src/i18n/index.ts` maps lang code → BCP-47 locale string (`no→no-NO`, `sv→sv-SE`, `da→da-DK`, `en→en-GB`). Used in `dashboard.tsx` and `VehicleCard`.
