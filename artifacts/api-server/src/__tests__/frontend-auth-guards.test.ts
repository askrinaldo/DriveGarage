/**
 * Auth-guard regression tests for the DriveGarage frontend.
 *
 * These tests confirm that:
 *  1. Protected pages (/profile, /admin, /membership-card) redirect
 *     unauthenticated users to /sign-in.
 *  2. The sidebar in layout.tsx points unauthenticated users to
 *     /sign-in (login) and /sign-up (register).
 *
 * Strategy: read the frontend source files directly and assert the
 * required patterns are present. This catches guard removals or
 * typos (e.g. navigate("/login") instead of navigate("/sign-in"))
 * before they reach production.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

const frontendSrc = resolve(__dirname, "../../../../artifacts/vintage-garage/src");

function readPage(relativePath: string): string {
  return readFileSync(resolve(frontendSrc, relativePath), "utf-8");
}

// ─── Unauthenticated redirect guards ─────────────────────────────────────────

describe("unauthenticated redirect guards", () => {
  const protectedPages: Array<{ name: string; file: string }> = [
    { name: "/profile",         file: "pages/profile.tsx"         },
    { name: "/admin",           file: "pages/admin.tsx"           },
    { name: "/membership-card", file: "pages/membership-card.tsx" },
  ];

  for (const { name, file } of protectedPages) {
    it(`${name} navigates to /sign-in when user is not authenticated`, () => {
      const source = readPage(file);

      // The guard must check isAuthenticated (or isSuperAdmin which implies
      // authentication) and call navigate with the /sign-in path.
      expect(
        source,
        `${file} must check isAuthenticated (or isSuperAdmin) from useUserAuth`,
      ).toMatch(/isAuthenticated|isSuperAdmin/);

      expect(
        source,
        `${file} must call navigate("/sign-in") for unauthenticated users`,
      ).toMatch(/navigate\(["'`]\/sign-in["'`]\)/);

      // Guard must be inside a useEffect so it runs after Clerk resolves.
      expect(
        source,
        `${file} must place the guard inside a useEffect`,
      ).toMatch(/useEffect/);
    });
  }
});

// ─── Sidebar login / register links ──────────────────────────────────────────

describe("layout sidebar unauthenticated links", () => {
  it("login link targets /sign-in", () => {
    const source = readPage("components/layout.tsx");

    // wouter <Link href="/sign-in"> or similar
    expect(
      source,
      "layout.tsx sidebar must contain a link to /sign-in for unauthenticated users",
    ).toMatch(/href=["'`]\/sign-in["'`]/);
  });

  it("register link targets /sign-up", () => {
    const source = readPage("components/layout.tsx");

    expect(
      source,
      "layout.tsx sidebar must contain a link to /sign-up for unauthenticated users",
    ).toMatch(/href=["'`]\/sign-up["'`]/);
  });

  it("login and register links are inside the unauthenticated branch (not isAuthenticated block)", () => {
    const source = readPage("components/layout.tsx");

    // The links must appear after the `isAuthenticated` branch.
    // A simple check: the sign-in and sign-up hrefs must both appear
    // in the file, and the file must have the isAuthenticated conditional.
    expect(source).toMatch(/isAuthenticated/);

    const signInIndex  = source.lastIndexOf('"/sign-in"');
    const signUpIndex  = source.lastIndexOf('"/sign-up"');
    const isAuthIndex  = source.indexOf("isAuthenticated");

    expect(signInIndex,  "/sign-in href must appear after isAuthenticated check").toBeGreaterThan(isAuthIndex);
    expect(signUpIndex,  "/sign-up href must appear after isAuthenticated check").toBeGreaterThan(isAuthIndex);
  });
});
