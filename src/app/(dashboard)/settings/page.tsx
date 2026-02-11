"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { User, Cloud } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storage, setStorage] = useState({
    bucketName: "",
    region: "",
    cloudfrontDomain: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, storageRes] = await Promise.all([
          fetch("/api/settings/profile"),
          fetch("/api/settings/storage"),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile((prev) => ({
            ...prev,
            name: data.name || "",
            email: data.email || "",
          }));
        }
        if (storageRes.ok) {
          const data = await storageRes.json();
          setStorage(data);
        }
      } catch {
        toast({ title: "Failed to load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: data.error || "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      setProfile((prev) => ({
        ...prev,
        name: data.name || "",
        email: data.email || "",
        currentPassword: "",
        newPassword: "",
      }));
      toast({ title: "Profile updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <Cloud className="w-4 h-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="you@example.com"
                  />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h3 className="mb-3 font-medium text-sm">Change Password</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={profile.currentPassword}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            currentPassword: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={profile.newPassword}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            newPassword: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>S3 Storage</CardTitle>
              <CardDescription>
                Configure your S3 bucket for audio storage. These are set via
                environment variables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bucket Name</Label>
                  <Input
                    value={storage.bucketName}
                    disabled
                    placeholder="Not configured"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input
                    value={storage.region}
                    disabled
                    placeholder="Not configured"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CloudFront Domain</Label>
                  <Input
                    value={storage.cloudfrontDomain}
                    disabled
                    placeholder="Not configured"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Storage configuration is managed through environment
                  variables. See the documentation for setup instructions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
