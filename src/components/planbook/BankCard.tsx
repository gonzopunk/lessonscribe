import { useDraggable } from "@dnd-kit/core";
import { GripVertical, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import type { ElementTemplate } from "@/lib/planbook/types";
import { usePlanBook } from "@/lib/planbook/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  template: ElementTemplate;
  onEdit?: () => void;
}

export function BankCard({ template, onEdit }: Props) {
  const tags = usePlanBook((s) => s.tags);
  const archiveTemplate = usePlanBook((s) => s.archiveTemplate);
  const restoreTemplate = usePlanBook((s) => s.restoreTemplate);
  const removeTemplate = usePlanBook((s) => s.removeTemplate);
  const tagNames = template.tagIds
    .map((id) => tags.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  const isArchived = !!template.archived;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tpl:${template.id}`,
    data: { kind: "template", templateId: template.id },
    disabled: isArchived,
  });

  return (
    <div
      ref={setNodeRef}
      {...(isArchived ? {} : attributes)}
      {...(isArchived ? {} : listeners)}
      className={cn(
        "group relative rounded-lg border border-border bg-surface p-3 shadow-sm transition-all",
        isArchived
          ? "cursor-default opacity-60"
          : "cursor-grab hover:border-primary/50 hover:shadow-md active:cursor-grabbing",
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: colorToken(template.color),
        backgroundColor: colorTokenSoft(template.color),
        opacity: isDragging ? 0.4 : isArchived ? 0.6 : 1,
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
        <div className="flex shrink-0 items-center gap-0.5">
          {!isArchived && (
            <GripVertical className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Element menu"
            >
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 size-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              {isArchived ? (
                <DropdownMenuItem onClick={() => restoreTemplate(template.id)}>
                  <ArchiveRestore className="mr-2 size-3.5" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => archiveTemplate(template.id)}>
                  <Archive className="mr-2 size-3.5" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      `Permanently delete "${template.title}"? Past instances on days are kept.`,
                    )
                  ) {
                    removeTemplate(template.id);
                  }
                }}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {template.defaultMinutes} min
        {isArchived && <span className="ml-2 text-muted-foreground/70">· Archived</span>}
      </div>
    </div>
  );
}
