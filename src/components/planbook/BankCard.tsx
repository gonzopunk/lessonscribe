import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import type { ElementTemplate } from "@/lib/planbook/types";
import { usePlanBook } from "@/lib/planbook/store";

interface Props {
  template: ElementTemplate;
}

export function BankCard({ template }: Props) {
  const tags = usePlanBook((s) => s.tags);
  const tagNames = template.tagIds
    .map((id) => tags.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tpl:${template.id}`,
    data: { kind: "template", templateId: template.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="group cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md active:cursor-grabbing"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colorToken(template.color),
        backgroundColor: colorTokenSoft(template.color),
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{template.title}</p>
          {tagNames.length > 0 && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {tagNames.join(" · ")}
            </p>
          )}
        </div>
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {template.defaultMinutes} min
      </div>
    </div>
  );
}
