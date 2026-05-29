import { useMemo, useState } from "react";
import { Plus, ChevronRight, ChevronLeft, Search } from "lucide-react";
import { usePlanBook } from "@/lib/planbook/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { BankCard } from "./BankCard";
import { ElementEditorDialog } from "./ElementEditorDialog";
import { cn } from "@/lib/utils";
import { colorToken } from "@/lib/planbook/constants";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function ElementBank({ collapsed, onToggle }: Props) {
  const activeCourseId = usePlanBook((s) => s.activeCourseId);
  const allTemplates = usePlanBook((s) => s.templates);
  const allTags = usePlanBook((s) => s.tags);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const templates = useMemo(
    () => allTemplates.filter((t) => t.courseId === activeCourseId),
    [allTemplates, activeCourseId],
  );
  const tags = useMemo(
    () => allTags.filter((t) => t.courseId === activeCourseId),
    [allTags, activeCourseId],
  );

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="flex h-full w-10 flex-col items-center justify-center gap-2 border-l border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Open element bank"
      >
        <ChevronLeft className="size-4" />
        <span className="rotate-180 [writing-mode:vertical-rl] text-[10px] font-bold uppercase tracking-widest">
          Element Bank
        </span>
      </button>
    );
  }

  const filtered = templates.filter((t) =>
    search.trim() ? t.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const grouped = new Map<string | null, typeof filtered>();
  filtered.forEach((t) => {
    const key = t.tagIds[0] ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  });

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Element Bank
        </h2>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Collapse element bank">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elements…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-3">
          {[...grouped.entries()].map(([tagId, items]) => {
            const tag = tags.find((t) => t.id === tagId);
            return (
              <section key={tagId ?? "untagged"} className="space-y-2">
                <h3 className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {tag && (
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: colorToken(tag.color) }}
                    />
                  )}
                  {tag?.name ?? "Untagged"}
                </h3>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      onDoubleClick={() => {
                        setEditingId(t.id);
                        setEditorOpen(true);
                      }}
                      title="Drag onto a day, or double-click to edit"
                    >
                      <BankCard template={t} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No elements yet. Create one to start planning.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-surface-2/50 p-3">
        <Button
          className="w-full"
          size="sm"
          onClick={() => {
            setEditingId(null);
            setEditorOpen(true);
          }}
          disabled={!activeCourseId}
        >
          <Plus className="mr-1 size-4" />
          New Element
        </Button>
      </div>

      <ElementEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        templateId={editingId}
      />
    </aside>
  );
}

// dummy export for cn import removal-safety
export const _cn = cn;
