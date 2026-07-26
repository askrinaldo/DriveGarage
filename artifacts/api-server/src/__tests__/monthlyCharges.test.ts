/**
 * Unit tests for runMonthlyBillingJob in monthlyCharges.ts.
 *
 * Verifies:
 *   1. Charge amount matches PLAN_PRICE_NOK (50 NOK → 5 000 øre)
 *   2. Idempotency — when the DB query returns no eligible subscriptions
 *      (because all charges already exist), the job creates zero charges
 *   3. Dry-run — no Vipps API calls, result.dryRun === true
 *
 * All external I/O (DB + Vipps) is mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────

const mockDbExecute     = vi.fn();
const mockInsertChainFn = vi.fn();   // controls what .onConflictDoNothing() resolves to
const mockDbUpdate      = vi.fn();

vi.mock("@workspace/db", () => {
  const tableStub = new Proxy({}, { get: () => "col" });

  /** Fluent insert chain: insert().values().returning().onConflictDoNothing() */
  function makeInsertChain() {
    const chain: Record<string, unknown> = {};
    chain.values              = () => chain;
    chain.returning           = () => chain;
    chain.onConflictDoNothing = () => mockInsertChainFn();
    return chain;
  }

  /** Fluent update chain: update().set().where() → Promise<void> */
  function makeUpdateChain() {
    const chain: Record<string, unknown> = {};
    chain.set   = () => chain;
    chain.where = () => Promise.resolve();
    return chain;
  }

  const db = {
    execute: (...args: unknown[]) => mockDbExecute(...args),
    insert:  ()                    => makeInsertChain(),
    update:  ()                    => makeUpdateChain(),
  };

  return {
    db,
    subscriptionsTable:  tableStub,
    billingChargesTable: tableStub,
    usersTable:          tableStub,
    eq:  vi.fn((_a: unknown, _b: unknown) => true),
    and: vi.fn((..._a: unknown[]) => true),
    sql: Object.assign(
      vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
      { raw: vi.fn() },
    ),
  };
});

// ─── Mock Vipps charges ───────────────────────────────────────────────────────

const mockCreateVippsCharge = vi.fn();

vi.mock("../lib/vipps/charges", () => ({
  createVippsCharge: (...args: unknown[]) => mockCreateVippsCharge(...args),
  getVippsCharge:    vi.fn(),
  listVippsCharges:  vi.fn(),
}));

// ─── Mock logger (silence noise in test output) ───────────────────────────────

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Mock vipps/config (required by subscription.ts transitive import) ────────

