import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { format } from "date-fns";
import { AlertTriangle, FileText, Plus, Trash2, Upload } from "lucide-react";
import { usePlanBook } from "@/lib/planbook/store";
import {
  colorToken,
  colorTokenSoft,
} from "@/lib/planbook/constants";
import { resolveFieldValue } from "@/lib/planbook/worksheetResolver";
import { mondayOf, parseDayKey } from "@/lib/planbook/dates";
import type {
  DayOffset,
  FieldMapping,
  FieldSource,
  WorksheetTemplate,
} from "@/lib/planbook/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const DAYS: { offset: DayOffset; label: string }[] = [
  { offset: 0, label: "Mon" },
  { offset: 1, label: "Tue" },
  { offset: 2, label: "Wed" },
  { offset: 3, label: "Thu" },
  { offset: 4, label: "Fri" },
];

type SourceKind = FieldSource["type"];

function defaultSourceForKind(kind: SourceKind): FieldSource {
  switch (kind) {
    case "element-content":
      return { type: "element-content", dayOffset: 0, tagId: "" };
    case "element-titles":
      return { type: "element-titles", dayOffset: 0, separator: "\\n" };
    case "day-notes":
      return { type: "day-notes", dayOffset: 0 };
    case "day-objectives":
      return { type: "day-objectives", dayOffset: 0 };
    case "day-differentiation":
      return { type: "day-differentiation", dayOffset: 0 };
    case "day-behavior":
      return { type: "day-behavior", dayOffset: 0 };
    case "day-materials":
      return { type: "day-materials", dayOffset: 0 };
    case "week-of-date":
      return { type: "week-of-date", format: "MMMM d, yyyy" };
    case "day-date":
      return { type: "day-date", dayOffset: 0, format: "MMMM d" };
    case "static":
      return { type: "static", text: "" };
    case "week-objectives":
      return { type: "week-objectives" };
    case "week-essential-question":
      return { type: "week-essential-question" };
    case "week-notes":
      return { type: "week-notes" };
    case "week-custom":
      return { type: "week-custom", fieldKey: "custom1" };
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function WorksheetTemplateSettings() {
  const courses = usePlanBook((s) => s.courses);
  const worksheetTemplates = usePlanBook((s) => s.worksheetTemplates);
  const addWorksheetTemplate = usePlanBook((s) => s.addWorksheetTemplate);
  const updateWorksheetTemplate = usePlanBook((s) => s.updateWorksheetTemplate);
  const removeWorksheetTemplate = usePlanBook((s) => s.removeWorksheetTemplate);

  const [editingId, setEditingId] = useState<string | null>(null);

  const startNew = (type: "pdf-fill" | "docx-fill") => {
    if (courses.length === 0) {
      toast.error("Add a course first.");
      return;
    }
    const id = addWorksheetTemplate({
      type,
      courseId: courses[0].id,
      name: "Untitled worksheet",
      detectedFields: [],
      loopFields: type === "docx-fill" ? [] : undefined,
      fieldMappings: [],
    });
    setEditingId(id);
  };

  if (editingId) {
    const tpl = worksheetTemplates.find((t) => t.id === editingId);
    if (!tpl) {
      setEditingId(null);
      return null;
    }
    return (
      <TemplateEditor
        template={tpl}
        onClose={() => setEditingId(null)}
        onChange={(patch) => updateWorksheetTemplate(tpl.id, patch)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Add a PDF form template (AcroForm fields) or a Word document template
          ({"{{field_name}}"} placeholders), then map each field to weekly plan
          data.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startNew("pdf-fill")}>
            <Plus className="mr-1 size-4" />
            Add PDF template
          </Button>
          <Button variant="outline" size="sm" onClick={() => startNew("docx-fill")}>
            <Plus className="mr-1 size-4" />
            Add Word template
          </Button>
        </div>
      </div>

      {worksheetTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No worksheet templates yet.
        </div>
      ) : (
        <div className="space-y-2">
          {worksheetTemplates.map((tpl) => {
            const course = courses.find((c) => c.id === tpl.courseId);
            return (
              <div
                key={tpl.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <FileText className="size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{tpl.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {course && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: colorToken(course.color) }}
                        />
                        {course.name}
                      </span>
                    )}
                    <span>·</span>
                    <span>
                      {tpl.detectedFields.length} field
                      {tpl.detectedFields.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(tpl.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete template"
                  onClick={() => {
                    if (confirm(`Delete worksheet template "${tpl.name}"?`)) {
                      removeWorksheetTemplate(tpl.id);
                    }
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TemplateEditorProps {
  template: WorksheetTemplate;
  onClose: () => void;
  onChange: (patch: Partial<WorksheetTemplate>) => void;
}

function TemplateEditor({ template, onClose, onChange }: TemplateEditorProps) {
  const courses = usePlanBook((s) => s.courses);
  const tags = usePlanBook((s) => s.tags);
  const anchorDate = usePlanBook((s) => s.anchorDate);
  const fullState = usePlanBook();
  const removeWorksheetTemplate = usePlanBook((s) => s.removeWorksheetTemplate);

  const previewMonday = useMemo(
    () => mondayOf(parseDayKey(anchorDate)),
    [anchorDate],
  );

  const courseTags = useMemo(
    () => tags.filter((t) => t.courseId === template.courseId),
    [tags, template.courseId],
  );

  const onPdfFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const form = doc.getForm();
      const names = form.getFields().map((f) => f.getName());
      const base64 = await fileToBase64(file);
      // Preserve existing mappings for fields that still exist
      const keptMappings = template.fieldMappings.filter((m) =>
        names.includes(m.fieldName),
      );
      const newMappings: FieldMapping[] = names.map(
        (name) =>
          keptMappings.find((m) => m.fieldName === name) ?? {
            fieldName: name,
            source: { type: "static", text: "" },
          },
      );
      onChange({
        pdfBase64: base64,
        detectedFields: names,
        fieldMappings: newMappings,
      });
      if (names.length === 0) {
        toast.warning("PDF uploaded but no fillable fields were detected.");
      } else {
        toast.success(`Detected ${names.length} field${names.length === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Could not read PDF: ${err.message}`
          : "Could not read PDF.",
      );
      onChange({ pdfBase64: "", detectedFields: [], fieldMappings: [] });
    }
  };

  const updateMapping = (idx: number, patch: Partial<FieldMapping>) => {
    const next = template.fieldMappings.map((m, i) =>
      i === idx ? { ...m, ...patch } : m,
    );
    onChange({ fieldMappings: next });
  };

  const setSourceKind = (idx: number, kind: SourceKind) => {
    updateMapping(idx, { source: defaultSourceForKind(kind) });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Template name</Label>
            <Input
              value={template.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select
              value={template.courseId}
              onValueChange={(v) => onChange({ courseId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>PDF file</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface/40 p-6 text-sm text-muted-foreground hover:border-primary/50 hover:bg-surface">
            <Upload className="size-5" />
            <span>
              {template.pdfBase64
                ? "Replace PDF (drag or click)"
                : "Drop a PDF here, or click to upload"}
            </span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPdfFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {template.pdfBase64 && template.detectedFields.length === 0 && (
            <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              No fillable fields found. Make sure your PDF has named AcroForm
              text fields added in a PDF editor such as PDF24 or Adobe Acrobat.
            </p>
          )}
          {template.detectedFields.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {template.detectedFields.length} fields detected:
              </span>{" "}
              <span className="font-mono">
                {template.detectedFields.join(", ")}
              </span>
            </p>
          )}
        </div>

        {template.fieldMappings.length > 0 && (
          <div className="space-y-2">
            <Label>Field mappings</Label>
            <p className="text-xs text-muted-foreground">
              Preview values use the currently anchored week ({format(previewMonday, "MMM d, yyyy")})
              and the course selected above.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface/60 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field name</th>
                    <th className="px-3 py-2 font-semibold">Data source</th>
                    <th className="px-3 py-2 font-semibold">Budget</th>
                    <th className="px-3 py-2 font-semibold">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {template.fieldMappings.map((m, idx) => {
                    const preview = resolveFieldValue(
                      m.source,
                      template.courseId,
                      previewMonday,
                      fullState,
                    );
                    const overflow =
                      typeof m.characterBudget === "number" &&
                      m.characterBudget > 0 &&
                      preview.length > m.characterBudget;
                    return (
                      <tr
                        key={`${m.fieldName}-${idx}`}
                        className={cn(
                          "border-t border-border align-top",
                          overflow && "bg-amber-500/10",
                        )}
                      >
                        <td className="px-3 py-2 font-mono">{m.fieldName}</td>
                        <td className="px-3 py-2">
                          <SourceEditor
                            source={m.source}
                            tags={courseTags}
                            onKindChange={(k) => setSourceKind(idx, k)}
                            onSourceChange={(s) => updateMapping(idx, { source: s })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Input
                                type="number"
                                min={0}
                                value={m.characterBudget ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateMapping(idx, {
                                    characterBudget:
                                      v === "" ? undefined : Math.max(0, parseInt(v, 10) || 0),
                                  });
                                }}
                                className="h-8 w-20"
                                placeholder="—"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              Soft character limit. Preview warns if content exceeds this.
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="px-3 py-2">
                          {preview === "" ? (
                            <span className="italic text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              {overflow && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Content may overflow the field. Consider a larger field box or shorter content.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <span className="whitespace-pre-wrap break-words">
                                {preview}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Delete worksheet template "${template.name}"?`)) {
                removeWorksheetTemplate(template.id);
                onClose();
              }
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-1 size-4" />
            Delete
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface SourceEditorProps {
  source: FieldSource;
  tags: { id: string; name: string; color: string }[];
  onKindChange: (k: SourceKind) => void;
  onSourceChange: (s: FieldSource) => void;
}

function SourceEditor({
  source,
  tags,
  onKindChange,
  onSourceChange,
}: SourceEditorProps) {
  const sourceLabels: Record<SourceKind, string> = {
    "element-content": "Element content",
    "element-titles": "Element titles joined",
    "day-notes": "Day notes",
    "day-objectives": "Day objectives",
    "day-differentiation": "Day differentiation",
    "day-behavior": "Day behavior notes",
    "day-materials": "Day materials",
    "week-of-date": "Week-of date",
    "day-date": "Day date",
    static: "Static text",
    "week-objectives": "Weekly objectives",
    "week-essential-question": "Essential question",
    "week-notes": "Weekly notes",
    "week-custom": "Custom weekly note",
  };

  const hasDay =
    source.type === "element-content" ||
    source.type === "element-titles" ||
    source.type === "day-notes" ||
    source.type === "day-objectives" ||
    source.type === "day-differentiation" ||
    source.type === "day-behavior" ||
    source.type === "day-materials" ||
    source.type === "day-date";

  const dayOffset =
    hasDay && "dayOffset" in source ? source.dayOffset : 0;

  return (
    <div className="space-y-2">
      <Select value={source.type} onValueChange={(v) => onKindChange(v as SourceKind)}>
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(sourceLabels) as SourceKind[]).map((k) => (
            <SelectItem key={k} value={k}>
              {sourceLabels[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasDay && (
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button
              key={d.offset}
              type="button"
              onClick={() =>
                onSourceChange({ ...source, dayOffset: d.offset } as FieldSource)
              }
              className={cn(
                "h-7 w-10 rounded-md border text-[11px] font-semibold transition-colors",
                dayOffset === d.offset
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {(source.type === "element-content" || source.type === "element-titles") && (
        <Select
          value={
            source.type === "element-content"
              ? source.tagId || "__none"
              : source.tagId ?? "__any"
          }
          onValueChange={(v) => {
            if (source.type === "element-content") {
              onSourceChange({ ...source, tagId: v === "__none" ? "" : v });
            } else {
              onSourceChange({
                ...source,
                tagId: v === "__any" ? undefined : v,
              });
            }
          }}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            {source.type === "element-titles" && (
              <SelectItem value="__any">Any tag</SelectItem>
            )}
            {source.type === "element-content" && (
              <SelectItem value="__none">— Select tag —</SelectItem>
            )}
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {source.type === "element-titles" && (
        <div className="space-y-1">
          <Input
            value={source.separator}
            onChange={(e) =>
              onSourceChange({ ...source, separator: e.target.value })
            }
            className="h-8 w-[180px]"
            placeholder="\n"
          />
          <p className="text-[10px] text-muted-foreground">Use \n for line breaks</p>
        </div>
      )}

      {source.type === "week-of-date" && (
        <div className="space-y-1">
          <Input
            value={source.format}
            onChange={(e) =>
              onSourceChange({ ...source, format: e.target.value })
            }
            className="h-8 w-[180px]"
            placeholder="MMMM d, yyyy"
          />
          <p className="text-[10px] text-muted-foreground">
            Example: {format(new Date(), source.format || "MMMM d, yyyy")}
          </p>
        </div>
      )}

      {source.type === "day-date" && (
        <div className="space-y-1">
          <Input
            value={source.format}
            onChange={(e) =>
              onSourceChange({ ...source, format: e.target.value })
            }
            className="h-8 w-[180px]"
            placeholder="MMMM d"
          />
          <p className="text-[10px] text-muted-foreground">
            Example: {format(new Date(), source.format || "MMMM d")}
          </p>
        </div>
      )}

      {source.type === "static" && (
        <Input
          value={source.text}
          onChange={(e) => onSourceChange({ ...source, text: e.target.value })}
          className="h-8 w-[220px]"
          placeholder="Static text"
        />
      )}

      {source.type === "week-custom" && (
        <Select
          value={source.fieldKey}
          onValueChange={(v) =>
            onSourceChange({ ...source, fieldKey: v as "custom1" | "custom2" })
          }
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom1">Custom note 1</SelectItem>
            <SelectItem value="custom2">Custom note 2</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// Suppress unused-import warning for colorTokenSoft if tree-shaking complains
export const _colorTokenSoft = colorTokenSoft;
