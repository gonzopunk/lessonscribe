import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlanBook } from "@/lib/planbook/store";
import type { OverrideKind } from "@/lib/planbook/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dayKey: string | null;
}

const KINDS: { value: OverrideKind; label: string }[] = [
  { value: "no_school", label: "No school" },
  { value: "assembly", label: "Assembly" },
  { value: "testing", label: "Testing day" },
  { value: "custom", label: "Custom event" },
];

export function CalendarOverrideDialog({ open, onOpenChange, dayKey }: Props) {
  const existing = usePlanBook((s) => (dayKey ? s.overrides[dayKey] : undefined));
  const setOverride = usePlanBook((s) => s.setOverride);
  const clearOverride = usePlanBook((s) => s.clearOverride);

  const [kind, setKind] = useState<OverrideKind>(existing?.kind ?? "no_school");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  if (!dayKey) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calendar override</DialogTitle>
          <DialogDescription>{dayKey}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as OverrideKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-label">Label</Label>
            <Input
              id="ov-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Pep rally"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-note">Note</Label>
            <Textarea
              id="ov-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              clearOverride(dayKey);
              onOpenChange(false);
            }}
            disabled={!existing}
            className="text-destructive hover:text-destructive"
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOverride(dayKey, { kind, label, note, source: "manual" });
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
