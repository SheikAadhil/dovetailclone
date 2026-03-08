"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SnapshotDebugProps {
  channelId: string;
}

export function SnapshotDebug({ channelId }: SnapshotDebugProps) {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/snapshots`);
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshots = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/snapshots/create`, {
        method: 'POST'
      });
      const result = await res.json();
      alert(`Created ${result.snapshots_created} snapshots for ${result.today}`);
      fetchSnapshots();
    } catch (e) {
      alert('Failed to create snapshots');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-sm">🔍 Snapshot Debug</CardTitle>
        <CardDescription>Check and create theme snapshots for trend view</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchSnapshots} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Check Snapshots
          </Button>
          <Button size="sm" onClick={createSnapshots} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Create Snapshots
          </Button>
        </div>

        {data && (
          <div className="text-xs space-y-2 bg-white p-3 rounded border">
            <div className="flex items-center gap-2">
              {data.has_data ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="font-bold">
                {data.has_data ? 'Has snapshot data' : 'No snapshot data yet'}
              </span>
            </div>
            <div>Snapshot count: <strong>{data.snapshot_count}</strong></div>
            <div>Theme count: <strong>{data.theme_count}</strong></div>
            {data.recent_snapshots && data.recent_snapshots.length > 0 && (
              <div>
                <div className="font-bold mt-2">Recent snapshots:</div>
                <ul className="list-disc list-inside">
                  {data.recent_snapshots.slice(0, 5).map((s: any, i: number) => (
                    <li key={i}>
                      {s.snapshot_date}: {s.data_point_count} messages
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-amber-700">
          💡 Tip: Snapshots are automatically created when you run "Analyze Now". 
          You need at least 2 snapshots on different dates to see the sparkline chart.
        </p>
      </CardContent>
    </Card>
  );
}
