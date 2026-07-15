import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "../ui/textarea";
import { Header } from "../layout/Header";

export default function CreateRecord() {
     const [alias, setAlias] = useState(false);
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="space-y-4">
              <Header
                title="prusplunk.com"
                subtitle="Info"
                showSearch={false}
              />
              <div className="space-y-4 p-6">

      <div className="flex items-center justify-between border-b border-border px-6 py-4">

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}

          <h2 className="text-lg font-semibold">
            Record 1
          </h2>
        </button>

        <Button
          variant="outline"
          size="sm"
        >
          Delete
        </Button>

      </div>

      {expanded && (

        <div className="space-y-8 p-6">

          {/* Row */}

          <div className="grid gap-8 lg:grid-cols-2">

            {/* Record Name */}

            <div>

              <div className="mb-2 flex items-center gap-2">

                <label className="font-medium">
                  Record name
                </label>

                <Info className="h-4 w-4 text-primary" />

              </div>

              <div className="flex items-center gap-3">

                <Input
                  placeholder="subdomain"
                  className="bg-card"
                />

                <span className="text-muted-foreground whitespace-nowrap">
                  prusplunk.com
                </span>

              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Keep blank to create a record for the root domain.
              </p>

            </div>

            {/* Record Type */}

            <div>

              <div className="mb-2 flex items-center gap-2">

                <label className="font-medium">
                  Record type
                </label>

                <Info className="h-4 w-4 text-primary" />

              </div>

              <Select defaultValue="A">

                <SelectTrigger className="bg-card">

                  <SelectValue />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="A">
                    A - Routes traffic to an IPv4 address
                  </SelectItem>

                  <SelectItem value="AAAA">
                    AAAA
                  </SelectItem>

                  <SelectItem value="CNAME">
                    CNAME
                  </SelectItem>

                  <SelectItem value="TXT">
                    TXT
                  </SelectItem>

                  <SelectItem value="MX">
                    MX
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

          </div>

          {/* Alias */}

          <div className="flex items-center gap-3">

            <Switch
              checked={alias}
              onCheckedChange={setAlias}
            />

            <label className="font-medium">
              Alias
            </label>

          </div>

          {/* Dynamic Section */}

          {alias ? (
             <div className="space-y-8 rounded-lg border border-border bg-background/40 p-6">

      {/* Route Traffic To */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Record Target */}

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <label className="font-medium">
              Route traffic to
            </label>

            <Info className="h-4 w-4 text-primary" />

          </div>

          <Select defaultValue="aws">

            <SelectTrigger>

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="aws">
                Alias to AWS Resource
              </SelectItem>

              <SelectItem value="another">
                Alias to another record
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Endpoint */}

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <label className="font-medium">
              Choose endpoint
            </label>

            <Info className="h-4 w-4 text-primary" />

          </div>

          <Select>

            <SelectTrigger>

              <SelectValue placeholder="Select endpoint" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="alb">
                Application Load Balancer
              </SelectItem>

              <SelectItem value="nlb">
                Network Load Balancer
              </SelectItem>

              <SelectItem value="cloudfront">
                CloudFront Distribution
              </SelectItem>

              <SelectItem value="s3">
                S3 Static Website
              </SelectItem>

              <SelectItem value="api">
                API Gateway
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

      </div>

      {/* Region */}

      <div className="grid gap-6 lg:grid-cols-2">

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <label className="font-medium">
              AWS Region
            </label>

            <Info className="h-4 w-4 text-primary" />

          </div>

          <Select defaultValue="ohio">

            <SelectTrigger>

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="ohio">
                US East (Ohio)
              </SelectItem>

              <SelectItem value="virginia">
                US East (N. Virginia)
              </SelectItem>

              <SelectItem value="oregon">
                US West (Oregon)
              </SelectItem>

              <SelectItem value="mumbai">
                Asia Pacific (Mumbai)
              </SelectItem>

              <SelectItem value="singapore">
                Asia Pacific (Singapore)
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

        {/* Evaluate Target Health */}

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <label className="font-medium">
              Evaluate target health
            </label>

            <Info className="h-4 w-4 text-primary" />

          </div>

          <Select defaultValue="no">

            <SelectTrigger>

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="yes">
                Yes
              </SelectItem>

              <SelectItem value="no">
                No
              </SelectItem>

            </SelectContent>

          </Select>

        </div>

      </div>

      {/* Preview */}

      <div className="rounded-lg border border-dashed border-border bg-card p-5">

        <p className="text-sm font-medium">
          Selected Target
        </p>

        <div className="mt-3 rounded-md bg-background p-3 font-mono text-sm text-muted-foreground">

          dualstack.my-alb-123456.us-east-2.elb.amazonaws.com

        </div>

      </div>

      {/* Optional Notes */}

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">

        <p className="text-sm font-medium text-blue-500">

          Alias records don't require TTL values because Route 53 uses the TTL
          of the AWS resource automatically.

        </p>

      </div>

    </div>
          ) : (
            <div className="space-y-8 rounded-lg border border-border bg-background/40 p-6">

      {/* Value */}

      <div className="space-y-2">

        <div className="flex items-center gap-2">

          <label className="font-medium">
            Value
          </label>

          <Info className="h-4 w-4 text-primary" />

        </div>

        <Textarea
          rows={5}
          placeholder="192.168.1.10

192.168.1.11

Multiple values are supported."
          className="resize-none"
        />

        <p className="text-sm text-muted-foreground">
          Enter one value per line. The required format depends on the selected
          record type.
        </p>

      </div>

      {/* TTL */}

      <div className="grid gap-6 lg:grid-cols-2">

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <label className="font-medium">
              TTL (seconds)
            </label>

            <Info className="h-4 w-4 text-primary" />

          </div>

          <Input
            type="number"
            defaultValue="300"
          />

          <p className="text-sm text-muted-foreground">
            Time to live determines how long DNS resolvers cache this record.
          </p>

        </div>

      </div>

      {/* Quick TTL */}

      <div>

        <p className="mb-3 font-medium">
          Common TTL values
        </p>

        <div className="flex flex-wrap gap-3">

          {[
            "60 sec",
            "300 sec",
            "900 sec",
            "1800 sec",
            "3600 sec",
            "86400 sec",
          ].map((ttl) => (
            <button
              key={ttl}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent hover:border-primary"
            >
              {ttl}
            </button>
          ))}

        </div>

      </div>

      {/* Preview */}

      <div className="rounded-lg border border-dashed border-border bg-card p-5">

        <p className="font-medium">
          Record Preview
        </p>

        <div className="mt-3 rounded-md bg-background p-4 font-mono text-sm">

          example.prusplunk.com

          <br />

          A

          <br />

          192.168.1.10

          <br />

          TTL 300

        </div>

      </div>

      {/* Information */}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">

        <p className="text-sm text-amber-500">

          Lower TTL values allow DNS changes to propagate faster but increase
          the number of DNS queries.

        </p>

      </div>

    </div>
          )}

          {/* Routing Policy */}

          <div className="max-w-xl">

            <div className="mb-2 flex items-center gap-2">

              <label className="font-medium">
                Routing policy
              </label>

              <Info className="h-4 w-4 text-primary" />

            </div>

            <Select defaultValue="simple">

              <SelectTrigger className="bg-card">

                <SelectValue />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="simple">
                  Simple routing
                </SelectItem>

                <SelectItem value="weighted">
                  Weighted
                </SelectItem>

                <SelectItem value="latency">
                  Latency
                </SelectItem>

                <SelectItem value="failover">
                  Failover
                </SelectItem>

              </SelectContent>

            </Select>

          </div>

        </div>

      )}

    </div>
    </div>
  )
}
