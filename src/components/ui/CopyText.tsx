import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useDialog } from "@/components/ui/dialog-context";

export function CopyText({
  text,
  label = "Text",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { alert } = useDialog();

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API is not available in this environment.");
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      alert({
        title: `Failed to copy ${label.toLowerCase()}`,
        severity: "error",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check size={12} className="text-green-500 mt-1 shrink-0" />
      ) : (
        <Copy
          size={12}
          className="text-muted-foreground cursor-pointer mt-1 shrink-0"
        />
      )}
    </button>
  );
}
