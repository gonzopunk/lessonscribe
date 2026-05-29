import { useMemo } from "react";
import { usePlanBook } from "@/lib/planbook/store";
import { colorToken } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";

export function FilterBar() {
  const allTags = usePlanBook((s) => s.tags);
  const activeCourseId = usePlanBook((s) => s.activeCourseId);
  const selected = usePlanBook((s) => s.selectedFilterTagIds);
  const toggle = usePlanBook((s) => s.toggleFilterTag);
  const setMany = usePlanBook((s) => s.setFilterTags);
  const tags = useMemo(
    () => allTags.filter((t) => t.courseId === activeCourseId),
    [allTags, activeCourseId],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-surface/40">
      <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Filter bank
      </span>
      <button
        onClick={() => setMany([])}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          selected.length === 0
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border bg-surface text-muted-foreground hover:bg-secondary",
        )}
      >
        All
      </button>
      {tags.map((t) => {
        const on = selected.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              on
                ? "border-foreground/30 bg-secondary text-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-secondary",
            )}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: colorToken(t.color) }}
            />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

