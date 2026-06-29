import { COMPANY } from "@/config/compliance";

export function CompanyInfo({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <span className="block">{COMPANY.name}</span>
      <span className="block">Org.nr. {COMPANY.orgNr}</span>
      <span className="block">{COMPANY.location}</span>
    </div>
  );
}
