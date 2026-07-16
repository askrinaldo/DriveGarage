import { SignIn } from "@clerk/react";
import { Link } from "wouter";
import { Car, Shield, Star, Lock } from "lucide-react";
import { CompanyInfo } from "@/components/company-info";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">

      {/* ── Left panel: car photo ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col overflow-hidden">
        {/* Photo */}
        <img
          src="/hero-fjord.png"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            width: "100%",
            height: "auto",
            top: "50%",
            left: 0,
            transform: "translateY(-44%)",
          }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.55) 35%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10 p-8">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer w-fit">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <Car className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-[16px] font-bold text-white tracking-[-0.02em]">DriveGarage</span>
            </div>
          </Link>
        </div>

        {/* Bottom: tagline + trust */}
        <div className="relative z-10 mt-auto p-8 pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-3">
            Norges veteranbil-plattform
          </p>
          <h2 className="text-[28px] font-bold text-white leading-[1.1] tracking-[-0.025em] mb-6">
            Din garasje.<br />Din historie.
          </h2>
          <div className="flex flex-col gap-2">
            {[
              { icon: Shield, text: "GDPR-trygg · Data lagres i Norge" },
              { icon: Lock,   text: "Ingen binding · Avslutt via Vipps" },
              { icon: Star,   text: "12 000+ kjøretøy dokumentert" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-[12.5px] text-white/40">
                <Icon className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: Clerk form ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
                <Car className="w-3 h-3 text-black" />
              </div>
              <span className="text-[14px] font-bold text-white">DriveGarage</span>
            </div>
          </Link>
          <Link href="/sign-up">
            <span className="text-[13px] text-white/40 hover:text-white transition-colors">Opprett konto</span>
          </Link>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-[400px]">
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              fallbackRedirectUrl={`${basePath}/dashboard`}
              appearance={{
                variables: {
                  colorPrimary: "#f59e0b",
                  colorBackground: "#111111",
                  colorInputBackground: "#191919",
                  colorInputText: "#ffffff",
                  colorText: "#ffffff",
                  colorTextSecondary: "rgba(255,255,255,0.40)",
                  colorDanger: "#ef4444",
                  borderRadius: "10px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                },
                elements: {
                  card: "shadow-none bg-[#111] border border-white/[0.08]",
                  formButtonPrimary:
                    "bg-amber-500 hover:bg-amber-400 text-black font-semibold !shadow-none transition-colors",
                  footerActionLink:
                    "text-amber-400 hover:text-amber-300 transition-colors",
                  formFieldInput:
                    "border-white/[0.10] bg-[#191919] text-white focus:border-amber-500/40 !shadow-none",
                  dividerLine: "bg-white/[0.08]",
                  dividerText: "text-white/25",
                  socialButtonsBlockButton:
                    "border-white/[0.10] bg-[#191919] hover:bg-white/[0.06] transition-colors !shadow-none",
                  socialButtonsBlockButtonText: "text-white/60",
                  socialButtonsBlockButtonArrow: "text-white/30",
                  headerTitle: "text-white font-bold",
                  headerSubtitle: "text-white/35",
                  formFieldLabel: "text-white/45",
                  identityPreviewText: "text-white/70",
                  identityPreviewEditButtonIcon: "text-amber-400",
                  formResendCodeLink: "text-amber-400 hover:text-amber-300",
                  otpCodeFieldInput:
                    "border-white/[0.10] bg-[#191919] text-white !shadow-none",
                  alertText: "text-white/60",
                  formFieldSuccessText: "text-emerald-400",
                  formFieldErrorText: "text-red-400",
                },
              }}
            />

            <div className="mt-5 space-y-3 text-center">
              <p className="text-[12px] text-white/25 leading-relaxed max-w-xs mx-auto">
                Ved å logge inn godtar du våre{" "}
                <Link href="/terms" className="text-white/40 hover:text-white underline transition-colors">
                  vilkår
                </Link>{" "}
                og{" "}
                <Link href="/privacy" className="text-white/40 hover:text-white underline transition-colors">
                  personvernerklæring
                </Link>
                .
              </p>
              <CompanyInfo className="text-[11px] text-white/15 leading-relaxed" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
