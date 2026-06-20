import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import { usePlanBook } from "@/lib/planbook/store";
import { useDebouncedCallback } from "@/lib/planbook/hooks";
import type { ElementInstance } from "@/lib/planbook/types";
import { cn } from "@/lib/utils";

interface Props {
  instance: ElementInstance;
  compact?: boolean;
  density?: "comfortable" | "compact";
}

export function InstanceCard({ instance, compact, density = "comfortable" }: Props) {
  const updateInstance = usePlanBook((s) => s.updateInstance);
  const removeInstance = usePlanBook((s) => s.removeInstance);
  const allTags = usePlanBook((s) => s.tags);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(instance.content);
  const [instanceNotes, setInstanceNotes] = useState(instance.instanceNotes);

  useEffect(() => {
    if (open) {
      setContent(instance.content);
      setInstanceNotes(instance.instanceNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance.id]);

  const debouncedSaveContent = useDebouncedCallback(
    (value: string) => updateInstance(instance.id, { content: value }),
    300,
  );
  const debouncedSaveNotes = useDebouncedCallback(
    (value: string) => updateInstance(instance.id, { instanceNotes: value }),
    300,
  );
  const minutes = instance.durationOverride ?? instance.defaultMinutes;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: instance.id,
      data: { kind: "instance", instanceId: instance.id, dayKey: instance.dayKey },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    backgroundColor: colorTokenSoft(instance.color),
    borderLeftColor: colorToken(instance.color),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-border bg-surface text-foreground transition-opacity",
      )}
    >
      <button
        type="button"
        aria-label="Remove element from day"
        onClick={(e) => {
          e.stopPropagation();
          const hasData = instance.content?.trim() || instance.instanceNotes?.trim();
          if (hasData && !window.confirm(`Remove "${instance.title}" from this day?`)) return;
          removeInstance(instance.id);
        }}
        className="absolute right-0.5 top-0.5 z-10 flex size-4 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
      <div
        className="flex items-stretch border-l-[3px] rounded-md"
        style={{ borderLeftColor: colorToken(instance.color) }}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag element"
          className="flex w-5 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-3" />
        </button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className={cn("min-w-0 flex-1 pr-5 text-left", density === "compact" ? "px-1.5 py-1" : "px-1.5 py-1.5")}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{instance.title}</span>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                  {minutes}m
                </span>
              </div>
              {!compact && instance.content && (
                <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-foreground/80">
                  {instance.content}
                </p>
              )}
              {!compact && !instance.content && (
                <p className="mt-0.5 text-[10px] italic text-muted-foreground/70">
                  click to add today's content…
                </p>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {instance.title}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`c-${instance.id}`} className="text-xs">
                  Today's content
                </Label>
                <Input
                  id={`c-${instance.id}`}
                  autoFocus
                  value={content}
                  onChange={(e) => {
                    const v = e.target.value;
                    setContent(v);
                    debouncedSaveContent(v);
                  }}
                  placeholder="e.g. the actual Word of the Day"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`d-${instance.id}`} className="text-xs">
                  Duration override (min) — default {instance.defaultMinutes}
                </Label>
                <Input
                  id={`d-${instance.id}`}
                  type="number"
                  min={0}
                  value={instance.durationOverride ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateInstance(instance.id, {
                      durationOverride: v === "" ? null : parseInt(v) || 0,
                    });
                  }}
                  placeholder="leave blank for default"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`n-${instance.id}`} className="text-xs">
                  Instance notes
                </Label>
                <Textarea
                  id={`n-${instance.id}`}
                  rows={2}
                  value={instanceNotes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInstanceNotes(v);
                    debouncedSaveNotes(v);
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
