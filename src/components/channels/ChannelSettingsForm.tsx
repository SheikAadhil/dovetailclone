"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Brain, Check, Info } from "lucide-react";

interface ChannelSettingsFormProps {
  channel: Channel;
}

export function ChannelSettingsForm({ channel }: ChannelSettingsFormProps) {
  const router = useRouter();
  
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [aiContext, setAiContext] = useState(channel.ai_context || "");
  const [alertThreshold, setAlertThreshold] = useState(channel.alert_threshold_percent || 50);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedSuccess, setEnhancedSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description, 
          ai_context: aiContext,
          alert_threshold_percent: alertThreshold
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      router.refresh();
      alert('Saved successfully');
    } catch (e) {
      alert('Error updating channel');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhanceContext = async () => {
    if (!aiContext) return;
    setEnhancing(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/enhance-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: aiContext })
      });
      const data = await res.json();
      if (data.enhanced) {
        setAiContext(data.enhanced);
        setEnhancedSuccess(true);
        setTimeout(() => setEnhancedSuccess(false), 2000);
      }
    } catch (e) {
      alert('Failed to enhance context');
    } finally {
      setEnhancing(false);
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
      {/* AI Context Section */}
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
              <Brain className="w-4 h-4" />
            </div>
            <CardTitle>AI Analysis Context</CardTitle>
          </div>
          <CardDescription>
            Tell the AI about your role and what insights you are looking for.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiContext">What should the AI focus on?</Label>
            <div className="relative">
              <Textarea 
                id="aiContext" 
                rows={4}
                placeholder="Describe your role and goals. E.g. I am a Product Manager. I want to understand what internal tool users are confused about." 
                value={aiContext} 
                onChange={e => setAiContext(e.target.value.substring(0, 400))}
                className="resize-none pr-12"
              />
              <div className={`absolute bottom-2 right-2 text-[10px] font-mono ${aiContext.length >= 380 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {aiContext.length}/400
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleEnhanceContext} 
              disabled={enhancing || !aiContext}
              className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {enhancedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Enhanced
                </>
              ) : (
                <>
                  {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : "✨"}
                  Enhance with AI
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Context
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1 italic">
            <Info className="w-3 h-3" />
            Context guides future analyses only. Existing themes are not affected.
          </p>
        </CardContent>
      </Card>

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

          <div className="pt-4 border-t border-gray-100">
            <Label htmlFor="alertThreshold">Alert Threshold</Label>
            <p className="text-[11px] text-gray-500 mb-2">Notify me when a theme's volume changes by more than:</p>
            <div className="flex items-center gap-3 w-32">
              <Input 
                id="alertThreshold" 
                type="number" 
                min={10} 
                max={200}
                value={alertThreshold} 
                onChange={e => setAlertThreshold(parseInt(e.target.value))} 
              />
              <span className="text-sm font-bold text-gray-400">%</span>
            </div>
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
