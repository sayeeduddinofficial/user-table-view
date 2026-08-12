/**
 * LbStatsBar.tsx
 * Summary cards + quota widget for the Load Balancers list page.
 */

import { Scale, Globe, Shield, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/load-balancers/lbShared";

interface LbStatsBarProps {
  totalLbs: number;
  albCount: number;
  nlbCount: number;
  remainingQuota: number;
  onRequestIncrease: () => void;
}

export function LbStatsBar({
  totalLbs,
  albCount,
  nlbCount,
  remainingQuota,
  onRequestIncrease,
}: LbStatsBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <StatCard
        icon={<Scale className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/10"
        value={totalLbs}
        label="Total LBs"
      />

      <StatCard
        icon={<Globe className="h-4 w-4 text-cyan-400" />}
        iconBg="bg-cyan-500/10"
        value={albCount}
        label="ALB"
      />

      <StatCard
        icon={<Shield className="h-4 w-4 text-emerald-400" />}
        iconBg="bg-emerald-500/10"
        value={nlbCount}
        label="NLB"
      />

      <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <svg width={16} height={16} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" >
              <path stroke="#F97316" fillRule="evenodd" clipRule="evenodd" d="M15.8447 16.1875H17.0172V15H15.8447V16.1875ZM12.3753 16.1875H13.5628V15H12.3753V16.1875ZM8.43785 16.1875H9.62532V15H8.43785V16.1875ZM4.98291 16.1875H6.12539V15H4.98291V16.1875ZM8.00035 7.4375H14.0002V4.5H8.00035V7.4375ZM17.5172 14H16.7502V12.3125C16.7502 12.036 16.5262 11.8125 16.2502 11.8125H15.0002V10.125C15.0002 9.8485 14.7762 9.625 14.5002 9.625H11.5003V8.4375H14.5002C14.7762 8.4375 15.0002 8.214 15.0002 7.9375V4C15.0002 3.7235 14.7762 3.5 14.5002 3.5H7.50036C7.22387 3.5 7.00037 3.7235 7.00037 4V7.9375C7.00037 8.214 7.22387 8.4375 7.50036 8.4375H10.5003V9.625H7.50036C7.22387 9.625 7.00037 9.8485 7.00037 10.125V11.8125H5.7504C5.4739 11.8125 5.2504 12.036 5.2504 12.3125V14H4.48242C4.20642 14 3.98243 14.2235 3.98243 14.5V16.6875C3.98243 16.964 4.20642 17.1875 4.48242 17.1875H6.62538C6.90137 17.1875 7.12537 16.964 7.12537 16.6875V14.5C7.12537 14.2235 6.90137 14 6.62538 14H6.25039V12.8125H8.31285V14H7.93786C7.66136 14 7.43786 14.2235 7.43786 14.5V16.6875C7.43786 16.964 7.66136 17.1875 7.93786 17.1875H10.1253C10.4013 17.1875 10.6253 16.964 10.6253 16.6875V14.5C10.6253 14.2235 10.4013 14 10.1253 14H9.31283V12.3125C9.31283 12.036 9.08883 11.8125 8.81284 11.8125H8.00035V10.625H14.0002V11.8125H13.1878C12.9113 11.8125 12.6878 12.036 12.6878 12.3125V14H11.8753C11.5988 14 11.3753 14.2235 11.3753 14.5V16.6875C11.3753 16.964 11.5988 17.1875 11.8753 17.1875H14.0627C14.3387 17.1875 14.5627 16.964 14.5627 16.6875V14.5C14.5627 14.2235 14.3387 14 14.0627 14H13.6878V12.8125H15.7502V14H15.3447C15.0682 14 14.8447 14.2235 14.8447 14.5V16.6875C14.8447 16.964 15.0682 17.1875 15.3447 17.1875H17.5172C17.7932 17.1875 18.0172 16.964 18.0172 16.6875V14.5C18.0172 14.2235 17.7932 14 17.5172 14ZM11.0003 21C5.4859 21 0.999982 16.514 0.999982 11C0.999982 5.486 5.4859 1 11.0003 1C16.5142 1 21 5.486 21 11C21 16.514 16.5142 21 11.0003 21ZM11.0003 0C4.93441 0 0 4.9345 0 11C0 17.0655 4.93441 22 11.0003 22C17.0652 22 22 17.0655 22 11C22 4.9345 17.0652 0 11.0003 0Z" fill="#F97316" />
            </svg>
          </div>

          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {remainingQuota}
            </p>

            <p className="text-xs text-muted-foreground">
              Quota Remaining
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto border-primary text-primary bg-primary/10 text-xs whitespace-nowrap hover:bg-primary hover:text-white"
          onClick={onRequestIncrease}
        >
          <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
          Request Increase
        </Button>
      </div>
    </div>
  );
}
