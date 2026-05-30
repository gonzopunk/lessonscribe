import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { useApplyTheme } from "@/lib/planbook/useApplyTheme";
import { usePlanBook } from "@/lib/planbook/store";
import {
  APP_NAME,
  FONT_OPTIONS,
  colorToken,
  colorTokenSoft,
} from "@/lib/planbook/constants";
import { ColorPicker } from "@/components/planbook/ColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: `Settings — ${APP_NAME}` },
      { name: "description", content: "Customize your courses, tags, and appearance." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  useApplyTheme();
  const settings = usePlanBook((s) => s.settings);
  const updateSettings = usePlanBook((s) => s.updateSettings);
  const courses = usePlanBook((s) => s.courses);
  const updateCourse = usePlanBook((s) => s.updateCourse);
  const addCourse = usePlanBook((s) => s.addCourse);
  const removeCourse = usePlanBook((s) => s.removeCourse);
  const tags = usePlanBook((s) => s.tags);
  const addTag = usePlanBook((s) => s.addTag);
  const updateTag = usePlanBook((s) => s.updateTag);
  const removeTag = usePlanBook((s) => s.removeTag);
  const applyIcalOverrides = usePlanBook((s) => s.applyIcalOverrides);
  const clearIcalOverrides = usePlanBook((s) => s.clearIcalOverrides);

  const [icalBusy, setIcalBusy] = useState(false);

  const syncIcalNow = async () => {
    setIcalBusy(true);
    try {
      const { fetchAndParseIcal } = await import("@/lib/planbook/ical");
      const entries = await fetchAndParseIcal(settings.icalUrl);
      applyIcalOverrides(entries);
      updateSettings({ lastIcalSyncAt: Date.now() });
      toast.success(`Synced ${entries.length} day${entries.length === 1 ? "" : "s"} from iCal`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "iCal sync failed");
    } finally {
      setIcalBusy(false);
    }
  };


  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Back to planner">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Appearance
          </h2>
          <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(v) => updateSettings({ theme: v as "dark" | "light" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark (warm charcoal)</SelectItem>
                  <SelectItem value="light">Light (soft off-white)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Font</Label>
              <Select
                value={settings.fontId}
                onValueChange={(v) => updateSettings({ fontId: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Font size</Label>
              <Select
                value={settings.fontSize}
                onValueChange={(v) => updateSettings({ fontSize: v as "sm" | "md" | "lg" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Density</Label>
              <Select
                value={settings.density}
                onValueChange={(v) =>
                  updateSettings({ density: v as "comfortable" | "compact" })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <div>
                <Label htmlFor="rm">Reduce motion</Label>
                <p className="text-xs text-muted-foreground">
                  Disables animations and transitions throughout the app.
                </p>
              </div>
              <Switch
                id="rm"
                checked={settings.reduceMotion}
                onCheckedChange={(v) => updateSettings({ reduceMotion: v })}
              />
            </div>
          </div>
        </section>

        {/* Favorite colors */}
        <FavoriteColorsCard />


        {/* Calendar */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            School calendar
          </h2>
          <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="syr-s">School year start</Label>
              <Input
                id="syr-s"
                type="date"
                value={settings.schoolYearStart ?? ""}
                onChange={(e) => updateSettings({ schoolYearStart: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="syr-e">School year end</Label>
              <Input
                id="syr-e"
                type="date"
                value={settings.schoolYearEnd ?? ""}
                onChange={(e) => updateSettings({ schoolYearEnd: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ical">District iCal URL</Label>
              <div className="flex gap-2">
                <Input
                  id="ical"
                  value={settings.icalUrl}
                  onChange={(e) => updateSettings({ icalUrl: e.target.value })}
                  placeholder="https://…/calendar.ics"
                />
                <Button
                  variant="outline"
                  disabled={!settings.icalUrl || icalBusy}
                  onClick={syncIcalNow}
                >
                  {icalBusy ? "Syncing…" : "Sync now"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={icalBusy}
                  onClick={() => {
                    clearIcalOverrides();
                    toast?.("Cleared iCal-sourced overrides");
                  }}
                >
                  Clear iCal
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.lastIcalSyncAt
                  ? `Last synced ${new Date(settings.lastIcalSyncAt).toLocaleString()}.`
                  : "Not yet synced."}{" "}
                Imported all-day events become calendar overrides; your manual overrides
                always win.
              </p>
            </div>

          </div>
        </section>

        {/* Courses */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Courses
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addCourse({
                  name: "New course",
                  color: "teal",
                  sections: [
                    { id: nanoid(8), name: "Period 1" },
                    { id: nanoid(8), name: "Period 2" },
                    { id: nanoid(8), name: "Period 3" },
                  ],
                  periodMinutes: 50,
                  wednesdayMinutes: 40,
                  subDefaults: "",
                })
              }
            >
              <Plus className="mr-1 size-4" />
              Add course
            </Button>
          </div>
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="space-y-3 rounded-xl border border-border bg-card p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={c.name}
                      onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <ColorPicker
                      value={c.color}
                      onChange={(next) => updateCourse(c.id, { color: next })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Period length M/T/R/F (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={c.periodMinutes}
                      onChange={(e) =>
                        updateCourse(c.id, { periodMinutes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Wednesday length (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={c.wednesdayMinutes}
                      onChange={(e) =>
                        updateCourse(c.id, { wednesdayMinutes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {c.sections.map((s, idx) => (
                    <div key={s.id} className="space-y-1.5">
                      <Label>Section {idx + 1}</Label>
                      <Input
                        value={s.name}
                        onChange={(e) => {
                          const next = c.sections.map((x) =>
                            x.id === s.id ? { ...x, name: e.target.value } : x,
                          );
                          updateCourse(c.id, { sections: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>Sub plan defaults</Label>
                  <Textarea
                    rows={3}
                    value={c.subDefaults}
                    onChange={(e) => updateCourse(c.id, { subDefaults: e.target.value })}
                    placeholder="Seating chart location, bathroom policy, emergency procedures…"
                  />
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${c.name}? This removes its elements and plans.`)) {
                        removeCourse(c.id);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 size-4" />
                    Delete course
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category tags */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Category tags
          </h2>
          {courses.map((c) => {
            const courseTags = tags.filter((t) => t.courseId === c.id);
            return (
              <div key={c.id} className="space-y-2 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addTag({ courseId: c.id, name: "New tag", color: "indigo" })
                    }
                  >
                    <Plus className="mr-1 size-4" />
                    Add tag
                  </Button>
                </div>
                <div className="space-y-2">
                  {courseTags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Input
                        value={t.name}
                        onChange={(e) => updateTag(t.id, { name: e.target.value })}
                        className="max-w-xs"
                      />
                      <ColorPicker
                        value={t.color}
                        onChange={(next) => updateTag(t.id, { color: next })}
                        size="sm"
                        ringOffsetClass="ring-offset-card"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTag(t.id)}
                        aria-label="Remove tag"
                        className="ml-auto text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {courseTags.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tags yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function FavoriteColorsCard() {
  const favorites = usePlanBook((s) => s.settings.colorFavorites ?? []);
  const addFavorite = usePlanBook((s) => s.addColorFavorite);
  const renameFavorite = usePlanBook((s) => s.renameColorFavorite);
  const setFavoriteValue = usePlanBook((s) => s.setColorFavoriteValue);
  const removeFavorite = usePlanBook((s) => s.removeColorFavorite);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Favorite colors
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const id = addFavorite("indigo", "");
            setEditing(id);
          }}
        >
          <Plus className="mr-1 size-4" />
          Add favorite
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        {favorites.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Save palette entries here for one-click reuse. Each favorite shows a live
            preview of how the color renders as a tag pill and element card.
          </p>
        ) : (
          <div className="space-y-3">
            {favorites.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface p-2.5"
              >
                <div
                  className="flex items-center gap-2 rounded-full border px-2 py-1"
                  style={{
                    backgroundColor: colorTokenSoft(f.value),
                    borderColor: colorToken(f.value),
                  }}
                  title={f.value}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: colorToken(f.value) }}
                  />
                </div>
                <Input
                  value={f.name}
                  autoFocus={editing === f.id}
                  onChange={(e) => renameFavorite(f.id, e.target.value)}
                  onBlur={() => setEditing(null)}
                  placeholder="Untitled"
                  className="max-w-xs"
                />
                <ColorPicker
                  value={f.value}
                  onChange={(next) => setFavoriteValue(f.id, next)}
                  size="sm"
                  ringOffsetClass="ring-offset-surface"
                />

                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {f.value}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFavorite(f.id)}
                  aria-label="Remove favorite"
                  className="text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

