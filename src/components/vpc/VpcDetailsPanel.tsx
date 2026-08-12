import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { VpcDetails } from "./VpcDetails";

type Props = {
  vpcId: string;
};

export function VpcDetailsPanel({ vpcId }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg mt-4">
      {/* Interactive Title bar split like standard AWS layouts */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-left text-foreground"
        >
          <ChevronRight
            size={14}
            className={`transition-transform text-muted-foreground ${
              open ? "rotate-90" : ""
            }`}
          />
          {vpcId}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50">
          <VpcDetails
            vpcId={vpcId}
            embedded={true}
          />
        </div>
      )}
    </div>
  );
}