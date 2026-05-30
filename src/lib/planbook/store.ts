import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  AppSettings,
  CalendarOverride,
  CategoryTag,
  ColorFavorite,
  Course,
  DayMeta,
  DayStatus,
  ElementInstance,
  ElementTemplate,
  OverrideKind,
  PlanBookState,
} from "./types";
import { dayKey, metaKey, mondayOf } from "./dates";

const STORAGE_KEY = "planbook:v1";
const SCHEMA_VERSION = 1;

const defaultSettings: AppSettings = {
  theme: "dark",
  fontId: "inter",
  headingFontId: "inter",
  bodyFontId: "inter",
  fontSize: "md",
  density: "comfortable",
  reduceMotion: false,
  schoolYearStart: null,
  schoolYearEnd: null,
  icalUrl: "",
  weeksInView: 3,
  filterMode: "dim",
  colorFavorites: [],
  viewMode: "weeks",
  monthCourseIds: [],
  lastIcalSyncAt: null,
};

const blankDayMeta = (): DayMeta => ({
  status: "draft",
  notes: "",
  sectionNotes: {},
  objectives: "",
  standards: "",
  reflection: "",
});

const EMPTY_DAY_META: DayMeta = blankDayMeta();

interface Actions {
  // setup
  completeOnboarding: (data: {
    schoolYearStart: string;
    schoolYearEnd: string;
    icalUrl: string;
    course: Omit<Course, "id" | "createdAt">;
  }) => void;
  resetAll: () => void;

  // settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  addColorFavorite: (value: string, name?: string) => string;
  renameColorFavorite: (id: string, name: string) => void;
  setColorFavoriteValue: (id: string, value: string) => void;
  removeColorFavorite: (id: string) => void;

  // courses
  setActiveCourse: (id: string) => void;
  addCourse: (c: Omit<Course, "id" | "createdAt">) => string;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  removeCourse: (id: string) => void;

  // tags
  addTag: (t: Omit<CategoryTag, "id">) => string;
  updateTag: (id: string, patch: Partial<CategoryTag>) => void;
  removeTag: (id: string) => void;
  setFilterTags: (ids: string[]) => void;
  toggleFilterTag: (id: string) => void;

  // templates
  addTemplate: (t: Omit<ElementTemplate, "id">) => string;
  updateTemplate: (id: string, patch: Partial<ElementTemplate>) => void;
  removeTemplate: (id: string) => void;
  archiveTemplate: (id: string) => void;
  restoreTemplate: (id: string) => void;

  // instances
  addInstanceFromTemplate: (templateId: string, dKey: string) => void;
  addInstanceToMany: (templateId: string, dayKeys: string[]) => void;
  addAdHocInstance: (
    courseId: string,
    dKey: string,
    data: {
      title: string;
      defaultMinutes: number;
      color: string;
      tagIds: string[];
      content?: string;
      instanceNotes?: string;
    },
  ) => void;
  updateInstance: (id: string, patch: Partial<ElementInstance>) => void;
  removeInstance: (id: string) => void;
  moveInstance: (id: string, dKey: string, newOrder: number) => void;
  reorderInDay: (courseId: string, dKey: string, orderedIds: string[]) => void;
  duplicateDay: (courseId: string, srcKey: string, destKeys: string[]) => void;

  // day meta
  setDayStatus: (courseId: string, dKey: string, status: DayStatus) => void;
  updateDayMeta: (courseId: string, dKey: string, patch: Partial<DayMeta>) => void;

  // overrides
  setOverride: (dKey: string, ov: Omit<CalendarOverride, "dayKey">) => void;
  clearOverride: (dKey: string) => void;
  applyIcalOverrides: (entries: Array<{ dayKey: string; label: string; kind: OverrideKind }>) => void;
  clearIcalOverrides: () => void;

  // navigation
  shiftAnchor: (weeks: number) => void;
  setAnchor: (k: string) => void;
}

export type Store = PlanBookState & Actions;

const initialState: PlanBookState = {
  version: SCHEMA_VERSION,
  onboarded: false,
  settings: defaultSettings,
  courses: [],
  activeCourseId: null,
  tags: [],
  templates: [],
  instances: [],
  overrides: {},
  dayMeta: {},
  selectedFilterTagIds: [],
  anchorDate: dayKey(mondayOf(new Date())),
};

