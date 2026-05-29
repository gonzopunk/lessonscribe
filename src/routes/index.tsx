import { createFileRoute } from "@tanstack/react-router";
import { useApplyTheme } from "@/lib/planbook/useApplyTheme";
import { PlannerWorkspace } from "@/components/planbook/PlannerWorkspace";
import { APP_NAME } from "@/lib/planbook/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Lesson Planner` },
      {
        name: "description",
        content:
          "A calm, color-coded daily lesson planner for high school teachers — drag elements onto days, track minutes, and print lesson or sub plans.",
      },
      { property: "og:title", content: `${APP_NAME} — Lesson Planner` },
      {
        property: "og:description",
        content: "Calm, color-coded daily lesson planner for high school teachers.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useApplyTheme();
  return (
    <main>
      <h1 className="sr-only">{APP_NAME} Planner</h1>
      <PlannerWorkspace />
    </main>
  );
}
