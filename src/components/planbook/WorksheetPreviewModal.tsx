import { useRef, useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerDocxDownload } from "@/lib/planbook/worksheetGenerator";

interface WorksheetPreviewModalProps {
  open: boolean;
  onClose: () => void;
  bytes: Uint8Array | null;
  filename: string;
}

export function WorksheetPreviewModal({
  open,
  onClose,
  bytes,
  filename,
}: WorksheetPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !bytes || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    setRendering(true);
    let cancelled = false;
    import("docx-preview")
      .then(({ renderAsync }) => {
        if (cancelled || !containerRef.current) return;
        return renderAsync(
          bytes.buffer as ArrayBuffer,
          containerRef.current,
          undefined,
          {
            className: "docx-preview",
            breakPages: true,
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
          },
        );
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bytes]);

  const onPrint = () => {
    if (!containerRef.current) return;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><style>
        * { box-sizing: border-box; }
        body { background: white; margin: 0; }
        .docx-wrapper { padding: 0 !important; background: white !important; }
        @media print { body { margin: 0; } }
      </style></head><body>${containerRef.current.innerHTML}</body></html>`,
    );
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <div className="flex-1 truncate text-center text-sm font-medium text-muted-foreground">
          {filename}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrint} disabled={rendering || !bytes}>
            <Printer className="mr-1.5 size-4" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={() => bytes && triggerDocxDownload(bytes, filename)}
            disabled={rendering || !bytes}
          >
            <Download className="mr-1.5 size-4" />
            Download .docx
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-muted/30 p-6">
        {rendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={containerRef} className="mx-auto" />
      </div>
    </div>
  );
}