export const usePlanBook = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      completeOnboarding: ({ schoolYearStart, schoolYearEnd, icalUrl, course }) => {
        const courseId = nanoid(8);
        const newCourse: Course = { ...course, id: courseId, createdAt: Date.now() };
        const defaultTags: CategoryTag[] = [
          { id: nanoid(8), courseId, name: "Bellringer", color: "amber" },
          { id: nanoid(8), courseId, name: "Direct Instruction", color: "indigo" },
          { id: nanoid(8), courseId, name: "Discussion", color: "teal" },
          { id: nanoid(8), courseId, name: "Assessment", color: "rose" },
        ];
        set({
          onboarded: true,
          courses: [newCourse],
          activeCourseId: courseId,
          tags: defaultTags,
          settings: {
            ...get().settings,
            schoolYearStart,
            schoolYearEnd,
            icalUrl,
          },
        });
      },

      resetAll: () => set({ ...initialState, anchorDate: dayKey(mondayOf(new Date())) }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      addColorFavorite: (value, name) => {
        const id = nanoid(8);
        const fav: ColorFavorite = { id, name: name ?? "", value };
        set((s) => ({
          settings: { ...s.settings, colorFavorites: [...(s.settings.colorFavorites ?? []), fav] },
        }));
        return id;
      },
      renameColorFavorite: (id, name) =>
        set((s) => ({
          settings: {
            ...s.settings,
            colorFavorites: (s.settings.colorFavorites ?? []).map((f) =>
              f.id === id ? { ...f, name } : f,
            ),
          },
        })),
      setColorFavoriteValue: (id, value) =>
        set((s) => ({
          settings: {
            ...s.settings,
            colorFavorites: (s.settings.colorFavorites ?? []).map((f) =>
              f.id === id ? { ...f, value } : f,
            ),
          },
        })),
      removeColorFavorite: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            colorFavorites: (s.settings.colorFavorites ?? []).filter((f) => f.id !== id),
          },
        })),

      setActiveCourse: (id) => set({ activeCourseId: id }),

      addCourse: (c) => {
        const id = nanoid(8);
        set((s) => ({
          courses: [...s.courses, { ...c, id, createdAt: Date.now() }],
          activeCourseId: s.activeCourseId ?? id,
        }));
        return id;
      },
      updateCourse: (id, patch) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCourse: (id) =>
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          activeCourseId:
            s.activeCourseId === id
              ? s.courses.find((c) => c.id !== id)?.id ?? null
              : s.activeCourseId,
          tags: s.tags.filter((t) => t.courseId !== id),
          templates: s.templates.filter((t) => t.courseId !== id),
          instances: s.instances.filter((i) => i.courseId !== id),
        })),

      addTag: (t) => {
        const id = nanoid(8);
        set((s) => ({ tags: [...s.tags, { ...t, id }] }));
        return id;
      },
      updateTag: (id, patch) =>
        set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTag: (id) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          templates: s.templates.map((t) => ({
            ...t,
            tagIds: t.tagIds.filter((x) => x !== id),
          })),
          instances: s.instances.map((i) => ({
            ...i,
            tagIds: i.tagIds.filter((x) => x !== id),
          })),
          selectedFilterTagIds: s.selectedFilterTagIds.filter((x) => x !== id),
        })),
      setFilterTags: (ids) => set({ selectedFilterTagIds: ids }),
      toggleFilterTag: (id) =>
        set((s) => ({
          selectedFilterTagIds: s.selectedFilterTagIds.includes(id)
            ? s.selectedFilterTagIds.filter((x) => x !== id)
            : [...s.selectedFilterTagIds, id],
        })),

      addTemplate: (t) => {
        const id = nanoid(8);
        set((s) => ({ templates: [...s.templates, { ...t, id }] }));
        return id;
      },
      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      archiveTemplate: (id) =>
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, archived: true } : t,
          ),
        })),
      restoreTemplate: (id) =>
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, archived: false } : t,
          ),
        })),

      addInstanceFromTemplate: (templateId, dKey) => {
        const tpl = get().templates.find((t) => t.id === templateId);
        if (!tpl) return;
        const existing = get().instances.filter(
          (i) => i.courseId === tpl.courseId && i.dayKey === dKey,
        );
        const inst: ElementInstance = {
          id: nanoid(10),
          templateId: tpl.id,
          courseId: tpl.courseId,
          dayKey: dKey,
          order: existing.length,
          title: tpl.title,
          tagIds: [...tpl.tagIds],
          color: tpl.color,
          defaultMinutes: tpl.defaultMinutes,
          content: "",
          durationOverride: null,
          instanceNotes: "",
        };
        set((s) => ({ instances: [...s.instances, inst] }));
      },

      addInstanceToMany: (templateId, dayKeys) => {
        dayKeys.forEach((k) => get().addInstanceFromTemplate(templateId, k));
      },

      addAdHocInstance: (courseId, dKey, data) => {
        const existing = get().instances.filter(
          (i) => i.courseId === courseId && i.dayKey === dKey,
        );
        const inst: ElementInstance = {
          id: nanoid(10),
          templateId: "",
          courseId,
          dayKey: dKey,
          order: existing.length,
          title: data.title || "Untitled",
          tagIds: [...data.tagIds],
          color: data.color,
          defaultMinutes: data.defaultMinutes,
          content: data.content ?? "",
          durationOverride: null,
          instanceNotes: data.instanceNotes ?? "",
        };
        set((s) => ({ instances: [...s.instances, inst] }));
      },

      updateInstance: (id, patch) =>
        set((s) => ({
          instances: s.instances.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      removeInstance: (id) =>
        set((s) => ({ instances: s.instances.filter((i) => i.id !== id) })),

      moveInstance: (id, dKey, newOrder) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, dayKey: dKey, order: newOrder } : i,
          ),
        })),

      reorderInDay: (courseId, dKey, orderedIds) =>
        set((s) => ({
          instances: s.instances.map((i) => {
            if (i.courseId !== courseId || i.dayKey !== dKey) return i;
            const idx = orderedIds.indexOf(i.id);
            return idx >= 0 ? { ...i, order: idx } : i;
          }),
        })),

      duplicateDay: (courseId, srcKey, destKeys) => {
        const src = get()
          .instances.filter((i) => i.courseId === courseId && i.dayKey === srcKey)
          .sort((a, b) => a.order - b.order);
        if (src.length === 0) return;
        const copies: ElementInstance[] = [];
        destKeys.forEach((dest) => {
          src.forEach((i, idx) => {
            copies.push({ ...i, id: nanoid(10), dayKey: dest, order: idx });
          });
        });
        set((s) => ({ instances: [...s.instances, ...copies] }));
      },

      duplicateWeek: (courseId, srcMondayKey, destMondayKey) => {
        // copy 5 weekdays
        const offsets = [0, 1, 2, 3, 4];
        const srcStart = new Date(srcMondayKey);
        const destStart = new Date(destMondayKey);
        const copies: ElementInstance[] = [];
        offsets.forEach((off) => {
          const sk = dayKey(new Date(srcStart.getTime() + off * 86400000));
          const dk = dayKey(new Date(destStart.getTime() + off * 86400000));
          const src = get()
            .instances.filter((i) => i.courseId === courseId && i.dayKey === sk)
            .sort((a, b) => a.order - b.order);
          src.forEach((i, idx) => {
            copies.push({ ...i, id: nanoid(10), dayKey: dk, order: idx });
          });
        });
        if (copies.length) set((s) => ({ instances: [...s.instances, ...copies] }));
      },

      setDayStatus: (courseId, dKey, status) => {
        const k = metaKey(courseId, dKey);
        set((s) => ({
          dayMeta: {
            ...s.dayMeta,
            [k]: { ...(s.dayMeta[k] ?? blankDayMeta()), status },
          },
        }));
      },
      updateDayMeta: (courseId, dKey, patch) => {
        const k = metaKey(courseId, dKey);
        set((s) => ({
          dayMeta: {
            ...s.dayMeta,
            [k]: { ...(s.dayMeta[k] ?? blankDayMeta()), ...patch },
          },
        }));
      },

      setOverride: (dKey, ov) =>
        set((s) => ({ overrides: { ...s.overrides, [dKey]: { ...ov, dayKey: dKey } } })),
      clearOverride: (dKey) =>
        set((s) => {
          const { [dKey]: _, ...rest } = s.overrides;
          return { overrides: rest };
        }),
      applyIcalOverrides: (entries) =>
        set((s) => {
          const next = { ...s.overrides };
          entries.forEach((e) => {
            // user-manual overrides win — don't clobber existing manual entries
            const existing = next[e.dayKey];
            if (existing && existing.source === "manual") return;
            next[e.dayKey] = {
              dayKey: e.dayKey,
              kind: e.kind,
              label: e.label,
              note: "",
              source: "ical",
            };
          });
          return { overrides: next };
        }),
      clearIcalOverrides: () =>
        set((s) => {
          const next: typeof s.overrides = {};
          Object.entries(s.overrides).forEach(([k, v]) => {
            if (v.source !== "ical") next[k] = v;
          });
          return { overrides: next };
        }),

      shiftAnchor: (weeks) => {
        const cur = new Date(get().anchorDate);
        cur.setDate(cur.getDate() + weeks * 7);
        set({ anchorDate: dayKey(cur) });
      },
      setAnchor: (k) => set({ anchorDate: k }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlanBookState>;
        const ps = (p.settings ?? {}) as Partial<AppSettings>;
        // Migrate legacy single fontId → heading+body if not yet set.
        const legacyFont = (ps as { fontId?: string }).fontId;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...ps,
            colorFavorites: ps.colorFavorites ?? [],
            viewMode: ps.viewMode ?? "weeks",
            monthCourseIds: ps.monthCourseIds ?? [],
            lastIcalSyncAt: ps.lastIcalSyncAt ?? null,
            headingFontId:
              (ps as { headingFontId?: string }).headingFontId ?? legacyFont ?? "inter",
            bodyFontId:
              (ps as { bodyFontId?: string }).bodyFontId ?? legacyFont ?? "inter",
          },
        };
      },
    },
  ),
);

// helper to get blank meta safely
export const getDayMeta = (s: PlanBookState, courseId: string, dKey: string): DayMeta =>
  s.dayMeta[metaKey(courseId, dKey)] ?? EMPTY_DAY_META;
