/**
 * lbCreateShared.tsx
 * Small presentational primitives reused across the Load Balancer create screens.
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import albHowItWorksSvg from "@/assets/load-balancers/alb.svg?raw";
import nlbHowItWorksSvg from "@/assets/load-balancers/nlb.svg?raw";

export function Section({ id, title, infoTip, children }: { id?: string; title?: string; infoTip?: boolean; children: ReactNode }) {
  return (
    <div id={id} className="border border-border rounded-lg bg-card mb-4 scroll-mt-4">
      {title && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {infoTip && <Info size={14} className="text-primary" />}
        </div>
      )}
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

export function Field({ label, hint, inline, children }: { label: string; hint?: string; inline?: boolean; children: ReactNode }) {
  return (
    <div className={inline ? "" : ""}>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function RadioCard({ checked, onClick, title, bullets }: { checked: boolean; onClick: () => void; title: string; bullets: string[] }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-left rounded-md border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-accent/20"
        }`}
    >
      <div className="flex items-start gap-2">
        <input type="radio" checked={checked} readOnly className="mt-1 accent-primary" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          <ul className="list-disc pl-4 text-xs text-muted-foreground mt-1 space-y-0.5">
            {bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      </div>
    </button>
  );
}

export function SumCol({ title, children, editable, warn, onEdit }: { title: string; children: ReactNode; editable?: boolean; warn?: boolean; onEdit?: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-medium text-foreground">{title}</span>
        {editable && <button type="button" onClick={onEdit} className="text-primary hover:underline text-xs cursor-pointer">Edit</button>}
        {warn && <AlertTriangle size={12} className="text-warning" />}
      </div>
      <div className="text-muted-foreground space-y-0.5">{children}</div>
    </div>
  );
}

export function Collapsible({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} className="rotate-90" />}
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function AlbHowItWorks() {
  return (
    <div
      role="img"
      aria-label="ALB how it works"
      className="w-full h-full text-foreground [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
      dangerouslySetInnerHTML={{ __html: albHowItWorksSvg }}
    />
  );
}

export function NlbHowItWorks() {
  return (
    <div
      role="img"
      aria-label="NLB how it works"
      className="w-full h-full text-foreground [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
      dangerouslySetInnerHTML={{ __html: nlbHowItWorksSvg }}
    />
  );
}
