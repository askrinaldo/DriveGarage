import { Router } from "express";
import { parseUserAuth, requireUser } from "../middleware/userAuth";

const router = Router();

const VIPPS_PENDING = {
  provider: "vipps",
  status: "pending_integration",
  message: "Vipps-betaling er ikke aktivert ennå. Betalingsavtale med Vipps er under utarbeidelse.",
};

/** Returns the user's subscription status. No payment provider active. */
router.get("/billing/subscription", parseUserAuth, requireUser, (_req, res): void => {
  res.json({
    ...VIPPS_PENDING,
    tier: "free",
    trialActive: true,
    trialDays: 7,
  });
});

/** Checkout not available until Vipps is integrated. */
router.post("/billing/checkout", parseUserAuth, requireUser, (_req, res): void => {
  res.status(503).json(VIPPS_PENDING);
});

/** Customer portal not available until Vipps is integrated. */
router.post("/billing/portal", parseUserAuth, requireUser, (_req, res): void => {
  res.status(503).json(VIPPS_PENDING);
});

/** Returns empty price list — no active payment provider. */
router.get("/billing/prices", (_req, res): void => {
  res.json({ prices: [], ...VIPPS_PENDING });
});

export default router;
