import { useEffect, useState } from "react";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "./ErrorBoundary";
import { listDailySnapshots, restoreFromDailySnapshot } from "@/lib/planbook/sync";
import { applyRestoredSnapshot } from "@/lib/planbook/cloudSync";
import type { PlanBookState } from "@/lib/planbook/types";

type Entry = { dayKey: string; archivedAt: string };

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelFor(entry: Entry): string {
  const now = new Date();
  const today = localDayKey(now);
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterday = localDayKey(yest);
  if (entry.dayKey === today) return "Today";
  if (entry.dayKey === yesterday) return "Yesterday";
  return format(new Date(entry.archivedAt), "EEE, MMM d");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Body({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<Entry | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listDailySnapshots()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function doRestore(entry: Entry) {
    setRestoring(true);
    setError(null);
    try {
      const result = await restoreFromDailySnapshot({ data: { dayKey: entry.dayKey } });
      if (!result) {
        setError("That snapshot could not be found.");
        setRestoring(false);
        return;
      }
      applyRestoredSnapshot(result.data as Partial<PlanBookState>, result.updatedAt);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }

  if (error && !confirmFor) {
    return (
      <div className="py-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (confirmFor) {
    const label = labelFor(confirmFor);
    return (
      <div className="space-y-4 py-2">
        <p className="text-sm">
          Restore your plan to <span className="font-medium">{label}</span>? Your
          current plan will be saved and you can undo this restore.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={restoring}
            onClick={() => {
              setConfirmFor(null);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={restoring}
            onClick={() => void doRestore(confirmFor)}
          >
            {restoring ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Restoring…
              </>
            ) : (
              "Restore"
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No history available yet — snapshots are saved automatically once per day.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => {
        const label = labelFor(entry);
        const time = format(new Date(entry.archivedAt), "'saved at' h:mm a");
        return (
          <li
            key={entry.dayKey}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmFor(entry)}
            >
              Restore
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function RestoreHistoryDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Restore from history
          </DialogTitle>
          <DialogDescription>
            Up to 7 daily snapshots of your plan are kept automatically.
          </DialogDescription>
        </DialogHeader>
        <ErrorBoundary label="restore history">
          {open ? <Body onOpenChange={onOpenChange} /> : null}
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}

export default RestoreHistoryDialog;
