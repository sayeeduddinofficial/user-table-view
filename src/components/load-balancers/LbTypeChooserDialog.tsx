import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlbIllustration, NlbIllustration } from "./illustrations";

const LB_OPTIONS = [
  {
    value: "alb" as const,
    label: "Application Load Balancer",
    description:
      "Choose an Application Load Balancer when you need a flexible feature set for your applications with HTTP and HTTPS traffic. Operating at the request level, ALBs provide advanced routing and visibility features for microservices and containers.",
    illustration: <AlbIllustration />,
  },
  {
    value: "nlb" as const,
    label: "Network Load Balancer",
    description:
      "Choose a Network Load Balancer when you need ultra-high performance, TLS offloading at scale, centralized certificate deployment, support for UDP, and static IP addresses. Operating at the connection level, NLBs handle millions of requests per second with ultra-low latency.",
    illustration: <NlbIllustration />,
  },
];

interface LbTypeChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "alb" | "nlb") => void;
}

export function LbTypeChooserDialog({ open, onOpenChange, onSelect }: LbTypeChooserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare and select load balancer type</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A complete feature-by-feature comparison along with detailed highlights is also available.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          {LB_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex flex-col rounded-lg border border-border bg-card/40 p-4">
              <div className="font-semibold text-sm mb-3">{opt.label}</div>
              <div className="flex items-center justify-center h-40 rounded-md bg-muted/20 border border-border/60 mb-3">
                {opt.illustration}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{opt.description}</p>
              <Button size="sm" className="mt-4 w-fit" onClick={() => onSelect(opt.value)}>
                Create
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
