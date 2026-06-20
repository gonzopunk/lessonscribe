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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { dayKey as toKey, parseDayKey } from "@/lib/planbook/dates";
import { addDays, format } from "date-fns";
import { colorToHex } from "@/lib/planbook/constants";
import {
  buildPrintDocument,
  openPrintWindow,
  renderCoverPage,
  renderPlanHTML,
} from "@/lib/planbook/printPlan";
import {
  EXPORT_FONT_OPTIONS,
  EXPORT_PRESETS,
  type ExportProfile,
  type ExportPresetId,
  type ExportSectionFlags,
  makeProfile,
} from "@/lib/planbook/exportPresets";
import { Printer } from "lucide-react";
import { PrintPreview } from "./PrintPreview";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialFrom?: string;
  initialTo?: string;
}

const PRESET_LABELS: Record<Exclude<ExportPresetId, "custom">, string> = {
  teacher: "Teacher (working copy)",
  sub: "Substitute packet",
  admin: "Admin / observer summary",
  formal: "Formal lesson plan",
};

const SECTION_GROUPS: Array<{ key: keyof ExportSectionFlags; label: string; group: "lesson" | "sub" | "both" }> = [
  { key: "coverPage", label: "Cover page", group: "both" },
  { key: "runningHeader", label: "Running header", group: "both" },
  { key: "pageNumbers", label: "Page numbers", group: "both" },
  { key: "tagLegend", label: "Tag legend", group: "both" },
  { key: "objectives", label: "Learning objectives", group: "lesson" },
  { key: "standards", label: "Standards", group: "lesson" },
  { key: "sequence", label: "Lesson sequence", group: "both" },
  { key: "dayNotes", label: "Day notes", group: "both" },
  { key: "sectionNotes", label: "Section notes", group: "both" },
  { key: "reflection", label: "Reflection", group: "lesson" },
  { key: "differentiation", label: "Differentiation / 504 & IEP", group: "both" },
  { key: "behaviorNotes", label: "Behavior notes", group: "lesson" },
  { key: "materials", label: "Materials needed", group: "both" },
  { key: "subNotes", label: "Sub notes", group: "sub" },
];

const PREVIEW_PAGE_CAP = 10;

