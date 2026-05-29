import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanBook } from "@/lib/planbook/store";
import { COURSE_COLORS, colorToken } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  dayKey: string | null;
}

export function QuickAddDialog({ open, onOpenChange, courseId, dayKey }: Props) {
  const allTags = usePlanBook((s) => s.tags);
  const addAdHocInstance = usePlanBook((s) => s.addAdHocInstance);
  const tags = useMemo(
    () => allTags.filter((t) => t.courseId === courseId),
    [allTags, courseId],
  );

  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [color, setColor] = useState<string>("indigo");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setMinutes(15);
      setColor("indigo");
      setTagIds([]);
      setContent("");
    }
  }, [open]);

  const save = () => {
    if (!dayKey) return;
    addAdHocInstance(courseId, dayKey, {
      title: title.trim() || "Untitled",
      defaultMinutes: minutes,
      color,
      tagIds,
      content: content.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add element</DialogTitle>
          <DialogDescription>
            One-off element placed on this day only. It won't appear in the Element Bank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="qa-title">Title</Label>
            <Input
              id="qa-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Guest speaker intro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-min">Duration (min)</Label>
              <Input
                id="qa-min"
                type="number"
                min={1}
                max={300}
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {COURSE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    aria-label={c.label}
                    className={cn(
                      "size-6 rounded-full ring-offset-2 ring-offset-background transition-all",
                      color === c.id ? "ring-2 ring-ring" : "",
                    )}
                    style={{ backgroundColor: colorToken(c.id) }}
                  />
                ))}
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tags (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const on = tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setTagIds(
                          on ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id],
                        )
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                        on
                          ? "border-foreground/30 bg-secondary text-foreground"
                          : "border-border bg-surface text-muted-foreground",
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
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="qa-content">Today's content (optional)</Label>
            <Textarea
              id="qa-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is this element about?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Add to day</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
