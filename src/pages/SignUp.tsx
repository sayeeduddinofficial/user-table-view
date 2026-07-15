import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Server } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";

export default function SignUp() {
    const { alert } = useDialog();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      alert({
        title: "Full name and email are required",
        severity: "error"
      })
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert({
          title: data.message || "Failed to submit request",
          severity: "error"
        })
        return;
      }

      alert({
        title: "Your access request has been submitted. An Admin will review it.",
        severity: "success"
      })

      setFullName("");
      setEmail("");
    } catch (error) {
      alert({
        title: "Something went wrong",
        severity: "error"
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20">
            <Server className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mt-4">Request Access</h1>
          <p className="text-muted-foreground mt-1">
            Enter your details to request access
          </p>
        </div>

        <div className="border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label  htmlFor="fullname"
               className="text-foreground/90">Full Name</Label>
              <Input
                placeholder="John Doe"
                value={fullName}
                className="bg-muted/50 border-border/50 focus:border-primary  h-11"
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/90">Email Address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                className="bg-muted/50 border-border/50 focus:border-primary  h-11"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="text-secondary font-medium">Prudent</span>{" "}
          Infrastructure
        </p>
      </div>
    </div>
  );
}
