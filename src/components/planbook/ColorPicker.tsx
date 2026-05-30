import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  COURSE_COLORS,
  EXTENDED_SWATCHES,
  colorToken,
  colorTokenSoft,
} from "@/lib/planbook/constants";
import { usePlanBook } from "@/lib/planbook/store";
import { cn } from "@/lib/utils";
import { Plus, Star } from "lucide-react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  size?: "sm" | "md";
  ringOffsetClass?: string;
}

/** Tiny preview showing the color as it appears in a tag pill + element bar. */
function PreviewChip({ value, label }: { value: string; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div
        className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
        style={{
          backgroundColor: colorTokenSoft(value),
          borderColor: colorToken(value),
        }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: colorToken(value) }}
        />
        <span className="text-foreground">Tag pill</span>
      </div>
      <div
        className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-[11px]"
        style={{
          backgroundColor: colorTokenSoft(value),
          borderLeft: `3px solid ${colorToken(value)}`,
        }}
      >
        <span className="text-foreground">Element card</span>
        <span className="ml-auto text-[10px] text-muted-foreground">15m</span>
      </div>
    </div>
  );
}

function Swatch({
  value,
  selected,
  onClick,
  size = "md",
  ringOffsetClass,
  label,
}: {
  value: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  ringOffsetClass?: string;
  label?: string;
}) {
  const dim = size === "sm" ? "size-5" : "size-7";
  return (
    <HoverCard openDelay={120} closeDelay={50}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label ?? value}
          className={cn(
            dim,
            "rounded-full ring-offset-2 transition-all",
            ringOffsetClass,
            selected && "ring-2 ring-ring",
          )}
          style={{ backgroundColor: colorToken(value) }}
        />
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-52 p-2.5">
        <PreviewChip value={value} label={label} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function ColorPicker({
  value,
  onChange,
  size = "md",
  ringOffsetClass = "ring-offset-background",
}: Props) {
  const [hexDraft, setHexDraft] = useState(value.startsWith("#") ? value : "#");
  const favorites = usePlanBook((s) => s.settings.colorFavorites ?? []);
  const addFavorite = usePlanBook((s) => s.addColorFavorite);
  const trigger = size === "sm" ? "size-5" : "size-7";

  const commitHex = (raw: string) => {
    const v = raw.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
  };

  const isCustom = value.startsWith("#");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {COURSE_COLORS.map((c) => (
        <Swatch
          key={c.id}
          value={c.id}
          selected={value === c.id}
          onClick={() => onChange(c.id)}
          size={size}
          ringOffsetClass={ringOffsetClass}
          label={c.label}
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
            style={isCustom ? { backgroundColor: colorToken(value), color: "white" } : undefined}
          >
            {isCustom ? null : <Plus className="size-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start">
          {favorites.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Favorites
              </p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((f) => (
                  <HoverCard key={f.id} openDelay={120}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(f.value);
                          setHexDraft(f.value.startsWith("#") ? f.value : "#");
                        }}
                        aria-label={f.name || f.value}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-all",
                          value === f.value
                            ? "border-foreground/40 ring-2 ring-ring ring-offset-2 ring-offset-popover"
                            : "border-border hover:border-foreground/30",
                        )}
                        style={{ backgroundColor: colorTokenSoft(f.value) }}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: colorToken(f.value) }}
                        />
                        <span className="max-w-[90px] truncate">
                          {f.name || "Untitled"}
                        </span>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-52 p-2.5">
                      <PreviewChip value={f.value} label={f.name || "Favorite"} />
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              More swatches
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {EXTENDED_SWATCHES.map((hex) => (
                <Swatch
                  key={hex}
                  value={hex}
                  selected={value.toLowerCase() === hex}
                  onClick={() => {
                    onChange(hex);
                    setHexDraft(hex);
                  }}
                  size="md"
                  ringOffsetClass="ring-offset-popover"
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
            <button
              type="button"
              onClick={() => addFavorite(value, "")}
              title="Save as favorite"
              aria-label="Save as favorite"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            >
              <Star className="size-3.5" />
            </button>
          </div>
          {value && (
            <div className="rounded-md border border-border p-2.5">
              <PreviewChip value={value} label="Preview" />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
