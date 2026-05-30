import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User as UserIcon, Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { subscribeSync, manualRetry, type SyncStatus } from "@/lib/planbook/cloudSync";

function statusBits(status: SyncStatus, lastSavedAt: number | null) {
  switch (status) {
    case "loading":
      return { Icon: Loader2, label: "Loading…", spin: true, tone: "text-muted-foreground" };
    case "saving":
      return { Icon: Loader2, label: "Saving…", spin: true, tone: "text-muted-foreground" };
    case "saved": {
      const ago = lastSavedAt ? Math.max(1, Math.round((Date.now() - lastSavedAt) / 1000)) : null;
      return {
        Icon: Cloud,
        label: ago == null ? "Synced" : ago < 60 ? `Synced ${ago}s ago` : `Synced ${Math.round(ago / 60)}m ago`,
        spin: false,
        tone: "text-muted-foreground",
      };
    }
    case "offline":
      return { Icon: CloudOff, label: "Offline — changes can't be saved", spin: false, tone: "text-amber-500" };
    case "error":
      return { Icon: AlertCircle, label: "Sync failed — retry", spin: false, tone: "text-destructive" };
    default:
      return { Icon: Cloud, label: "Synced", spin: false, tone: "text-muted-foreground" };
  }
}

export function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [sync, setSync] = useState({
    status: "idle" as SyncStatus,
    lastSavedAt: null as number | null,
    error: null as string | null,
    userId: null as string | null,
  });
  // Re-render every 15s so "Synced 2s ago" updates without new events.
  const [, setTick] = useState(0);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => subscribeSync(setSync), []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!email) {
    return (
      <Link to="/login">
        <Button variant="ghost" size="sm">
          <LogIn className="mr-1 size-4" />
          Sign in
        </Button>
      </Link>
    );
  }

  const { Icon, label, spin, tone } = statusBits(sync.status, sync.lastSavedAt);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => sync.status === "error" && manualRetry()}
        className={`flex items-center gap-1.5 text-xs ${tone}`}
        title={sync.error ?? label}
      >
        <Icon className={`size-3.5 ${spin ? "animate-spin" : ""}`} />
        <span className="hidden md:inline">{label}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <UserIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void supabase.auth.signOut()}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
