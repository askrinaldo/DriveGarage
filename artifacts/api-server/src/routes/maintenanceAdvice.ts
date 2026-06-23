import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, vehiclesTable, serviceRecordsTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";

const router: IRouter = Router();

router.post(
  "/vehicles/:vehicleId/maintenance-advice",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, vehicleId));

    if (!vehicle) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const serviceRecords = await db
      .select()
      .from(serviceRecordsTable)
      .where(eq(serviceRecordsTable.vehicleId, vehicleId))
      .orderBy(desc(serviceRecordsTable.serviceDate))
      .limit(20);

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      const advice = generateRuleBasedAdvice(vehicle, serviceRecords);
      res.json({ advice, source: "rule_based" });
      return;
    }

    const systemPrompt = `Du er en ekspert mekaniker for veteranbiler og klassiske motorsykler. 
Gi konkrete, praktiske vedlikeholdsanbefalinger basert på kjøretøyets historikk.
Svar alltid på norsk. Svar i markdown-format med punktlister og overskrifter.
Hold svaret kortfattet og handlingsorientert (maks 400 ord).`;

    const lastServices = serviceRecords.slice(0, 5).map((s) => ({
      tittel: s.title,
      dato: s.serviceDate,
      km: s.mileageAtService,
      kategori: s.category,
    }));

    const userPrompt = `Kjøretøy: ${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model} (${vehicle.type === "motorcycle" ? "motorsykkel" : "bil"})
Nåværende kilometerstand: ${vehicle.mileage ?? "ukjent"} km
Siste 5 serviceoppføringer: ${JSON.stringify(lastServices, null, 2)}

Gi vedlikeholdsanbefalinger for dette kjøretøyet. Fokuser på:
1. Hva som bør gjøres snarest
2. Hva som bør planlegges
3. Tips spesifikke for dette merket og modellen`;

    try {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 600,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!openaiRes.ok) {
        throw new Error(`OpenAI API error: ${openaiRes.status}`);
      }

      const data = (await openaiRes.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const advice = data.choices[0]?.message?.content ?? "";
      res.json({ advice, source: "ai" });
    } catch {
      const advice = generateRuleBasedAdvice(vehicle, serviceRecords);
      res.json({ advice, source: "rule_based" });
    }
  }
);

function generateRuleBasedAdvice(
  vehicle: { make: string; model: string; year: number | null; mileage: number | null; type: string },
  records: Array<{ title: string; category: string; serviceDate: Date; mileageAtService: number | null }>
): string {
  const now = new Date();
  const lines: string[] = [];

  lines.push(`## Vedlikeholdsanbefalinger for ${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`);
  lines.push("");

  const categories = records.map((r) => r.category);
  const lastOilChange = records.find((r) => r.category === "oil_change");
  const lastBrakes = records.find((r) => r.category === "brakes");
  const lastTires = records.find((r) => r.category === "tires");

  lines.push("### 🔴 Prioritert vedlikehold");

  if (!lastOilChange) {
    lines.push("- **Oljeskift** — ingen registrert oljeskift. Dette bør gjøres snarest.");
  } else {
    const daysSince = Math.round(
      (now.getTime() - new Date(lastOilChange.serviceDate).getTime()) / 86400000
    );
    if (daysSince > 365) {
      lines.push(`- **Oljeskift** — siste oljeskift var ${Math.round(daysSince / 30)} måneder siden.`);
    }
  }

  if (!lastBrakes) {
    lines.push("- **Bremser** — ingen registrert bremsekontroll. Kontroller bremseklosser og -skiver.");
  }

  if (vehicle.year && vehicle.year < 1990) {
    lines.push("- **Forgassersjekk** — veteranbiler fra denne perioden bør ha forgasseren kontrollert jevnlig.");
    lines.push("- **Tennsystem** — sjekk tennplugger, fordelerhette og tennkabler.");
  }

  lines.push("");
  lines.push("### 🟡 Planlegg snart");

  if (!lastTires) {
    lines.push("- **Dekk** — ingen dekk-kontroll registrert. Sjekk mønsterdybde og lufttrykk.");
  }

  if (vehicle.mileage && vehicle.mileage > 50000) {
    lines.push("- **Kjølebelte** — bør byttes ved 60 000 km eller hvert 4. år.");
    lines.push("- **Støtdempersjekk** — viktig for kjøretøy med høy kilometerstand.");
  }

  lines.push("");
  lines.push("### 💡 Generelle tips");
  lines.push("- Bruk anbefalt motorolje for klassiske motorer (ofte mineralbasert, ikke syntetisk).");
  lines.push("- Lagres kjøretøyet over vinteren, bruk stabilisator i bensintanken.");
  lines.push("- Sjekk gummitettinger og -slanger jevnlig — disse aldres og sprekker.");

  if (records.length === 0) {
    lines.push("");
    lines.push("### ⚠️ Kom i gang");
    lines.push("- Start med å registrere det vedlikeholdet du allerede har utført for å holde oversikt.");
  }

  void categories;

  return lines.join("\n");
}

export default router;
