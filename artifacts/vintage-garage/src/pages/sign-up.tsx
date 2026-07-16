import { SignUp } from "@clerk/react";
import { Link } from "wouter";
import { Car } from "lucide-react";
import { CompanyInfo } from "@/components/company-info";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080808] px-4 py-12">
      {/* Logo */}
      <Link href="/">
        <div className="flex items-center gap-2.5 mb-8 cursor-pointer">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
            <Car className="w-4 h-4 text-black" />
          </div>
          <span className="text-[18px] font-bold text-white tracking-[-0.02em]">DriveGarage</span>
        </div>
      </Link>

      {/* Clerk form */}
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        appearance={{
          variables: {
            colorPrimary: "#f59e0b",
            colorBackground: "#111111",
            colorInputBackground: "#1a1a1a",
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
            footerActionLink: "text-amber-400 hover:text-amber-300 transition-colors",
            formFieldInput:
              "border-white/[0.10] bg-[#1a1a1a] text-white !shadow-none",
            dividerLine: "bg-white/[0.08]",
            dividerText: "text-white/25",
            socialButtonsBlockButton:
              "border-white/[0.10] bg-[#1a1a1a] hover:bg-white/[0.06] transition-colors !shadow-none",
            socialButtonsBlockButtonText: "text-white/60",
            headerTitle: "text-white font-bold",
            headerSubtitle: "text-white/35",
            formFieldLabel: "text-white/45",
            formResendCodeLink: "text-amber-400 hover:text-amber-300",
            otpCodeFieldInput: "border-white/[0.10] bg-[#1a1a1a] text-white !shadow-none",
          },
        }}
      />

      {/* Footer */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-[12px] text-white/25 leading-relaxed max-w-xs">
          Ved å registrere deg godtar du våre{" "}
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
  );
}
