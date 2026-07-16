import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "../ui/textarea";
import { Header } from "../layout/Header";
import { Link } from "react-router-dom";

export default function CreateRecord() {

  const [routeTrafficTo, setRouteTrafficTo] = useState("");
  const [region, setRegion] = useState("");
  const showAliasOptions = routeTrafficTo !== "" && region !== "";
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alias, setAlias] = useState(false);
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="space-y-4">
      <Header
        title="prusplunk.com"
        subtitle="Info"
        showSearch={false}
      />
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="glass-panel rounded-xl p-6">
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
              <div className="space-y-6 rounded-lg border border-border bg-background/40 p-6">

                {/* Route Traffic To */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Route traffic to</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Select value={routeTrafficTo} onValueChange={setRouteTrafficTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="alb">
                        Alias to Application and Classic Load Balancer
                      </SelectItem>
                      <SelectItem value="nlb">
                        Alias to Network Load Balancer
                      </SelectItem>
                      <SelectItem value="cloudfront">
                        Alias to CloudFront Distribution
                      </SelectItem>
                      <SelectItem value="api">
                        Alias to API Gateway
                      </SelectItem>
                      <SelectItem value="s3">
                        Alias to S3 Website Endpoint
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AWS Region" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="virginia">
                        US East (N. Virginia)
                      </SelectItem>
                      <SelectItem value="ohio">
                        US East (Ohio)
                      </SelectItem>
                      <SelectItem value="oregon">
                        US West (Oregon)
                      </SelectItem>
                      <SelectItem value="mumbai">
                        Asia Pacific (Mumbai)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Choose Load Balancer */}
                {routeTrafficTo && region && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Choose load balancer"
                      className="bg-card"
                    />
                  </div>
                )}

                {/* Routing Policy & Evaluate Target Health */}
                <div className="grid gap-6 lg:grid-cols-2">

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">Routing policy</label>
                      <Info className="h-4 w-4 text-primary" />
                    </div>

                    <Select defaultValue="simple">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="simple">
                          Simple routing
                        </SelectItem>

                        <SelectItem value="weighted">
                          Weighted routing
                        </SelectItem>

                        <SelectItem value="latency">
                          Latency routing
                        </SelectItem>

                        <SelectItem value="failover">
                          Failover routing
                        </SelectItem>

                        <SelectItem value="geolocation">
                          Geolocation routing
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showAliasOptions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="font-medium">
                          Evaluate target health
                        </label>
                        <Info className="h-4 w-4 text-primary" />
                      </div>

                      <div className="flex h-10 items-center rounded-md border border-border px-3">
                        <Switch defaultChecked />
                        <span className="ml-3 text-sm">Yes</span>
                      </div>
                    </div>
                  )}

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





                {/* Information */}

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">

                  <p className="text-sm text-amber-500">

                    Lower TTL values allow DNS changes to propagate faster but increase
                    the number of DNS queries.

                  </p>

                </div>
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


        </section>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-end mb-4">
            <Button
              className="border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground me-4"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setIsConfirmOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Create Record
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="border-b pb-4">
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-xl font-semibold">
                Confirm Record Creation
              </DialogTitle>

              <DialogDescription className="mt-2">
                Review the DNS record details before creating the record.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          {/* Body */}
          <div className="flex-1 overflow-y-auto model-scroll-hide px-1 py-4 space-y-5">

            {/* Record Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Record Information
              </h3>

              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Record Name
                  </p>
                  <p className="mt-1 font-medium">
                    app.prusplunk.com
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Record Type
                  </p>
                  <p className="mt-1 font-medium">
                    A (IPv4 Address)
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Hosted Zone
                  </p>
                  <p className="mt-1 font-medium">
                    prusplunk.com
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    Alias Record
                  </p>
                  <p className="mt-1 font-medium">
                    Enabled
                  </p>
                </div>

              </div>
            </div>

            {/* Alias Target */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Alias Target
              </h3>

              <div className="rounded-lg border bg-muted/40 p-4 space-y-4">

                <div className="grid md:grid-cols-2 gap-4">

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Route Traffic To
                    </p>

                    <p className="mt-1 font-medium">
                      Application & Classic Load Balancer
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      AWS Region
                    </p>

                    <p className="mt-1 font-medium">
                      US East (N. Virginia)
                    </p>
                  </div>

                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Selected Load Balancer
                  </p>

                  <p className="mt-1 font-medium break-all">
                    dualstack.my-app-alb-123456.us-east-1.elb.amazonaws.com
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Routing Policy
                    </p>

                    <p className="mt-1 font-medium">
                      Simple Routing
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Evaluate Target Health
                    </p>

                    <p className="mt-1 font-medium">
                      Enabled
                    </p>
                  </div>

                </div>

              </div>
            </div>

            {/* DNS Preview */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                DNS Record Preview
              </h3>

              <div className="rounded-lg border bg-card">

                <table className="w-full text-sm">

                  <tbody>

                    <tr className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">
                        Name
                      </td>

                      <td className="px-4 py-3 font-medium">
                        app.prusplunk.com
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">
                        Type
                      </td>

                      <td className="px-4 py-3">
                        A
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">
                        Alias
                      </td>

                      <td className="px-4 py-3">
                        Yes
                      </td>
                    </tr>

                    <tr className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">
                        Target
                      </td>

                      <td className="px-4 py-3 break-all">
                        dualstack.my-app-alb-123456.us-east-1.elb.amazonaws.com
                      </td>
                    </tr>

                    <tr>
                      <td className="px-4 py-3 text-muted-foreground">
                        Routing Policy
                      </td>

                      <td className="px-4 py-3">
                        Simple
                      </td>
                    </tr>

                  </tbody>

                </table>

              </div>
            </div>

            {/* Notice */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">

              <p className="text-sm text-muted-foreground">
                This Route 53 DNS record will be created in the hosted zone
                <span className="font-semibold text-foreground">
                  {" "}prusplunk.com
                </span>.
                Verify the target endpoint before submitting.
              </p>

            </div>

          </div>

          {/* Footer */}
          <DialogFooter className="border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Go Back
            </Button>

            <Button
              disabled={isSubmitting}
              onClick={() => {
                setIsSubmitting(true);

                setTimeout(() => {
                  setIsSubmitting(false);
                  setIsConfirmOpen(false);
                }, 1500);
              }}
            >
              {isSubmitting ? "Creating..." : "Confirm & Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  )
}
