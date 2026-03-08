"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";

interface ChannelSettingsFormProps {
  channel: Channel;
}

export function ChannelSettingsForm({ channel }: ChannelSettingsFormProps) {
  const router = useRouter();
  // useToast from shadcn usually needs Toaster in layout. I installed 'toast' but components/ui/toast exists?
  // shadcn v4 uses 'hooks/use-toast' or 'sonner'.
  // I'll assume use-toast is available or I skip toast for now and use alert/state.
  // I didn't install toast properly maybe? "The item ... toast.json was not found".
  // I skipped toast. So I'll use simple alerts or error state.
  
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error('Failed to update');
      // Refresh
      router.refresh();
      alert('Saved successfully');
    } catch (e) {
      alert('Error updating channel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this channel? This cannot be undone.')) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/channels');
    } catch (e) {
      alert('Error deleting channel');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Channel Settings</CardTitle>
          <CardDescription>Update your channel details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Permanently delete this channel and all its data.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? "Deleting..." : "Delete Channel"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
