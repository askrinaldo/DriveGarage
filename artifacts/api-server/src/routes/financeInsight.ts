import { Router } from "express";
import { count, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { parseUserAuth, requireSuperAdmin } from "../middleware/userAuth";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceMetrics {
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueYtd: number;
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  payingUsers: number;
  freeUsers: number;
  standardUsers: number;
  premiumUsers: number;
  activeSubscriptions: number;
  cancelingSubscriptions: number;
  pastDueSubscriptions: number;
  openInvoices: number;
  failedInvoices: number;
  paidInvoices: number;
  totalInvoiceRevenue: number;
}

interface FinanceInsight {
  summary: string;
  insights: string[];
  risks: string[];
  opportunities: string[];
  nextSteps: string[];
  metrics: FinanceMetrics;
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function kr(amount: number): string {
  return `kr ${amount.toLocaleString("nb-NO")}`;
}

function revChange(current: number, prev: number): string {
  if (prev === 0 && current === 0) return "uendret";
  if (prev === 0) return `opp ${kr(current)}`;
  const diff = current - prev;
  const p = Math.abs(Math.round(((current - prev) / prev) * 100));
  if (diff > 0) return `opp ${p}% (${kr(diff)} mer enn forrige måned)`;
  if (diff < 0) return `ned ${p}% (${kr(Math.abs(diff))} mindre enn forrige måned)`;
  return "uendret fra forrige måned";
}

// ─── Core insight generator ───────────────────────────────────────────────────

function generateInsights(m: FinanceMetrics): Omit<FinanceInsight, "metrics" | "generatedAt"> {
  const arpu = m.payingUsers > 0 ? Math.round(m.mrr / m.payingUsers) : 0;
  const payingPct = pct(m.payingUsers, m.totalUsers);
  const freePct = pct(m.freeUsers, m.totalUsers);
  const premiumPct = m.payingUsers > 0 ? pct(m.premiumUsers, m.payingUsers) : 0;
  const standardPct = m.payingUsers > 0 ? pct(m.standardUsers, m.payingUsers) : 0;
  const revTrend = revChange(m.revenueThisMonth, m.revenueLastMonth);
  const churnPct = m.activeSubscriptions > 0
    ? pct(m.cancelingSubscriptions, m.activeSubscriptions)
    : 0;

  // ── Summary ──
  const summaryLines: string[] = [];

  if (m.mrr === 0 && m.totalUsers === 0) {
    summaryLines.push("Plattformen er akkurat startet — ingen inntekter eller brukere ennå. Fokuser på å skaffe de første betalende kundene.");
  } else if (m.mrr === 0 && m.totalUsers > 0) {
    summaryLines.push(`Du har ${m.totalUsers} registrerte brukere, men ingen betalende kunder ennå. Alle er på gratisplanen. Neste mål er å konvertere de første til Standard- eller Premium-abonnement.`);
  } else {
    summaryLines.push(`GaragePilot genererer ${kr(m.mrr)} i månedlige inntekter (MRR), som gir en årlig omsetning på ${kr(m.arr)}. Inntektene er ${revTrend}.`);
    if (m.totalUsers > 0) {
      summaryLines.push(`Av totalt ${m.totalUsers} brukere er ${m.payingUsers} betalende (${payingPct}%) og ${m.freeUsers} på gratisplan (${freePct}%). Gjennomsnittlig inntekt per betalende bruker (ARPU) er ${kr(arpu)}/mnd.`);
    }
    if (m.cancelingSubscriptions > 0) {
      summaryLines.push(`${m.cancelingSubscriptions} abonnement (${churnPct}% av aktive) er satt til å avslutte ved neste fornyelse.`);
    }
    if (m.openInvoices > 0 || m.failedInvoices > 0) {
      const total = m.openInvoices + m.failedInvoices;
      summaryLines.push(`Det finnes ${total} ubetalte eller mislykkede fakturaer som påvirker cashflowet.`);
    }
  }

  const summary = summaryLines.join(" ");

  // ── Insights ──
  const insights: string[] = [];

  if (m.mrr > 0) {
    insights.push(`MRR: ${kr(m.mrr)}/mnd → ARR-prognose: ${kr(m.arr)}`);
    insights.push(`Inntekt denne måneden: ${kr(m.revenueThisMonth)} (${revTrend})`);
    if (m.revenueYtd > 0) insights.push(`Hittil i år (YTD): ${kr(m.revenueYtd)}`);
    if (arpu > 0) insights.push(`ARPU: ${kr(arpu)}/mnd per betalende bruker`);
  }

  if (m.totalUsers > 0) {
    insights.push(`${m.payingUsers} av ${m.totalUsers} brukere betaler (${payingPct}% konverteringsrate)`);
    if (m.newUsersThisMonth > 0) insights.push(`${m.newUsersThisMonth} nye brukere registrert denne måneden`);
  }

  if (m.payingUsers > 0) {
    if (standardPct > 0) insights.push(`Standard-plan: ${m.standardUsers} brukere (${standardPct}% av betalende)`);
    if (premiumPct > 0) insights.push(`Premium-plan: ${m.premiumUsers} brukere (${premiumPct}% av betalende)`);
  }

  if (m.activeSubscriptions > 0) {
    insights.push(`${m.activeSubscriptions} aktive Stripe-abonnementer`);
    if (m.cancelingSubscriptions > 0) insights.push(`${m.cancelingSubscriptions} abonnement avsluttes ved neste fornyelse`);
  }

  if (m.paidInvoices > 0) insights.push(`${m.paidInvoices} betalte fakturaer totalt`);

  // ── Risks ──
  const risks: string[] = [];

  if (m.mrr === 0 && m.totalUsers > 0) {
    risks.push("Ingen betalende kunder — alle brukere er på gratisplan. Risiko for null cashflow over tid.");
  }
  if (m.revenueThisMonth < m.revenueLastMonth && m.revenueLastMonth > 0) {
    const dropPct = pct(m.revenueLastMonth - m.revenueThisMonth, m.revenueLastMonth);
    risks.push(`Inntektene falt ${dropPct}% sammenlignet med forrige måned (${kr(m.revenueLastMonth - m.revenueThisMonth)} nedgang).`);
  }
  if (churnPct >= 10) {
    risks.push(`Høy churn-risiko: ${churnPct}% av aktive abonnement er satt til å avsluttes. Over 10% er kritisk.`);
  } else if (churnPct > 0 && churnPct < 10) {
    risks.push(`${m.cancelingSubscriptions} abonnement (${churnPct}%) avsluttes ved neste fornyelse. Følg opp for å beholde kundene.`);
  }
  if (m.openInvoices > 0) {
    risks.push(`${m.openInvoices} åpne fakturaer som ikke er betalt ennå.`);
  }
  if (m.failedInvoices > 0) {
    risks.push(`${m.failedInvoices} mislykkede betalinger. Disse kundene mister snart tilgang.`);
  }
  if (m.pastDueSubscriptions > 0) {
    risks.push(`${m.pastDueSubscriptions} abonnement er forfalt (past_due). Krever umiddelbar oppfølging.`);
  }
  if (payingPct < 5 && m.totalUsers > 10) {
    risks.push(`Lav konverteringsrate: kun ${payingPct}% av ${m.totalUsers} brukere betaler.`);
  }
  if (risks.length === 0) {
    risks.push("Ingen kritiske risikoer identifisert basert på tilgjengelige data.");
  }

  // ── Opportunities ──
  const opportunities: string[] = [];

  if (m.freeUsers > 5) {
    opportunities.push(`${m.freeUsers} gratisbrukere er konverteringskandidater. Selv 10% konvertering = ${Math.round(m.freeUsers * 0.1)} nye betalende kunder.`);
  }
  if (m.standardUsers > 0 && m.premiumUsers < m.standardUsers) {
    opportunities.push(`${m.standardUsers} Standard-brukere kan oppgraderes til Premium. Vis merverdi med Premium-funksjoner.`);
  }
  if (m.mrr > 0) {
    const annualUpside = Math.round(m.standardUsers * 300 * 0.2);
    if (annualUpside > 0) {
      opportunities.push(`Hvis 20% av Standard-brukere bytter til årsplan sparer du ${kr(annualUpside)} i prosessering og reduserer churn.`);
    }
  }
  if (m.newUsersThisMonth > 0 && payingPct < 30) {
    opportunities.push(`God brukervekst (${m.newUsersThisMonth} nye denne måneden). Optimaliser onboarding for å øke konvertering.`);
  }
  if (m.mrr > 0 && arpu > 0) {
    opportunities.push(`Øk ARPU (nå ${kr(arpu)}/mnd) med tilleggstjenester: ekstra garasjeplass, prioritert support, merkevareprofil.`);
  }
  if (opportunities.length === 0) {
    opportunities.push("Samle mer data for å identifisere vekstmuligheter.");
  }

  // ── Next steps ──
  const nextSteps: string[] = [];

  if (m.failedInvoices > 0) {
    nextSteps.push(`Kontakt de ${m.failedInvoices} kundene med mislykkede betalinger — oppdater betalingsmetode.`);
  }
  if (m.cancelingSubscriptions > 0) {
    nextSteps.push(`Send e-post til de ${m.cancelingSubscriptions} kundene som avslutter — tilby rabatt eller spør om årsak.`);
  }
  if (m.freeUsers > m.payingUsers * 2) {
    nextSteps.push("Sett opp e-postkampanje til gratisbrukere med tilbud om 1 måneds gratis prøveperiode på Standard.");
  }
  if (m.mrr === 0) {
    nextSteps.push("Prioriter å skaffe de første 10 betalende kundene — tilby personlig demo og 30-dagers prøveperiode.");
  }
  if (m.standardUsers > 0 && m.premiumUsers === 0) {
    nextSteps.push("Ingen Premium-brukere ennå — sjekk at Premium-fordelene er tydelig kommunisert.");
  }
  nextSteps.push("Overvåk MRR ukentlig. Målet: positiv vekst mnd-for-mnd.");
  if (m.totalUsers > 0 && m.newUsersThisMonth === 0) {
    nextSteps.push("Ingen nye brukere denne måneden — vurder markedsføring eller SEO-tiltak.");
  }

  return { summary, insights, risks, opportunities, nextSteps };
}

// ─── GET /admin/finance-insight ───────────────────────────────────────────────

router.get("/admin/finance-insight", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60;
  const startOfYear = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  // User counts from DB
  const tierRows = await db
    .select({ tier: usersTable.subscriptionTier, cnt: count() })
    .from(usersTable)
    .groupBy(usersTable.subscriptionTier);

  const tierMap: Record<string, number> = {};
  for (const r of tierRows) tierMap[r.tier ?? "free"] = Number(r.cnt);

  const [totalRow] = await db.select({ cnt: count() }).from(usersTable);
  const [activeRow] = await db.select({ cnt: count() }).from(usersTable)
    .where(sql`${usersTable.isActive} = true`);
  const [newUsersRow] = await db.select({ cnt: count() }).from(usersTable)
    .where(sql`${usersTable.createdAt} >= ${new Date(monthStart * 1000)}`);

  const freeUsers = tierMap["free"] ?? 0;
  const standardUsers = tierMap["standard"] ?? 0;
  const premiumUsers = tierMap["premium"] ?? 0;
  const totalUsers = Number(totalRow?.cnt ?? 0);
  const activeUsers = Number(activeRow?.cnt ?? 0);
  const newUsersThisMonth = Number(newUsersRow?.cnt ?? 0);
  const payingUsers = standardUsers + premiumUsers;

  let mrrOre = 0;
  let revenueThisMonthOre = 0;
  let revenueLastMonthOre = 0;
  let revenueYtdOre = 0;
  let activeSubscriptions = 0;
  let cancelingSubscriptions = 0;
  let pastDueSubscriptions = 0;
  let openInvoices = 0;
  let failedInvoices = 0;
  let paidInvoices = 0;
  let totalInvoiceRevenue = 0;

  try {
    const mrrRes = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE WHEN (item->>'plan_interval') = 'year'
          THEN (item->>'plan_amount')::bigint / 12
          ELSE (item->>'plan_amount')::bigint
        END
      ), 0) AS mrr_ore
      FROM stripe.subscriptions s,
      jsonb_array_elements(s.items->'data') AS item
      WHERE s.status = 'active'
    `);
    mrrOre = Number((mrrRes.rows[0] as Record<string, unknown>)?.mrr_ore ?? 0);
  } catch { /* stripe schema not yet seeded */ }

  try {
    const subsRes = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_cnt,
        COUNT(*) FILTER (WHERE status = 'active' AND cancel_at_period_end = true) AS canceling_cnt,
        COUNT(*) FILTER (WHERE status = 'past_due') AS past_due_cnt
      FROM stripe.subscriptions
    `);
    const subsRow = subsRes.rows[0] as Record<string, unknown>;
    activeSubscriptions = Number(subsRow?.active_cnt ?? 0);
    cancelingSubscriptions = Number(subsRow?.canceling_cnt ?? 0);
    pastDueSubscriptions = Number(subsRow?.past_due_cnt ?? 0);
  } catch { /* stripe schema not yet seeded */ }

  try {
    const invRes = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_cnt,
        COUNT(*) FILTER (WHERE status = 'uncollectible') AS failed_cnt,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_cnt,
        COALESCE(SUM(amount_paid) FILTER (WHERE status = 'paid'), 0) AS total_paid
      FROM stripe.invoices
    `);
    const invRow = invRes.rows[0] as Record<string, unknown>;
    openInvoices = Number(invRow?.open_cnt ?? 0);
    failedInvoices = Number(invRow?.failed_cnt ?? 0);
    paidInvoices = Number(invRow?.paid_cnt ?? 0);
    totalInvoiceRevenue = Math.round(Number(invRow?.total_paid ?? 0) / 100);
  } catch { /* stripe schema not yet seeded */ }

  try {
    const revThisRes = await db.execute(sql`SELECT COALESCE(SUM(amount_paid),0) AS total FROM stripe.invoices WHERE status='paid' AND created >= ${thirtyDaysAgo}`);
    revenueThisMonthOre = Number((revThisRes.rows[0] as Record<string, unknown>)?.total ?? 0);

    const revLastRes = await db.execute(sql`SELECT COALESCE(SUM(amount_paid),0) AS total FROM stripe.invoices WHERE status='paid' AND created >= ${sixtyDaysAgo} AND created < ${thirtyDaysAgo}`);
    revenueLastMonthOre = Number((revLastRes.rows[0] as Record<string, unknown>)?.total ?? 0);

    const revYtdRes = await db.execute(sql`SELECT COALESCE(SUM(amount_paid),0) AS total FROM stripe.invoices WHERE status='paid' AND created >= ${startOfYear}`);
    revenueYtdOre = Number((revYtdRes.rows[0] as Record<string, unknown>)?.total ?? 0);
  } catch { /* stripe schema not yet seeded */ }

  const toKr = (ore: number) => Math.round(ore / 100);

  const metrics: FinanceMetrics = {
    mrr: toKr(mrrOre),
    arr: toKr(mrrOre * 12),
    revenueThisMonth: toKr(revenueThisMonthOre),
    revenueLastMonth: toKr(revenueLastMonthOre),
    revenueYtd: toKr(revenueYtdOre),
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    payingUsers,
    freeUsers,
    standardUsers,
    premiumUsers,
    activeSubscriptions,
    cancelingSubscriptions,
    pastDueSubscriptions,
    openInvoices,
    failedInvoices,
    paidInvoices,
    totalInvoiceRevenue,
  };

  const { summary, insights, risks, opportunities, nextSteps } = generateInsights(metrics);

  const result: FinanceInsight = {
    summary,
    insights,
    risks,
    opportunities,
    nextSteps,
    metrics,
    generatedAt: new Date().toISOString(),
  };

  res.json(result);
});

// ─── POST /admin/finance-chat ─────────────────────────────────────────────────

router.post("/admin/finance-chat", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const { question, metrics } = req.body as {
    question: string;
    metrics: FinanceMetrics;
  };

  if (!question?.trim() || !metrics) {
    res.status(400).json({ error: "Spørsmål og metrics er påkrevd" });
    return;
  }

  const q = question.toLowerCase();
  const m = metrics;
  const arpu = m.payingUsers > 0 ? Math.round(m.mrr / m.payingUsers) : 0;
  const payingPct = m.totalUsers > 0 ? Math.round((m.payingUsers / m.totalUsers) * 100) : 0;
  const churnPct = m.activeSubscriptions > 0
    ? Math.round((m.cancelingSubscriptions / m.activeSubscriptions) * 100)
    : 0;

  let answer = "";

  if (q.includes("mrr") || q.includes("månedlig inntekt") || q.includes("månedlige inntekter")) {
    answer = m.mrr > 0
      ? `MRR er nå **${kr(m.mrr)}**. Det betyr at du tar inn den summen hver eneste måned fra abonnementer. Forrige måned var det **${kr(m.revenueLastMonth)}**, så inntektene er ${m.revenueThisMonth >= m.revenueLastMonth ? "🟢 på vei opp" : "🔴 noe lavere"} denne måneden.`
      : "MRR er **kr 0** – ingen betalende kunder ennå. Start med å skaffe de første Standard- eller Premium-brukerne.";
  } else if (q.includes("arr") || q.includes("årlig inntekt")) {
    answer = m.arr > 0
      ? `ARR er **${kr(m.arr)}**. Det er MRR (${kr(m.mrr)}) ganget med 12 — et estimat for årsinntekten hvis alt forblir likt.`
      : "ARR er **kr 0** siden det ikke finnes betalende kunder ennå.";
  } else if (q.includes("churn") || q.includes("slutter") || q.includes("avslutter") || q.includes("sier opp")) {
    if (m.cancelingSubscriptions > 0) {
      answer = `${m.cancelingSubscriptions} av ${m.activeSubscriptions} abonnenter (${churnPct}%) har satt abonnementet til å avsluttes ved neste fornyelse. ${churnPct >= 10 ? "⚠️ Dette er høyt — ta kontakt raskt." : "Det er innenfor normalt nivå, men følg opp."}`;
    } else if (m.pastDueSubscriptions > 0) {
      answer = `Ingen har aktivt sagt opp, men ${m.pastDueSubscriptions} abonnement er forfalt (past_due). Følg opp betalingen.`;
    } else {
      answer = "🟢 Ingen registrerte avsluttede abonnement akkurat nå!";
    }
  } else if (q.includes("betalende") || q.includes("konverter") || q.includes("gratis")) {
    answer = `Av ${m.totalUsers} totale brukere er **${m.payingUsers} betalende** (${payingPct}%) og **${m.freeUsers} på gratisplan**. Standard: ${m.standardUsers} · Premium: ${m.premiumUsers}. ${payingPct < 10 ? "⚠️ Konverteringsraten er lav. Vurder bedre onboarding." : "Greit nivå!"}`;
  } else if (q.includes("problem") || q.includes("feil") || q.includes("utfordring") || q.includes("dårlig") || q.includes("bekymring")) {
    const issues: string[] = [];
    if (m.failedInvoices > 0) issues.push(`${m.failedInvoices} mislykkede betalinger`);
    if (m.openInvoices > 0) issues.push(`${m.openInvoices} ubetalte fakturaer`);
    if (m.cancelingSubscriptions > 0) issues.push(`${m.cancelingSubscriptions} abonnenter som avslutter`);
    if (m.pastDueSubscriptions > 0) issues.push(`${m.pastDueSubscriptions} forfalte abonnement`);
    if (m.revenueThisMonth < m.revenueLastMonth && m.revenueLastMonth > 0) issues.push("inntektsnedgang fra forrige måned");
    answer = issues.length > 0
      ? `Identifiserte utfordringer:\n\n${issues.map(i => `• ${i}`).join("\n")}\n\nFokuser på de med størst pengekonsekvens først.`
      : "🟢 Ingen kritiske problemer identifisert.";
  } else if (q.includes("abonnement") && (q.includes("best") || q.includes("fokuser") || q.includes("populær"))) {
    if (m.standardUsers > m.premiumUsers) {
      answer = `**Standard-planen** er mest populær (${m.standardUsers} brukere vs ${m.premiumUsers} Premium). ${m.premiumUsers === 0 ? "Ingen har valgt Premium ennå — sjekk at Premium-fordelene er synlige." : ""}`;
    } else if (m.premiumUsers > m.standardUsers) {
      answer = `**Premium-planen** er mest populær (${m.premiumUsers} vs ${m.standardUsers} Standard). Bra — kundene ser tydelig merverdi!`;
    } else {
      answer = m.payingUsers === 0 ? "Ingen betalende kunder ennå." : `Standard: ${m.standardUsers} · Premium: ${m.premiumUsers} — likt fordelt.`;
    }
  } else if (q.includes("vekst") || q.includes("vokser") || q.includes("ny bruker")) {
    const growthMsg = m.newUsersThisMonth > 0 ? `${m.newUsersThisMonth} nye brukere ble registrert denne måneden.` : "Ingen nye brukere denne måneden.";
    const revMsg = m.revenueThisMonth > 0 && m.revenueLastMonth > 0
      ? ` Inntektsvekst: ${m.revenueThisMonth >= m.revenueLastMonth ? "🟢 positiv" : "🔴 negativ"} (${kr(m.revenueThisMonth)} vs ${kr(m.revenueLastMonth)}).`
      : "";
    answer = `${growthMsg}${revMsg} ${payingPct < 15 && m.totalUsers > 0 ? "Fokuser på å konvertere gratisbrukere." : ""}`;
  } else if (q.includes("inntekt") || q.includes("tjente") || q.includes("tjener") || q.includes("penger")) {
    answer = m.revenueThisMonth > 0
      ? `Denne måneden: **${kr(m.revenueThisMonth)}**. Forrige måned: **${kr(m.revenueLastMonth)}**. Hittil i år: **${kr(m.revenueYtd)}**. MRR: **${kr(m.mrr)}**.`
      : "Ingen registrerte inntekter ennå. MRR er **kr 0**. Sjekk at Stripe-webhooks er satt opp.";
  } else if (q.includes("faktura") || q.includes("ubetalt")) {
    const total = m.openInvoices + m.failedInvoices;
    answer = total > 0
      ? `**${total} problematiske fakturaer**: ${m.openInvoices} åpne og ${m.failedInvoices} mislykkede. Gå til Betalinger-seksjonen for detaljer.`
      : "🟢 Ingen ubetalte eller mislykkede fakturaer. Alle kunder er à jour.";
  } else if (q.includes("arpu") || q.includes("gjennomsnitt per bruker")) {
    answer = arpu > 0
      ? `ARPU er **${kr(arpu)}/mnd**. Øk dette ved å: 1) Oppgradere Standard → Premium, 2) Lansere tilleggstjenester, 3) Heve priser for nye kunder.`
      : "ARPU kan ikke beregnes ennå (ingen betalende kunder).";
  } else {
    answer = `Basert på nåværende data:\n\n• Totale brukere: **${m.totalUsers}** (${m.payingUsers} betalende)\n• MRR: **${kr(m.mrr)}**\n• ARR: **${kr(m.arr)}**\n• Aktive abonnement: **${m.activeSubscriptions}**\n\nPrøv spørsmål som "Hvorfor faller inntektene?", "Hva er churn-raten?" eller "Hvilket abonnement er mest populært?"`;
  }

  res.json({ answer });
});

export default router;
