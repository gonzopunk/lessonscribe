import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { COURSE_COLORS, EXTENDED_SWATCHES, colorToken } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  size?: "sm" | "md";
  ringOffsetClass?: string;
}

export function ColorPicker({
  value,
  onChange,
  size = "md",
  ringOffsetClass = "ring-offset-background",
}: Props) {
  const [hexDraft, setHexDraft] = useState(value.startsWith("#") ? value : "#");
  const dim = size === "sm" ? "size-5" : "size-7";
  const trigger = size === "sm" ? "size-5" : "size-7";

  const commitHex = (raw: string) => {
    const v = raw.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
  };

  const isCustom = value.startsWith("#");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {COURSE_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          aria-label={c.label}
          className={cn(
            dim,
            "rounded-full ring-offset-2 transition-all",
            ringOffsetClass,
            value === c.id && "ring-2 ring-ring",
          )}
          style={{ backgroundColor: colorToken(c.id) }}
        />
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="More colors"
            className={cn(
              trigger,
              "flex items-center justify-center rounded-full border border-dashed border-border bg-surface text-muted-foreground transition-all hover:text-foreground ring-offset-2",
              ringOffsetClass,
              isCustom && "ring-2 ring-ring border-solid",
            )}
            style={isCustom ? { backgroundColor: value, color: "white" } : undefined}
          >
            {isCustom ? null : <Plus className="size-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              More swatches
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {EXTENDED_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    onChange(hex);
                    setHexDraft(hex);
                  }}
                  aria-label={hex}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-popover transition-all",
                    value.toLowerCase() === hex && "ring-2 ring-ring",
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.startsWith("#") ? value : "#6366f1"}
              onChange={(e) => {
                onChange(e.target.value);
                setHexDraft(e.target.value);
              }}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
              aria-label="Custom color"
            />
            <Input
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitHex((e.target as HTMLInputElement).value);
              }}
              placeholder="#a83279"
              className="h-8 font-mono text-xs"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
