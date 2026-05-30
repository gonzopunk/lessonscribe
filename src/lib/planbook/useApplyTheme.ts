import { useEffect } from "react";
import { usePlanBook } from "@/lib/planbook/store";
import { resolveFont } from "@/lib/planbook/constants";

function ensureFontLoaded(fontId: string) {
  const f = resolveFont(fontId);
  if (!f.href) return;
  const elId = `pb-font-${f.id}`;
  if (document.getElementById(elId)) return;
  const link = document.createElement("link");
  link.id = elId;
  link.rel = "stylesheet";
  link.href = f.href;
  document.head.appendChild(link);
}

export function useApplyTheme() {
  const settings = usePlanBook((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", settings.theme === "light");
    root.classList.toggle("dark", settings.theme === "dark");
    root.classList.toggle("parchment", settings.theme === "parchment");
    root.dataset.fontsize = settings.fontSize;
    root.dataset.density = settings.density;
    root.dataset.reduceMotion = String(settings.reduceMotion);

    const body = resolveFont(settings.bodyFontId || settings.fontId);
    const heading = resolveFont(settings.headingFontId || settings.fontId);
    root.style.setProperty("--font-app", body.value);
    root.style.setProperty("--font-heading", heading.value);

    ensureFontLoaded(body.id);
    ensureFontLoaded(heading.id);
  }, [settings]);
}
