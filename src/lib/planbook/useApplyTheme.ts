import { useEffect } from "react";
import { usePlanBook } from "@/lib/planbook/store";
import { FONT_OPTIONS } from "@/lib/planbook/constants";

const FONT_LINKS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  lexend: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap",
  atkinson:
    "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap",
  opendyslexic: "https://fonts.cdnfonts.com/css/opendyslexic",
};

export function useApplyTheme() {
  const settings = usePlanBook((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", settings.theme === "light");
    root.classList.toggle("dark", settings.theme === "dark");
    root.dataset.fontsize = settings.fontSize;
    root.dataset.density = settings.density;
    root.dataset.reduceMotion = String(settings.reduceMotion);

    const f = FONT_OPTIONS.find((x) => x.id === settings.fontId) ?? FONT_OPTIONS[0];
    root.style.setProperty("--font-app", f.value);

    // load webfont
    const href = FONT_LINKS[settings.fontId];
    if (href) {
      const id = `pb-font-${settings.fontId}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    }
  }, [settings]);
}
