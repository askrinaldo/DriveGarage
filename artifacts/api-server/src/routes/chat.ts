import { Router, type IRouter } from "express";
import { db, vehiclesTable, serviceRecordsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { parseUserAuth } from "../middleware/userAuth";

const router: IRouter = Router();

const SYSTEM_PROMPT = `Du er en hjelpsom assistent for Vintage Garage — en norsk plattform for eiere av veteranbiler og klassiske motorsykler.

Plattformen har følgende funksjoner:
- **Garasje**: Legg til og administrer kjøretøy (biler og motorsykler) med bilder, farge, kilometerstand, reg.nr. og Finn.no-lenke
- **Servicelogg**: Logg service per kjøretøy — oljeskift, bremser, dekk, motor, elektrisk, karosseri og annet. Legg til kostnader og utførende verksted.
- **Kvitteringer**: Last opp og koble kvitteringer til kjøretøy eller serviceposter
- **Turer**: Logg kjøreturer med start/stopp, distanse og drivstofforbruk
- **Servicepåminnelser**: Sett opp påminnelser for kommende vedlikehold
- **AI-vedlikeholdsråd**: Få AI-baserte råd om hva som bør gjøres med kjøretøyet ditt
- **Klubber**: Bli med i eller opprett bilklubber, delta i forum, arrangementer og felles garasje
- **Markedsplass**: Kjøp og selg deler innen klubben
- **Support**: Send supportsaker og forbedringsforslag via Hjelp-siden

Svar alltid på norsk. Vær kortfattet og vennlig. Hvis brukeren spør om noe du ikke kan hjelpe med, si det og anbefal dem å opprette en supportsak.`;

const FALLBACK_RESPONSES: Record<string, string> = {
  kjøretøy: "For å legge til et kjøretøy: gå til **Garasjen min** og klikk **+ Legg til kjøretøy**. Du kan registrere merke, modell, årsmodell, farge, kilometerstand og mye mer.",
  service: "For å logge en servicepost: gå til kjøretøyet ditt og klikk **+ Ny servicepost**. Du kan registrere kategori (oljeskift, bremser, dekk osv.), dato, kostnad og hvem som utførte jobben.",
  klubb: "For å finne eller opprette en klubb: gå til **Klubber** i menyen. Du kan søke etter eksisterende klubber eller opprette din egen. Klubber har felles garasje, forum og arrangementer.",
  kvittering: "Kvitteringer kan knyttes til et kjøretøy eller en servicepost. Gå til kjøretøyet ditt og velg **Ny kvittering** for å legge til.",
  tur: "Turer logges under hvert kjøretøy. Gå til kjøretøyet og velg **Ny tur** for å registrere distanse, start- og stoppsted og drivstofforbruk.",
  påminnelse: "Du kan sette opp servicepåminnelser under hvert kjøretøy. Gå til **Påminnelser** på kjøretøyets side for å legge til intervaller og datoer.",
  hjelp: "Du kan opprette en supportsak på **Hjelp**-siden. Klikk på **Ny sak** og beskriv problemet ditt — vi svarer så snart vi kan.",
  support: "For teknisk support, gå til **Hjelp**-siden i menyen og opprett en ny supportsak. Du kan også sende inn forbedringsforslag der.",
  ai: "AI-vedlikeholdsråd er tilgjengelig for hvert kjøretøy. Gå til kjøretøyet ditt og klikk på **AI-vedlikeholdsråd** for å få personlige anbefalinger basert på servicehistorikken.",
};

function getRuleBasedResponse(message: string): string {
  const lower = message.toLowerCase();

  for (const [key, response] of Object.entries(FALLBACK_RESPONSES)) {
    if (lower.includes(key)) return response;
  }

  if (lower.includes("hei") || lower.includes("hallo") || lower.includes("god dag")) {
    return "Hei! Jeg er Vintage Garage-assistenten. Jeg kan hjelpe deg med kjøretøy, servicelogg, klubber, kvitteringer og mye mer. Hva kan jeg hjelpe deg med?";
  }

  return `Beklager, jeg fant ikke et godt svar på det. Prøv å spørre om kjøretøy, service, klubber, kvitteringer eller turer.\n\nHar du et problem som krever menneskelig hjelp? [Opprett en supportsak her](/help).`;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function buildUserContext(userId: number, userName: string): Promise<string> {
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, userId))
    .orderBy(vehiclesTable.createdAt);

  if (vehicles.length === 0) {
    return `\n\nBrukeren ${userName} er pålogget men har ingen kjøretøy registrert i garasjen ennå.`;
  }

  const vehicleLines: string[] = [];

  for (const v of vehicles) {
    const typeLabel = v.type === "motorcycle" ? "Motorsykkel" : "Bil";
    const mileage = v.mileage != null ? `, ${v.mileage.toLocaleString("no-NO")} km` : "";
    const reg = v.registrationNumber ? ` (reg: ${v.registrationNumber})` : "";

    const [latestService] = await db
      .select()
      .from(serviceRecordsTable)
      .where(eq(serviceRecordsTable.vehicleId, v.id))
      .orderBy(desc(serviceRecordsTable.serviceDate))
      .limit(1);

    let serviceLine = "Ingen servicehistorikk registrert";
    if (latestService) {
      const date = new Date(latestService.serviceDate).toLocaleDateString("no-NO");
      const km = latestService.mileageAtService != null ? ` ved ${latestService.mileageAtService.toLocaleString("no-NO")} km` : "";
      serviceLine = `Siste service: ${latestService.title} (${date}${km})`;
    }

    vehicleLines.push(`- ${typeLabel}: ${v.year} ${v.make} ${v.model}${reg}${mileage} — ${serviceLine}`);
  }

  return `\n\nBrukeren ${userName} er pålogget. Kjøretøy i garasjen:\n${vehicleLines.join("\n")}\n\nBruk denne informasjonen til å gi personlige og spesifikke vedlikeholdsråd.`;
}

router.post("/chat", parseUserAuth, async (req, res): Promise<void> => {
  const { messages } = req.body as { messages?: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages er påkrevd" });
    return;
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    res.status(400).json({ error: "Ingen brukermelding funnet" });
    return;
  }

  let systemPrompt = SYSTEM_PROMPT;

  if (req.userAuth) {
    try {
      const userContext = await buildUserContext(req.userAuth.userId, req.userAuth.name);
      systemPrompt = SYSTEM_PROMPT + userContext;
    } catch {
      // Ignore DB errors — fall back to generic prompt
    }
  }

  const apiKey = process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    const reply = getRuleBasedResponse(lastUserMessage.content);
    res.json({ reply, source: "rule_based" });
    return;
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!openaiRes.ok) {
      throw new Error(`OpenAI feil: ${openaiRes.status}`);
    }

    const data = (await openaiRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const reply = data.choices[0]?.message?.content ?? "";
    const needsSupport =
      reply.toLowerCase().includes("beklager") ||
      reply.toLowerCase().includes("vet ikke") ||
      reply.toLowerCase().includes("ikke sikker");

    res.json({
      reply: needsSupport
        ? `${reply}\n\n[Trenger du mer hjelp? Opprett en supportsak](/help)`
        : reply,
      source: "ai",
    });
  } catch {
    const reply = getRuleBasedResponse(lastUserMessage.content);
    res.json({ reply, source: "rule_based" });
  }
});

export default router;
