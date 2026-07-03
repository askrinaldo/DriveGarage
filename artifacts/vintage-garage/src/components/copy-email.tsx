import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyEmailProps {
  email: string;
  linkClassName?: string;
}

export function CopyEmail({ email, linkClassName }: CopyEmailProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast({ title: "E-postadresse kopiert" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kunne ikke kopiere adressen", variant: "destructive" });
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={`mailto:${email}`}
        className={linkClassName ?? "text-sm text-indigo-300 hover:text-foreground underline transition-colors"}
      >
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Kopier e-postadresse"
        title="Kopier e-postadresse"
        className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}
