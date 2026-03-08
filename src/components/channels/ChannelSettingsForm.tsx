"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Loader2, Trash2, Brain, Check, Mail, Slack as SlackIcon, 
  BellRing, Send, Sparkles, ShieldAlert, Globe, Zap, Database
} from "lucide-react";
import { UsageStats } from "./UsageStats";
import { Switch } from "@/components/ui/switch";
import { SnapshotDebug } from "./SnapshotDebug";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ChannelSettingsFormProps {
  channel: Channel;
}

export function ChannelSettingsForm({ channel }: ChannelSettingsFormProps) {
  const router = useRouter();
  const [activeSection, setActiveView] = useState<"general" | "ai" | "notifications" | "advanced">("general");
  
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [aiContext, setAiContext] = useState(channel.ai_context || "");
  const [alertThreshold, setAlertThreshold] = useState(channel.alert_threshold_percent || 50);
  
  const [slackEnabled, setSlackEnabled] = useState(channel.digest_slack_enabled || false);
  const [slackUrl, setSlackUrl] = useState(channel.digest_slack_webhook_url || "");
  const [testingSlack, setTestingSlack] = useState(false);

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
          alert_threshold_percent: alertThreshold,
          digest_slack_enabled: slackEnabled,
          digest_slack_webhook_url: slackUrl
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      router.refresh();
      alert('Operational parameters updated.');
    } catch (e) {
      console.error(e);
      alert('Error updating channel');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackUrl) return;
    setTestingSlack(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/test-digest-slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: slackUrl })
      });
      const data = await res.json();
      if (data.success) alert("Test notification dispatched.");
      else alert(data.error || "Failed to send test");
    } catch (e) {
      console.error(e);
      alert("Test failed");
    } finally {
      setTestingSlack(false);
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
      console.error(e);
      alert('Failed to enhance context');
    } finally {
      setEnhancing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('This action will purge all channel data permanently. Proceed?')) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/channels');
    } catch (e) {
      console.error(e);
      alert('Error deleting channel');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex gap-12 max-w-6xl mx-auto items-start animate-in fade-in duration-700">
      {/* Sub-Sidebar */}
      <aside className="w-64 flex-shrink-0 space-y-8 sticky top-0">
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">Configuration</h3>
          <nav className="space-y-1">
            {[
              { id: 'general', label: 'General Identity', icon: Globe },
              { id: 'ai', label: 'AI Intelligence', icon: Brain },
              { id: 'notifications', label: 'Notifications', icon: BellRing },
              { id: 'advanced', label: 'Diagnostics', icon: Database },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  activeSection === item.id 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-1">
          <UsageStats />
        </div>

        <div className="px-4">
          <Separator className="mb-6 opacity-50" />
          <Button 
            variant="ghost" 
            onClick={handleDelete}
            disabled={deleteLoading}
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest px-4"
          >
            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Purge Channel
          </Button>
        </div>
      </aside>

      {/* Main Form Area */}
      <div className="flex-1 space-y-8 pb-24">
        {activeSection === 'general' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">General Identity</h2>
              <p className="text-sm font-medium text-gray-400 mt-1">Define how this channel is presented within Pulse.</p>
            </header>

            <div className="grid gap-6">
              <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="rounded-2xl h-14 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold text-lg px-6"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Channel Purpose</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="rounded-[1.5rem] min-h-[120px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed px-6 py-4"
                  />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Anomaly Sensitivity</h4>
                    <p className="text-xs font-medium text-gray-400">Triggers alerts when theme volume shifts by {alertThreshold}%.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <Input 
                    type="number" 
                    value={alertThreshold} 
                    onChange={e => setAlertThreshold(parseInt(e.target.value))}
                    className="w-20 h-10 rounded-xl border-none bg-white font-black text-center shadow-sm"
                  />
                  <span className="text-xs font-black text-gray-400 pr-2">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Intelligence Parameters</h2>
                <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase px-2">GPT-4 Enabled</Badge>
              </div>
              <p className="text-sm font-medium text-gray-400 mt-1">Fine-tune how the AI interprets and clusters your incoming signals.</p>
            </header>

            <Card className="border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden border-none ring-1 ring-gray-100">
              <CardHeader className="p-8 bg-indigo-50/30 border-b border-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-2xl text-indigo-600 shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg font-black text-indigo-900">Semantic Focus</CardTitle>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleEnhanceContext} 
                    disabled={enhancing || !aiContext}
                    className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-white font-black text-[10px] uppercase tracking-widest h-9 px-4"
                  >
                    {enhancedSuccess ? <><Check className="w-3.5 h-3.5 mr-2" /> Enhanced</> : <>{enhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : "Auto-Refine"}</>}
                  </Button>
                </div>
                <CardDescription className="text-indigo-700/60 font-medium mt-4">
                  Describe your persona and target insights. The AI uses this context to prioritize themes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative">
                  <Textarea 
                    rows={6}
                    placeholder="E.g., I am a Lead Engineer. Focus on technical friction, API errors, and deployment bottlenecks." 
                    value={aiContext} 
                    onChange={e => setAiContext(e.target.value.substring(0, 400))}
                    className="rounded-2xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all font-medium leading-relaxed px-6 py-4 resize-none"
                  />
                  <div className={`absolute bottom-4 right-4 text-[9px] font-black tracking-widest ${aiContext.length >= 380 ? 'text-red-500' : 'text-gray-300 uppercase'}`}>
                    {aiContext.length} / 400
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Notification Channels</h2>
              <p className="text-sm font-medium text-gray-400 mt-1">Sync insights to your team&apos;s existing workflow.</p>
            </header>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-8 border border-gray-100 rounded-[2.5rem] bg-white shadow-sm group hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-50 rounded-[1.5rem] text-indigo-600 group-hover:scale-110 transition-transform shadow-sm shadow-indigo-50">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Email Intelligence Digest</h4>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">Automated weekly synthesis delivered every Monday.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mr-2">Default</span>
                  <Switch checked={true} disabled className="data-[state=checked]:bg-indigo-600" />
                </div>
              </div>

              <div className={`border rounded-[2.5rem] bg-white transition-all overflow-hidden ${slackEnabled ? 'border-indigo-200 shadow-xl shadow-indigo-50' : 'border-gray-100 shadow-sm'}`}>
                <div className="flex items-center justify-between p-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-[#4A154B]/10 rounded-[1.5rem] text-[#4A154B] shadow-sm shadow-purple-50">
                      <SlackIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Slack Channel Broadcast</h4>
                      <p className="text-xs font-medium text-gray-400 mt-0.5">Stream summary reports to a shared Slack workspace.</p>
                    </div>
                  </div>
                  <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} className="data-[state=checked]:bg-[#4A154B]" />
                </div>

                {slackEnabled && (
                  <div className="px-8 pb-8 pt-0 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Separator className="bg-gray-50" />
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Webhook Intelligence Endpoint</Label>
                      <Input 
                        placeholder="https://hooks.slack.com/services/..." 
                        value={slackUrl}
                        onChange={e => setSlackUrl(e.target.value)}
                        className="rounded-xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-mono text-[11px] px-4"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" size="sm" className="rounded-xl h-10 px-5 gap-2 border-gray-200 text-xs font-bold" onClick={handleTestSlack} disabled={!slackUrl || testingSlack}>
                        {testingSlack ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5" />}
                        Dispatch Test
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Diagnostic Hub</h2>
              <p className="text-sm font-medium text-gray-400 mt-1">Verify system integrity and historical data continuity.</p>
            </header>
            <SnapshotDebug channelId={channel.id} />
          </div>
        )}

        {/* Global Action Bar */}
        <div className="fixed bottom-10 right-10 flex items-center gap-4 z-50">
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 gap-3 group"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:fill-white transition-all" />}
            Commit Parameters
          </Button>
        </div>
      </div>
    </div>
  );
}