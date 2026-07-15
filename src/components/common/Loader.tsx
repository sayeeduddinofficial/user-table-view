import { Loader2 } from "lucide-react";

export function Loader({ label = "Loading...", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
