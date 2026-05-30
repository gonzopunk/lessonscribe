import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const QuerySchema = z.object({
  url: z.string().url().max(2048).refine((u) => /^https:\/\//i.test(u), {
    message: "URL must use https://",
  }),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/ical-proxy")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const parsed = QuerySchema.safeParse({ url: u.searchParams.get("url") ?? "" });
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid URL" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const upstream = await fetch(parsed.data.url, {
            headers: { Accept: "text/calendar" },
            signal: controller.signal,
          });
          if (!upstream.ok) {
            return new Response(
              JSON.stringify({ error: `Upstream ${upstream.status}` }),
              { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }
          const text = await upstream.text();
          return new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "text/calendar; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              ...corsHeaders,
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Fetch failed";
          return new Response(
            JSON.stringify({ error: msg }),
            { status: 504, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
