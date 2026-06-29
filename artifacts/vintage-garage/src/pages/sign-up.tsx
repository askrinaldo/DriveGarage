import { SignUp } from "@clerk/react";
import { Link } from "wouter";
import { CompanyInfo } from "@/components/company-info";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#06080f]">
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#06080f_100%)] pointer-events-none" />
      <div
        className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{ left: "20%", top: "30%", width: "500px", height: "500px", background: "rgba(79,70,229,0.12)", transform: "translate(-50%,-50%)" }}
      />
      <div
        className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{ left: "80%", top: "70%", width: "400px", height: "400px", background: "rgba(6,182,212,0.09)", transform: "translate(-50%,-50%)" }}
      />
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 gap-4">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
        <p className="text-xs text-[#8899bb] text-center max-w-xs leading-relaxed">
          Ved å registrere deg godtar du våre{" "}
          <Link href="/terms" className="underline hover:text-white transition-colors">Vilkår for bruk</Link>{" "}
          og bekrefter at du har lest vår{" "}
          <Link href="/privacy" className="underline hover:text-white transition-colors">Personvernerklæring</Link>
          .
        </p>
        <CompanyInfo className="text-[11px] text-[#8899bb]/60 text-center leading-relaxed" />
      </div>
    </div>
  );
}
