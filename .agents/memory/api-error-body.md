---
name: ApiError body access
description: How to extract backend error messages from the generated API client's thrown errors
---

# ApiError body access

The rule: when catching errors from `@workspace/api-client-react` hooks/mutations, read the parsed error body from `err.data`, e.g. `(err as { data?: { error?: string } })?.data?.error`.

**Why:** The custom fetch wrapper throws `ApiError` where `.data` is the parsed JSON body and `.response` is the raw fetch `Response` (which has no `.data`). An axios-style `err.response?.data?.error` compiles fine but always yields `undefined`, so specific backend messages (403/409 Norwegian error texts) silently never reach users — only generic fallback toasts show. This bug existed at several toast sites before being fixed in July 2026.

**How to apply:** Any new catch block that surfaces a backend `{ error: string }` message in a toast must use `err.data?.error`. Grep for `response?.data?.error` if regressions are suspected.
