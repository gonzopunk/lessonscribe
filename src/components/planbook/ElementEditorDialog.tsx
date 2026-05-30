import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanBook } from "@/lib/planbook/store";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import { ColorPicker } from "./ColorPicker";
import { cn } from "@/lib/utils";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string | null;
}

export function ElementEditorDialog({ open, onOpenChange, templateId }: Props) {
  const courseId = usePlanBook((s) => s.activeCourseId)!;
  const template = usePlanBook((s) => s.templates.find((t) => t.id === templateId));
  const allTags = usePlanBook((s) => s.tags);
  const addTemplate = usePlanBook((s) => s.addTemplate);
  const updateTemplate = usePlanBook((s) => s.updateTemplate);
  const removeTemplate = usePlanBook((s) => s.removeTemplate);
  const archiveTemplate = usePlanBook((s) => s.archiveTemplate);
  const restoreTemplate = usePlanBook((s) => s.restoreTemplate);
  const tags = useMemo(
    () => allTags.filter((t) => t.courseId === courseId),
    [allTags, courseId],
  );

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [color, setColor] = useState<string>("indigo");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(template?.title ?? "");
      setDuration(template?.defaultMinutes ?? 15);
      setColor(template?.color ?? "indigo");
      setTagIds(template?.tagIds ?? []);
      setNotes(template?.notes ?? "");
      setLinks((template?.links ?? []).join("\n"));
    }
  }, [open, template]);

  const save = () => {
    const linksArr = links.split("\n").map((l) => l.trim()).filter(Boolean);
    if (template) {
      updateTemplate(template.id, {
        title,
        defaultMinutes: duration,
        color,
        tagIds,
        notes,
        links: linksArr,
      });
    } else {
      addTemplate({
        courseId,
        title: title || "Untitled",
        defaultMinutes: duration,
        color,
        tagIds,
        notes,
        links: linksArr,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Element" : "New Element"}</DialogTitle>
          <DialogDescription>
            Templates stay in the bank. Dragging onto a day creates an editable instance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Word of the Day"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dur">Default duration (min)</Label>
              <Input
                id="dur"
                type="number"
                min={1}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add tags in Settings → Category tags.
                </p>
              )}
              {tags.map((t) => {
                const on = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setTagIds(on ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id])
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    style={{
                      backgroundColor: on ? colorTokenSoft(t.color) : "transparent",
                      borderColor: on ? colorToken(t.color) : "var(--border)",
                    }}
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="links">Links (one per line)</Label>
            <Textarea
              id="links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              rows={2}
              placeholder="https://…"
            />
          </div>
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <div className="flex gap-1">
            {template && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Permanently delete "${template.title}"? Past instances on days are kept.`,
                      )
                    ) {
                      removeTemplate(template.id);
                      onOpenChange(false);
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 size-4" />
                  Delete
                </Button>
                {template.archived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      restoreTemplate(template.id);
                      onOpenChange(false);
                    }}
                  >
                    <ArchiveRestore className="mr-1 size-4" />
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      archiveTemplate(template.id);
                      onOpenChange(false);
                    }}
                  >
                    <Archive className="mr-1 size-4" />
                    Archive
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
