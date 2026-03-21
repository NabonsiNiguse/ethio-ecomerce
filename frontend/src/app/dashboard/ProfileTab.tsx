"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Profile, UserInfo } from "@/types";

interface Props {
  profile: Profile | null;
  user: UserInfo | null;
  onUpdated: (p: Profile) => void;
}

export default function ProfileTab({ profile, user, onUpdated }: Props) {
  const [form, setForm] = useState<Profile>({
    profile_image: profile?.profile_image ?? "",
    address: profile?.address ?? "",
    city: profile?.city ?? "",
    region: profile?.region ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.put<{ profile: Profile }>("/api/users/update", form);
      onUpdated(data.profile);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const infoRows = [
    ["Username", user?.username],
    ["Email", user?.email],
    ["Phone", user?.phone_number],
    ["Role", user?.role],
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Account info — read only */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">
          Account Info
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {infoRows.map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                {val ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Editable profile */}
      <Card className="p-6">
        <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">
          Edit Profile
        </h2>
        <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
          Update your shipping and contact details
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Profile Image URL"
            type="url"
            placeholder="https://..."
            value={form.profile_image ?? ""}
            onChange={set("profile_image")}
          />
          <Input
            label="Address"
            placeholder="123 Main St"
            value={form.address ?? ""}
            onChange={set("address")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="Addis Ababa"
              value={form.city ?? ""}
              onChange={set("city")}
            />
            <Input
              label="Region"
              placeholder="Oromia"
              value={form.region ?? ""}
              onChange={set("region")}
            />
          </div>
          <div className="pt-1">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
