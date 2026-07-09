import { Router } from "express";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { getSubscriptionStatus, trialDaysRemaining, SUBSCRIPTION_PLAN, PLAN_PRICE_NOK, TRIAL_DAYS } from "../lib/subscription";

const router = Router();

const VIPPS_META = {
  provider: "vipps" as const,
  providerStatus: "pending_integration" as const,
  message: "Vipps-betaling er ikke aktivert ennå. Betalingsavtale med Vipps er under utarbeidelse.",
};

/** Returns the user's current subscription status from DB. */
router.get("/billing/subscription", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const row = await getSubscriptionStatus(userId);

  const daysRemainingInTrial = trialDaysRemaining(row?.trialEndsAt ?? null) ?? null;

  res.json({
    ...VIPPS_META,
    status: row?.status ?? "trialing",
    plan: row?.plan ?? null,
    trialStartedAt: row?.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: row?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEndsAt: row?.currentPeriodEndsAt?.toISOString() ?? null,
    canceledAt: row?.canceledAt?.toISOString() ?? null,
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    daysRemainingInTrial,
  });
});

/** Checkout not available until Vipps is integrated. */
router.post("/billing/checkout", parseUserAuth, requireUser, (_req, res): void => {
  res.status(503).json(VIPPS_META);
});

/** Customer portal not available until Vipps is integrated. */
router.post("/billing/portal", parseUserAuth, requireUser, (_req, res): void => {
  res.status(503).json(VIPPS_META);
});

/** Returns plan info — no active payment provider. */
router.get("/billing/prices", (_req, res): void => {
  res.json({
    ...VIPPS_META,
    prices: [
      {
        plan: SUBSCRIPTION_PLAN,
        amount: PLAN_PRICE_NOK,
        currency: "NOK",
        interval: "month",
        trialDays: TRIAL_DAYS,
        label: "DriveGarage — 100 kr/mnd",
      },
    ],
  });
});

export default router;
