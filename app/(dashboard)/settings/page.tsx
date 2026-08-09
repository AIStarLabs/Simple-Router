// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Download, Upload, Save, ShieldCheck } from "lucide-react";
import { api, apiDownload } from "@/lib/api-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Settings {
  jwtSecretConfigured: boolean;
  jwtSecretCustom: boolean;
  encryptionKeyConfigured: boolean;
  encryptionKeyCustom: boolean;
  redisUrl: string;
  redisConfigured: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [redisUrl, setRedisUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ settings: Settings }>("/api/admin/settings");
      setSettings(res.settings);
      setRedisUrl(res.settings.redisUrl);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRedis(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ settings: Settings }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ redisUrl }),
      });
      setSettings(res.settings);
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function exportConfig() {
    try {
      await apiDownload("/api/admin/settings/export");
      toast.success("Config downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function importConfig(file: File) {
    const text = await file.text();
    try {
      const config = JSON.parse(text);
      await api("/api/admin/settings/import", {
        method: "POST",
        body: JSON.stringify(config),
      });
      toast.success("Config imported");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Gateway configuration" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Secrets are configured through environment variables (.env). They are never
              returned to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">JWT secret (session + API tokens)</span>
              <Badge variant={settings?.jwtSecretConfigured ? "default" : "destructive"}>
                {settings?.jwtSecretConfigured ? "Configured" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">Encryption key (API keys at rest)</span>
              <Badge variant={settings?.encryptionKeyConfigured ? "default" : "destructive"}>
                {settings?.encryptionKeyConfigured ? "Configured" : "Missing"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redis (optional)</CardTitle>
            <CardDescription>
              Redis can back distributed rate limiting in multi-instance deployments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveRedis} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Redis URL</Label>
                <Input
                  value={redisUrl}
                  onChange={(e) => setRedisUrl(e.target.value)}
                  placeholder="redis://localhost:6379"
                />
              </div>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Backup</CardTitle>
            <CardDescription>
              Export or import providers, models, and API key definitions. Secrets
              and raw keys are never exported.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportConfig}>
              <Download className="mr-2 h-4 w-4" />
              Export config
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import config
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importConfig(file);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
