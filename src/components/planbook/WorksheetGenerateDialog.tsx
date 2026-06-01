import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlanBook } from "@/lib/planbook/store";
import { resolveFieldValue } from "@/lib/planbook/worksheetResolver";
import {
  fillWorksheetPdf,
  triggerPdfDownload,
  fillDocxTemplate,
  triggerDocxDownload,
} from "@/lib/planbook/worksheetGenerator";
import { WorksheetPreviewModal } from "@/components/planbook/WorksheetPreviewModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WorksheetGenerateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  weekMonday: Date;
}

export function WorksheetGenerateDialog({
  open,
  onOpenChange,
  courseId,
  weekMonday,
}: WorksheetGenerateDialogProps) {
  const allTemplates = usePlanBook((s) => s.worksheetTemplates);
  const allCourses = usePlanBook((s) => s.courses);
  const fullState = usePlanBook((s) => s);

  const templates = useMemo(
    () => allTemplates.filter((t) => t.courseId === courseId),
    [allTemplates, courseId],
  );
  const course = useMemo(
    () => allCourses.find((c) => c.id === courseId),
    [allCourses, courseId],
  );

  const [templateId, setTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  );
  const [mode, setMode] = useState<"editable" | "print-ready">("editable");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);

  const template = templates.find((t) => t.id === templateId) ?? null;

  const rows = useMemo(() => {
    if (!template) return [];
    return template.fieldMappings.map((m) => {
      const value = resolveFieldValue(
        m.source,
        courseId,
        weekMonday,
        fullState,
      );
      const overflow =
        typeof m.characterBudget === "number" &&
        m.characterBudget > 0 &&
        value.length > m.characterBudget;
      return { mapping: m, value, overflow };
    });
  }, [template, courseId, weekMonday, fullState]);

  const hasOverflow = rows.some((r) => r.overflow);

  const onGenerate = async () => {
    if (!template || !course) return;
    setGenerating(true);
    try {
      const isDocx = template.type === "docx-fill";
      if (isDocx) {
        const bytes = await fillDocxTemplate(
          template,
          courseId,
          weekMonday,
          fullState,
        );
        const filename = `${course.name.replace(/[^\w\-]+/g, "_")}-worksheet-${format(
          weekMonday,
          "yyyy-MM-dd",
        )}.docx`;
        triggerDocxDownload(bytes, filename);
      } else {
        const resolved: Record<string, string> = {};
        for (const r of rows) {
          resolved[r.mapping.fieldName] = r.value;
        }
        const bytes = await fillWorksheetPdf(
          template,
          resolved,
          mode === "print-ready",
        );
        const filename = `${course.name.replace(/[^\w\-]+/g, "_")}-worksheet-${format(
          weekMonday,
          "yyyy-MM-dd",
        )}.pdf`;
        triggerPdfDownload(bytes, filename);
      }
      toast.success("Worksheet downloaded");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? `Failed to generate: ${err.message}` : "Failed to generate worksheet",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Generate Worksheet — Week of {format(weekMonday, "MMM d, yyyy")}
          </DialogTitle>
          <DialogDescription>
            Fill a saved worksheet template with this week's plan data.
          </DialogDescription>
        </DialogHeader>

        {templates.length === 0 ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border bg-surface/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No worksheet templates for this course — add one in
              Settings → Worksheet Templates.
            </p>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                Open Settings
              </Button>
            </Link>
          </div>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select
                  value={templateId ?? ""}
                  onValueChange={(v) => setTemplateId(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template && (
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface/95 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Field</th>
                        <th className="px-3 py-2 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={`${r.mapping.fieldName}-${i}`}
                          className={cn(
                            "border-t border-border align-top",
                            r.overflow && "bg-amber-500/10",
                          )}
                        >
                          <td className="px-3 py-2 font-mono">
                            {r.mapping.fieldName}
                          </td>
                          <td className="px-3 py-2">
                            {r.value === "" ? (
                              <span className="italic text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-start gap-1.5">
                                {r.overflow && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      This value is {r.value.length} characters — the field box may be too small.
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span className="whitespace-pre-wrap break-words">
                                  {r.value}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(!template || template.type === "pdf-fill") && (
                <div className="space-y-2">
                  <Label>Output mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("editable")}
                      className={cn(
                        "rounded-md border p-3 text-left text-xs transition-colors",
                        mode === "editable"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      <div className="text-sm font-semibold">Editable</div>
                      <p className="mt-0.5 text-muted-foreground">
                        Fields stay live — adjust in any PDF viewer before printing.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("print-ready")}
                      className={cn(
                        "rounded-md border p-3 text-left text-xs transition-colors",
                        mode === "print-ready"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      <div className="text-sm font-semibold">Print-ready</div>
                      <p className="mt-0.5 text-muted-foreground">
                        Fields baked in — opens straight to print.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {hasOverflow && !bannerDismissed && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p className="flex-1">
                    Some fields may overflow their boxes. Review the highlighted
                    rows, or use Editable mode to adjust after generating.
                  </p>
                  <button
                    type="button"
                    onClick={() => setBannerDismissed(true)}
                    aria-label="Dismiss"
                    className="rounded p-0.5 hover:bg-amber-500/20"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              <Button
                onClick={onGenerate}
                disabled={!template || generating}
                className="w-full"
              >
                {generating && <Loader2 className="mr-2 size-4 animate-spin" />}
                {template?.type === "docx-fill" ? "Generate .docx" : "Generate PDF"}
              </Button>
            </div>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
