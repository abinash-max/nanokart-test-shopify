// Plan identifier constants — safe to import from both client and server code.
// Keep this file free of any server-only imports (db, fs, env access, etc.).

export const PLANS = {
  STARTER_MONTHLY: "Nanokart Starter – Monthly",
  GROWTH_MONTHLY: "Nanokart Growth – Monthly",
  PRO_MONTHLY: "Nanokart Professional – Monthly",
  STARTER_ANNUAL: "Nanokart Starter – Annual",
  GROWTH_ANNUAL: "Nanokart Growth – Annual",
  PRO_ANNUAL: "Nanokart Professional – Annual",
};

export const ALL_PLAN_KEYS = [
  PLANS.STARTER_MONTHLY,
  PLANS.GROWTH_MONTHLY,
  PLANS.PRO_MONTHLY,
  PLANS.STARTER_ANNUAL,
  PLANS.GROWTH_ANNUAL,
  PLANS.PRO_ANNUAL,
];
