import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  selectedLabel?: string;
  icon?: React.ElementType;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  className,
  selectedLabel = "selected",
  icon: Icon,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start hover:bg-accent hover:text-accent-foreground",
            className
          )}
        >
          {Icon && <Icon className="mr-2 h-4 w-4 flex-shrink-0" />}
          <span className="flex-1 text-left truncate">
            {selected.length === 0
              ? placeholder
              : `${selected.length} ${selectedLabel}`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-64 overflow-auto p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 rounded-sm px-2 py-1 cursor-pointer hover:bg-accent hover:text-accent-foreground relative"
              onClick={() => handleSelect(option.value)}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {selected.includes(option.value) && (
                  <Check className="h-4 w-4" />
                )}
              </div>
              <span className="text-sm flex-1">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
