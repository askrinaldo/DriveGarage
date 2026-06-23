---
name: req.auth dual-population collision
description: In api-server, req.auth is set by BOTH Clerk middleware and the club JWT — never trust its truthiness as a club actor.
---

# req.auth is populated by two unrelated systems

`@clerk/express`'s `clerkMiddleware` populates `req.auth` with its **own** Clerk
auth object on every request. The club authorization system **also** uses
`req.auth` for its `ClubTokenPayload` (`{ clubId, memberName, role }`), set by
`parseAuth` (club JWT) or the `resolveClubActorFromUser` bridge.

**Rule:** Never treat a truthy `req.auth` as proof of a club actor. Always
shape-check: `typeof req.auth.clubId === "number" && typeof req.auth.memberName
=== "string"`. Both `requireClubRole` and the bridge guard on this shape.

**Why:** With no/Clerk-only auth, `clerkMiddleware` leaves a truthy non-club
object in `req.auth`. A plain `if (req.auth)` guard then (a) makes the bridge
bail before resolving the Clerk member, and (b) makes `requireClubRole` skip its
401 and fall through to a misleading 403. Cost several debug cycles.

**How to apply:** Any new club-gated middleware/route reading `req.auth` must
shape-check, not truthiness-check. `clerkUserAuth` reads Clerk identity via
`getAuth(req)`, NOT `req.auth`, so overwriting `req.auth` with the club payload
after `clerkUserAuth` runs is safe.

# Club authorization is entirely name-based (systemic, unhardened)

`club_members` has only `memberName` (no `userId` FK). Authorization everywhere
matches `memberName` against the actor's name. `POST /api/auth/club-session`
issues a club token (incl. owner) to **anyone** who posts a `memberName` +
`clubId` that exists — **no identity verification**. The Clerk bridge is
strictly more restrictive (requires a valid Clerk session) but still resolves by
display name/email, so a user who sets their Clerk name to match an owner could
be bridged to that role.

**Proper fix (own task):** add a verified `userId`/`ownerUserId` link to
`club_members` + backfill, then match on it instead of display name across the
bridge, `requireClubRole`, and `/auth/club-session`.

# Cross-club IDOR on member mutations (fixed)

PATCH/DELETE `/clubs/:clubId/members/:memberId` previously looked up/updated/
deleted the target by `memberId` alone. Always scope member-row queries with
`and(eq(id, memberId), eq(clubId, params.clubId))` so a club-A admin cannot
touch a club-B member row by id.
