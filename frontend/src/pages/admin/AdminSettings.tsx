import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings, Globe, Volume2, Shield, Save } from "lucide-react";
import type { SystemSettings } from "@/types";
import { toast } from "sonner";
import {
  defaultSystemSettings,
} from "@/lib/systemSettings";
import { getSystemSettingsApi, updateSystemSettingsApi } from "@/services/api";

export default function AdminSettings() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" />;

  const [settings, setSettings] = useState<SystemSettings>(
    defaultSystemSettings,
  );
  const [savedSettings, setSavedSettings] = useState<SystemSettings>(
    defaultSystemSettings,
  );
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const remote = await getSystemSettingsApi();
        const merged = { ...defaultSystemSettings, ...remote };
        setSettings(merged);
        setSavedSettings(merged);
      } catch (error) {
        console.error("Failed to load system settings", error);
        toast.error("Could not load system settings. Using local defaults.");
      }
    };

    void load();
  }, []);

  const update = (partial: Partial<SystemSettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }));

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const saveSettings = async () => {
    if (!isDirty) {
      toast.message("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const saved = await updateSystemSettingsApi(settings);
      setSettings(saved);
      setSavedSettings(saved);
      toast.success("System settings saved.");
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Could not save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">System Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure system-wide defaults
          </p>
        </div>
        <Button
          className="bg-gradient-primary"
          onClick={() => void saveSettings()}
          disabled={!isDirty || isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Globe className="h-4 w-4" /> Language & Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Default Language</Label>
              <Select
                value={settings.defaultLanguage}
                onValueChange={(v) =>
                  update({ defaultLanguage: v as "en" | "am" })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Default Theme</Label>
              <Select
                value={settings.defaultTheme}
                onValueChange={(v) => update({ defaultTheme: v as any })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> Text-to-Speech
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>TTS Enabled</Label>
              <Switch
                checked={settings.ttsEnabled}
                onCheckedChange={(v) => update({ ttsEnabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Speed: {settings.ttsSpeed}x</Label>
              <Slider
                value={[settings.ttsSpeed]}
                onValueChange={([v]) => update({ ttsSpeed: v })}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Shield className="h-4 w-4" /> Exam Integrity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tab Switch Detection</Label>
              <Switch
                checked={settings.examIntegrityChecks}
                onCheckedChange={(v) => update({ examIntegrityChecks: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Late Submission</Label>
              <Switch
                checked={settings.allowLateSubmission}
                onCheckedChange={(v) => update({ allowLateSubmission: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Max Login Attempts</Label>
              <Select
                value={String(settings.maxLoginAttempts)}
                onValueChange={(v) => update({ maxLoginAttempts: Number(v) })}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
