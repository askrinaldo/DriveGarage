---
name: Express 5 params cast
description: req.params values may be string | string[] in strict TypeScript with Express 5 types; always cast before parseInt.
---

In Express 5 with strict TypeScript settings and `moduleResolution: bundler`, `req.params[key]` may be typed as `string | string[]` rather than plain `string`. This causes TS2345 errors when passed to `parseInt(value, 10)`.

**Why:** Express 5 types are more permissive about param shapes than Express 4.

**How to apply:** Always use `parseInt(String(req.params.clubId), 10)` rather than `parseInt(req.params.clubId, 10)` in route handlers. The `requireClubRole` middleware already handles this via `Array.isArray(rawId) ? rawId[0] : rawId`.
