import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
} = process.env;

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendInvitationEmail(opts: {
  to: string;
  clubName: string;
  createdBy: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  if (!transporter) {
    return false;
  }
  const expires = opts.expiresAt.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  await transporter.sendMail({
    from: SMTP_FROM ?? SMTP_USER,
    to: opts.to,
    subject: `Invitasjon til ${opts.clubName} på DriveGarage`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#18181b;color:#fafafa;border-radius:10px;padding:32px;">
        <h2 style="color:#f97316;margin-top:0">Du er invitert!</h2>
        <p><strong>${opts.createdBy}</strong> har invitert deg til å bli med i <strong>${opts.clubName}</strong> på DriveGarage.</p>
        <a href="${opts.inviteUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:20px 0">
          Godta invitasjon
        </a>
        <p style="color:#a1a1aa;font-size:13px">Lenken er gyldig til ${expires}. Hvis du ikke ønsker å bli med, kan du ignorere denne e-posten.</p>
      </div>
    `,
    text: `Du er invitert til ${opts.clubName} av ${opts.createdBy}. Åpne lenken: ${opts.inviteUrl} (gyldig til ${expires})`,
  });
  return true;
}

export { isConfigured as emailConfigured };
