"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowLeft, Check, Slack as SlackIcon } from "lucide-react";

export function CreateChannelWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeamName, setSlackTeamName] = useState("");
  const [slackTeamId, setSlackTeamId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [importHistory, setImportHistory] = useState(false);
  const [daysBack, setDaysBack] = useState("30");

  // Check connection status on mount and when params change
  useEffect(() => {
    checkSlackConnection();
  }, [searchParams]);

  const checkSlackConnection = async () => {
    try {
      const res = await fetch('/api/slack/channels');
      const data = await res.json();
      if (data.connected) {
        setSlackConnected(true);
        setSlackTeamName(data.teamName);
        setSlackTeamId(data.teamId);
        setChannels(data.channels);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectSlack = async () => {
    // Get workspace ID first?
    // We need workspace ID for the install link.
    // We can fetch it or just rely on backend to know user's workspace?
    // The install route requires workspaceId param.
    // Fetch it first.
    try {
      // We can get it from the check connection call if we return it?
      // Or separate call.
      // Assuming user has one workspace.
      // Let's create a helper route or just fetch channels and grab workspaceId?
      // /api/slack/channels uses workspace.
      // We don't have an endpoint to JUST get workspace ID.
      // But we can use the same pattern: assume backend handles user.
      // Wait, /api/slack/install requires workspaceId query param.
      // We need to fetch it.
      
      // Let's assume we can fetch channels list (even if empty/not connected) to get workspace ID?
      // API /api/slack/channels logic: "Get user's workspace... if not connected return { connected: false }".
      // We can return workspaceId in that response too.
      // I'll update /api/slack/channels to return workspaceId.
      
      // Quick fix: fetch workspace ID separately?
      // Or just fetch /api/channels (list) and take first one's workspace_id?
      // List might be empty.
      
      // Let's update /api/slack/channels to return workspaceId.
      // It's the cleanest way.
      // I'll do that in a separate turn or just guess it?
      // No, I'll update the route first.
      
      // ...
      
      // Actually, for now, let's assume we fetch it from /api/slack/channels (I will update it).
      const res = await fetch('/api/slack/channels');
      const data = await res.json();
      // Assume data.workspaceId exists
      if (data.workspaceId) {
        window.location.href = `/api/slack/install?workspaceId=${data.workspaceId}&channelId=new`;
      }
    } catch (e) {
      console.error(e);
      alert('Failed to initiate Slack connection');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedChannelObj = channels.find(c => c.id === selectedChannel);
      
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          slack_channel_id: selectedChannel,
          slack_channel_name: selectedChannelObj?.name,
          slack_team_id: slackTeamId,
          backfillDays: importHistory ? parseInt(daysBack) : null
        })
      });

      if (!res.ok) throw new Error('Failed to create channel');
      
      const channel = await res.json();
      router.push(`/channels/${channel.id}`);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Steps Indicator */}
      <div className="flex items-center justify-center mb-8 space-x-4">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>1</div>
          <span className="font-medium">Details</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-200" />
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>2</div>
          <span className="font-medium">Connect Source</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{step === 1 ? "Channel Details" : "Connect Data Source"}</CardTitle>
          <CardDescription>
            {step === 1 ? "Give your channel a name and description." : "Connect a source to start ingesting data."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Tool Support Queries" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="What is this channel monitoring?" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Source Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${true ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <SlackIcon className="w-6 h-6 text-[#4A154B]" />
                    <Check className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="font-medium">Slack</div>
                  <div className="text-xs text-gray-500">Connect a workspace</div>
                </div>
                <div className="border-2 border-gray-100 rounded-lg p-4 opacity-50 cursor-not-allowed">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 bg-gray-200 rounded" />
                    <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Coming soon</span>
                  </div>
                  <div className="font-medium text-gray-400">CSV Upload</div>
                  <div className="text-xs text-gray-400">Import file</div>
                </div>
              </div>

              {/* Connection State */}
              <div className="border-t pt-6">
                {!slackConnected ? (
                  <div className="text-center py-4">
                    <Button 
                      onClick={handleConnectSlack}
                      className="bg-[#4A154B] hover:bg-[#361038] text-white"
                    >
                      <SlackIcon className="mr-2 h-4 w-4" />
                      Connect Slack Workspace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center text-green-700 text-sm">
                      <Check className="w-4 h-4 mr-2" />
                      Connected to <strong>{slackTeamName}</strong>
                    </div>

                    <div className="space-y-2">
                      <Label>Select channel to monitor</Label>
                      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map(c => (
                            <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between space-x-2 border rounded-lg p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Import historical messages?</Label>
                        <p className="text-sm text-gray-500">
                          Backfill data to jumpstart AI themes.
                        </p>
                      </div>
                      <Switch 
                        checked={importHistory}
                        onCheckedChange={setImportHistory}
                      />
                    </div>

                    {importHistory && (
                      <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                        <Label>How far back?</Label>
                        <RadioGroup value={daysBack} onValueChange={setDaysBack}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="r1" />
                            <Label htmlFor="r1">30 days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="90" id="r2" />
                            <Label htmlFor="r2">90 days</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="180" id="r3" />
                            <Label htmlFor="r3">6 months</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 ? (
            <Button variant="ghost" onClick={() => router.push("/channels")}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}

          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!name}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreate} 
              disabled={!selectedChannel || loading}
            >
              {loading ? "Creating..." : "Create Channel"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
