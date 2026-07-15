import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Tag = { key: string; value: string };

type Variant = "card" | "compact";

interface TagsEditorProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  /** "card" = framed card section, "compact" = no outer chrome (used inside <Collapsible>) */
  variant?: Variant;
  /** Label for the "add" button */
  addLabel?: string;
  /** Override default empty-state message */
  emptyMessage?: string;
  /** Max allowed tags (default 50) - drives helper text */
  max?: number;
  /** Disable editing the key for specific tag keys (e.g. "Name") */
  lockedKeys?: string[];
  /** Use monospace styling on inputs (CreateFlowLog look) */
  monoInputs?: boolean;
}

/** Reusable VPC tags editor — used by CreateVpc, CreateEncryption, CreateFlowLog */
export function TagsEditor({
  tags,
  onChange,
  variant = "compact",
  addLabel = "Add new tag",
  emptyMessage,
  max = 50,
  lockedKeys = [],
  monoInputs = false,
}: TagsEditorProps) {
  const updateTag = (i: number, field: keyof Tag, val: string) =>
    onChange(tags.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));

  const removeTag = (i: number) => onChange(tags.filter((_, j) => j !== i));
  const addTag = () => onChange([...tags, { key: "", value: "" }]);

  const inputBase = monoInputs
    ? "border border-border rounded-md px-3 py-1.5 text-xs font-mono"
    : "bg-input/40 border border-border rounded-md px-3 py-2 text-sm";

  const rows =
    tags.length === 0 ? (
      emptyMessage ? (
        <div className="text-sm text-muted-foreground mb-4">{emptyMessage}</div>
      ) : null
    ) : (
      <div className={variant === "card" ? "mb-4" : ""}>
        {tags.map((t, i) => {
          const locked = lockedKeys.includes(t.key);
          return (
            <div
              key={i}
              className={
                monoInputs
                  ? "grid grid-cols-[1fr_1fr_auto] gap-3 items-center mb-3 max-w-2xl"
                  : "grid grid-cols-[1fr_1fr_40px] gap-2 mb-2"
              }
            >
              <input
                value={t.key}
                placeholder="Key"
                disabled={locked}
                onChange={(e) => updateTag(i, "key", e.target.value)}
                className={`${
                  monoInputs ? "bg-muted/30 " : ""
                }${inputBase} disabled:opacity-60`}
              />
              <input
                value={t.value}
                placeholder="Value"
                onChange={(e) => updateTag(i, "value", e.target.value)}
                className={`${monoInputs ? "bg-background " : ""}${inputBase}`}
              />
              <button
                onClick={() => removeTag(i)}
                className={
                  monoInputs
                    ? "text-muted-foreground hover:text-destructive p-2 border border-border rounded-md hover:bg-accent/40"
                    : "text-muted-foreground hover:text-destructive grid place-items-center border border-border rounded-md"
                }
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    );

  return (
    <>
      {rows}
      <Button
        variant="outline"
        size="sm"
        onClick={addTag}
        className={
          monoInputs
            ? "text-primary border-primary hover:bg-primary/5 rounded-md px-4 text-xs"
            : "text-primary border-primary hover:bg-primary/5 rounded-full px-4"
        }
      >
        {addLabel}
      </Button>
      {!monoInputs && (
        <div className="text-xs text-muted-foreground mt-2">
          You can add {max - tags.length} more tags.
        </div>
      )}
    </>
  );
}