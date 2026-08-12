import { cn } from "@/lib/utils";

export function RadioRow({
  checked,
  onChange,
  title,
  desc,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  desc?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-2 py-1", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <div>
        <div className="text-sm">{title}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
    </label>
  );
}
