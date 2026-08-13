import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS, type CategoryType } from "@/types";

type Props = {
  visibleCategories: typeof CATEGORY_OPTIONS;
  category: CategoryType | null;
  setCategory: (value: CategoryType) => void;
};

export function CategorySelectionSection({ visibleCategories, category, setCategory }: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        Category Selection
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCategories.map((cat) => (
          <div
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              "p-4 rounded-xl border transition cursor-pointer",
              category === cat.value
                ? "border-primary bg-primary/10"
                : "border-muted",
            )}
          >
            <h3 className="text-md font-semibold flex items-center gap-2">
              {cat.label}
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              {cat.description}
            </p>
          </div>
        ))}
      </div>

      {visibleCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No categories assigned. Contact admin.
        </p>
      )}
    </section>
  );
}