export function ExportDialog({ open, onOpenChange }: Props) {
  const state = usePlanBook();
  const courses = state.courses;
  const monthCourseIds = state.settings.monthCourseIds;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [from, setFrom] = useState(format(monthStart, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(monthEnd, "yyyy-MM-dd"));
  const [pickedCourses, setPickedCourses] = useState<string[]>(
    monthCourseIds.length ? monthCourseIds : courses.map((c) => c.id),
  );
  const [profile, setProfile] = useState<ExportProfile>(() => makeProfile("teacher"));

  const setPreset = (preset: ExportPresetId) => {
    if (preset === "custom") {
      setProfile((p) => ({ ...p, preset: "custom" }));
      return;
    }
    setProfile((p) => ({
      ...makeProfile(preset),
      header: p.header,
    }));
  };

  const toggleCourse = (id: string) =>
    setPickedCourses((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const setSection = (key: keyof ExportSectionFlags, val: boolean) =>
    setProfile((p) => ({
      ...p,
      preset: "custom",
      sections: { ...p.sections, [key]: val },
    }));

  const setLayout = (patch: Partial<ExportProfile>) =>
    setProfile((p) => ({ ...p, preset: "custom", ...patch }));

  const setHeader = (patch: Partial<ExportProfile["header"]>) =>
    setProfile((p) => ({ ...p, header: { ...p.header, ...patch } }));

  const visibleSectionKeys = useMemo(
    () =>
      SECTION_GROUPS.filter(
        (s) => s.group === "both" || s.group === profile.mode,
      ),
    [profile.mode],
  );

  // Shared doc builder for preview + print
  const buildDoc = (limit?: number) => {
    const start = parseDayKey(from);
    const end = parseDayKey(to);
    const days: string[] = [];
    if (end >= start) {
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(toKey(d));
    }

    const sectionsHtml: string[] = [];
    const primaryHex =
      pickedCourses.length > 0
        ? colorToHex(courses.find((c) => c.id === pickedCourses[0])?.color ?? "indigo")
        : "#2563eb";

    if (profile.sections.coverPage) {
      const courseLabels =
        pickedCourses
          .map((cid) => courses.find((c) => c.id === cid)?.name)
          .filter(Boolean)
          .join(", ") || "All courses";
      sectionsHtml.push(
        renderCoverPage({
          title: profile.mode === "sub" ? "Substitute Plan" : "Lesson Plans",
          subtitle: `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")} · ${courseLabels}`,
          header: profile.header,
        }),
      );
    }

    let first = !profile.sections.coverPage;
    let totalPages = 0;
    let renderedPages = 0;
    for (const cid of pickedCourses) {
      const course = courses.find((c) => c.id === cid);
      if (!course) continue;
      for (const dk of days) {
        const instances = state.instances
          .filter((i) => i.courseId === cid && i.dayKey === dk)
          .sort((a, b) => a.order - b.order);
        if (!profile.includeEmpty && instances.length === 0) continue;
        totalPages++;
        if (limit != null && renderedPages >= limit) continue;
        const meta = getDayMeta(state, cid, dk);
        const html = renderPlanHTML({
          course,
          dayKey: dk,
          meta,
          instances,
          allTags: state.tags,
          mode: profile.mode,
          compact: profile.compact,
          sections: profile.sections,
          header: profile.header,
        });
        sectionsHtml.push(`<div class="${first ? "" : "page-break"}">${html}</div>`);
        first = false;
        renderedPages++;
      }
    }

    const title = `${profile.mode === "sub" ? "Sub" : "Lesson"} Plans · ${from} → ${to}`;
    const runningHeaderText = profile.header.teacherName
      ? `${profile.header.teacherName}${profile.header.schoolName ? " · " + profile.header.schoolName : ""} — ${title}`
      : title;

    const coverPages = profile.sections.coverPage ? 1 : 0;
    return {
      title,
      primaryHex,
      runningHeaderText,
      bodyHTML: sectionsHtml.join("") || "<p style='padding:40px;color:#999;text-align:center'>No plans in range.</p>",
      totalPages: totalPages + coverPages,
      renderedPages: renderedPages + coverPages,
    };
  };

  const exportNow = () => {
    if (parseDayKey(to) < parseDayKey(from)) return;
    const doc = buildDoc();
    openPrintWindow({
      title: doc.title,
      courseColorHex: doc.primaryHex,
      bodyHTML: doc.bodyHTML,
      fontFamily: profile.fontFamily,
      orientation: profile.orientation,
      pageNumbers: profile.sections.pageNumbers,
      runningHeader: profile.sections.runningHeader,
      runningHeaderText: doc.runningHeaderText,
    });
    onOpenChange(false);
  };

  const preview = useMemo(() => {
    const doc = buildDoc(PREVIEW_PAGE_CAP);
    const docHTML = buildPrintDocument({
      title: doc.title,
      courseColorHex: doc.primaryHex,
      bodyHTML: doc.bodyHTML,
      fontFamily: profile.fontFamily,
      orientation: profile.orientation,
      // Running header / page numbers rely on @page CSS which doesn't render in iframe; omit.
      pageNumbers: false,
      runningHeader: false,
    });
    const hidden = Math.max(0, doc.totalPages - doc.renderedPages);
    return {
      docHTML,
      totalPages: doc.totalPages,
      truncatedNote:
        hidden > 0
          ? `Preview shows the first ${PREVIEW_PAGE_CAP} pages. ${hidden} more page${hidden === 1 ? "" : "s"} will be included when you print.`
          : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, from, to, pickedCourses, state.instances, state.tags, state.courses, state.overrides]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Export plans</DialogTitle>
          <DialogDescription>
            Pick a preset or customize every section. The preview updates as you change options.
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-5 overflow-y-auto pr-1">
            <Tabs defaultValue="preset" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="preset">Preset</TabsTrigger>
                <TabsTrigger value="scope">Scope</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
                <TabsTrigger value="header">Header</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>

              <TabsContent value="preset" className="space-y-2 pt-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Choose a starting point
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(PRESET_LABELS) as Array<keyof typeof PRESET_LABELS>).map(
                    (k) => {
                      const active = profile.preset === k;
                      return (
                        <button
                          key={k}
                          onClick={() => setPreset(k)}
                          className={`rounded-md border p-3 text-left transition-colors ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-secondary"
                          }`}
                        >
                          <div className="text-sm font-semibold">{PRESET_LABELS[k]}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {EXPORT_PRESETS[k].mode === "sub" ? "Sub plan" : "Lesson plan"} ·{" "}
                            {EXPORT_PRESETS[k].orientation} ·{" "}
                            {EXPORT_FONT_OPTIONS.find(
                              (f) => f.id === EXPORT_PRESETS[k].fontFamily,
                            )?.label}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
                {profile.preset === "custom" && (
                  <p className="pt-1 text-[11px] italic text-muted-foreground">
                    You've customized this profile.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="scope" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rng-from">From</Label>
                    <Input id="rng-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rng-to">To</Label>
                    <Input id="rng-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Courses</Label>
                  <div className="space-y-1 rounded-md border border-border p-2">
                    {courses.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary"
                      >
                        <Checkbox
                          checked={pickedCourses.includes(c.id)}
                          onCheckedChange={() => toggleCourse(c.id)}
                        />
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: colorToHex(c.color) }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span>Include days with no plan</span>
                  <Switch
                    checked={profile.includeEmpty}
                    onCheckedChange={(v) => setLayout({ includeEmpty: v })}
                  />
                </label>
              </TabsContent>

              <TabsContent value="sections" className="space-y-2 pt-3">
                <div className="flex items-center justify-between rounded-md border border-border bg-card p-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Plan type
                  </Label>
                  <div className="flex gap-1 rounded-md bg-secondary p-1">
                    {(["lesson", "sub"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setLayout({ mode: m })}
                        className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                          profile.mode === m
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m === "sub" ? "Sub plan" : "Lesson plan"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {visibleSectionKeys.map((s) => (
                    <label
                      key={s.key}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <span>{s.label}</span>
                      <Switch
                        checked={profile.sections[s.key]}
                        onCheckedChange={(v) => setSection(s.key, v)}
                      />
                    </label>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="header" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  Appears at the top of every plan when "Running header" is on, plus the cover page.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="hdr-teacher">Teacher name</Label>
                    <Input
                      id="hdr-teacher"
                      value={profile.header.teacherName}
                      onChange={(e) => setHeader({ teacherName: e.target.value })}
                      placeholder="Ms. Garcia"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hdr-school">School / class</Label>
                    <Input
                      id="hdr-school"
                      value={profile.header.schoolName}
                      onChange={(e) => setHeader({ schoolName: e.target.value })}
                      placeholder="Lincoln High · English 10 Honors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hdr-room">Room</Label>
                    <Input
                      id="hdr-room"
                      value={profile.header.room}
                      onChange={(e) => setHeader({ room: e.target.value })}
                      placeholder="214"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hdr-email">Email</Label>
                    <Input
                      id="hdr-email"
                      value={profile.header.email}
                      onChange={(e) => setHeader({ email: e.target.value })}
                      placeholder="garcia@lhs.edu"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-3 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Orientation</Label>
                    <Select
                      value={profile.orientation}
                      onValueChange={(v) =>
                        setLayout({ orientation: v as "portrait" | "landscape" })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Font</Label>
                    <Select
                      value={profile.fontFamily}
                      onValueChange={(v) => setLayout({ fontFamily: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPORT_FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span>Compact (hide element body & notes)</span>
                  <Switch
                    checked={profile.compact}
                    onCheckedChange={(v) => setLayout({ compact: v })}
                  />
                </label>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-7 min-h-[420px] lg:min-h-0">
            <PrintPreview
              docHTML={preview.docHTML}
              orientation={profile.orientation}
              pageCount={preview.totalPages}
              truncatedNote={preview.truncatedNote}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={exportNow} disabled={pickedCourses.length === 0}>
            <Printer className="mr-1 size-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
