import { useEffect, useRef, useState } from "react";

const SCALE_EPSILON = 0.005;

interface Props {
  docHTML: string;
  orientation: "portrait" | "landscape";
  pageCount?: number;
  truncatedNote?: string | null;
}

// US Letter at 96 DPI
const PAGE_W_PORTRAIT = 816;
const PAGE_H_PORTRAIT = 1056;

export function PrintPreview({ docHTML, orientation, pageCount, truncatedNote }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [debouncedDoc, setDebouncedDoc] = useState(docHTML);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDoc(docHTML), 150);
    return () => clearTimeout(t);
  }, [docHTML]);

  const pageW = orientation === "landscape" ? PAGE_H_PORTRAIT : PAGE_W_PORTRAIT;
  const pageH = orientation === "landscape" ? PAGE_W_PORTRAIT : PAGE_H_PORTRAIT;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.getBoundingClientRect().width - 24;
      const next = Math.min(1, Math.max(0.3, w / pageW));
      if (Math.abs(next - scaleRef.current) > SCALE_EPSILON) {
        scaleRef.current = next;
        setScale(next);
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageW]);

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Preview</span>
        <span className="flex items-center gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 capitalize">{orientation}</span>
          {pageCount != null && <span>{pageCount} page{pageCount === 1 ? "" : "s"}</span>}
        </span>
      </div>
      <div
        ref={wrapRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3"
        style={{ background: "color-mix(in oklab, var(--muted) 50%, transparent)" }}
      >
        <div
          style={{
            width: pageW * scale,
            height: pageH * scale,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: pageW,
              height: pageH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <iframe
              key={orientation}
              title="Print preview"
              sandbox="allow-same-origin"
              srcDoc={debouncedDoc}
              style={{ width: pageW, height: pageH, border: 0, display: "block" }}
            />
          </div>
        </div>
        {truncatedNote && (
          <p className="mx-auto mt-3 max-w-md text-center text-[11px] italic text-muted-foreground">
            {truncatedNote}
          </p>
        )}
      </div>
    </div>
  );
}