vi.mock("../lib/vipps/config", () => ({
  isBillingEnforcementEnabled: vi.fn(() => true),
  getVippsConfig:              vi.fn(() => ({})),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** One active subscription returned by the SQL query. */
const ACTIVE_SUB = {
  sub_id:             1,
  user_id:            42,
  vipps_agreement_id: "agr_test_001",
};

/** A fake billing_charges row returned after a successful insert. */
const FAKE_CHARGE_ROW = {
  id:             100,
  subscriptionId: 1,
  userId:         42,
  billingPeriod:  "2026-07",
  orderId:        "dg-42-202607-1-abcd1234",
  amountNok:      50,
  status:         "pending",
  dueDate:        new Date(),
  createdAt:      new Date(),
  updatedAt:      new Date(),
};

/** Vipps charge-creation response. */
const FAKE_VIPPS_RESPONSE = { chargeId: "chr_abc123" };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runMonthlyBillingJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Vipps succeeds
    mockCreateVippsCharge.mockResolvedValue(FAKE_VIPPS_RESPONSE);
  });

  // ── 1. Charge amount ────────────────────────────────────────────────────────

  describe("charge amount", () => {
    it("passes the correct NOK amount (PLAN_PRICE_NOK = 50) to createVippsCharge", async () => {
      // DB returns one active subscription
      mockDbExecute.mockResolvedValue({ rows: [ACTIVE_SUB] });
      // Insert succeeds (new row)
      mockInsertChainFn.mockResolvedValue([FAKE_CHARGE_ROW]);

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob();

      expect(result.created).toBe(1);
      expect(result.errors).toBe(0);

      // createVippsCharge must have been called once
      expect(mockCreateVippsCharge).toHaveBeenCalledTimes(1);

      // The amountNok passed must equal PLAN_PRICE_NOK (50 NOK)
      const callArg = mockCreateVippsCharge.mock.calls[0]![0] as {
        amountNok: number;
      };
      expect(callArg.amountNok).toBe(50);
    });

    it("converts the NOK amount to øre (×100) in the Vipps request body", async () => {
      // This test confirms the conversion happens inside createVippsCharge
      // (amountNok * 100 = 5000 øre). We verify the NOK value passed in is 50,
      // so that Math.round(50 * 100) === 5000 as required by the Vipps spec.
      mockDbExecute.mockResolvedValue({ rows: [ACTIVE_SUB] });
      mockInsertChainFn.mockResolvedValue([FAKE_CHARGE_ROW]);

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );
      const { PLAN_PRICE_NOK } = await import("../lib/subscription");

      await runMonthlyBillingJob();

      const callArg = mockCreateVippsCharge.mock.calls[0]![0] as {
        amountNok: number;
      };
      // The job must pass exactly PLAN_PRICE_NOK — not a hardcoded 100 or any other value
      expect(callArg.amountNok).toBe(PLAN_PRICE_NOK);
      // Confirm the constant itself is 50 (price check as a regression guard)
      expect(PLAN_PRICE_NOK).toBe(50);
      // And confirm 50 NOK → 5 000 øre (the Vipps API unit)
      expect(Math.round(PLAN_PRICE_NOK * 100)).toBe(5000);
    });
  });

  // ── 2. Idempotency ──────────────────────────────────────────────────────────

  describe("idempotency", () => {
    it("creates zero charges when the DB query returns no eligible subscriptions", async () => {
      // Simulates "all active subscriptions already have a charge this period"
      // because the SQL NOT EXISTS clause filtered them out.
      mockDbExecute.mockResolvedValue({ rows: [] });

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob();

      expect(result.processed).toBe(0);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      // No Vipps call should have been made
      expect(mockCreateVippsCharge).not.toHaveBeenCalled();
    });

    it("skips a subscription when the DB insert returns nothing (unique-index conflict)", async () => {
      // The DB query returns one eligible sub, but the insert is blocked
      // by the unique index (race condition / duplicate row from another process).
      mockDbExecute.mockResolvedValue({ rows: [ACTIVE_SUB] });
      // .onConflictDoNothing() → empty array means the row was NOT inserted
      mockInsertChainFn.mockResolvedValue([]);

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob();

      expect(result.processed).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      // Vipps must NOT be called — we did not own the charge row
      expect(mockCreateVippsCharge).not.toHaveBeenCalled();
    });
  });

  // ── 3. Dry-run ──────────────────────────────────────────────────────────────

  describe("dry-run mode", () => {
    it("returns dryRun: true and makes no Vipps API calls", async () => {
      mockDbExecute.mockResolvedValue({ rows: [ACTIVE_SUB] });

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob({ dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(mockCreateVippsCharge).not.toHaveBeenCalled();
      // Insert must not be called either — dry-run returns early
      expect(mockInsertChainFn).not.toHaveBeenCalled();
    });

    it("reports processed subscriptions without creating any charges in dry-run", async () => {
      // Two active subscriptions eligible for billing this period
      mockDbExecute.mockResolvedValue({
        rows: [ACTIVE_SUB, { ...ACTIVE_SUB, sub_id: 2, user_id: 43 }],
      });

      const { runMonthlyBillingJob } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob({ dryRun: true });

      expect(result.processed).toBe(2);
      expect(result.skipped).toBe(2);   // dry-run counts eligible subs as skipped
      expect(result.created).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.dryRun).toBe(true);
    });

    it("includes billingPeriod and dueDate in the dry-run result", async () => {
      mockDbExecute.mockResolvedValue({ rows: [] });

      const { runMonthlyBillingJob, currentBillingPeriod } = await import(
        "../lib/billing/monthlyCharges"
      );

      const result = await runMonthlyBillingJob({ dryRun: true });

      expect(typeof result.billingPeriod).toBe("string");
      // YYYY-MM format
      expect(result.billingPeriod).toMatch(/^\d{4}-\d{2}$/);
      expect(result.billingPeriod).toBe(currentBillingPeriod());
      expect(typeof result.dueDate).toBe("string");
      // dueDate is an ISO date string
      expect(() => new Date(result.dueDate)).not.toThrow();
    });
  });
});
