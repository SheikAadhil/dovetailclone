"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface BackfillDialogProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BackfillDialog({ channelId, isOpen, onClose, onSuccess }: BackfillDialogProps) {
  const [daysBack, setDaysBack] = useState("30");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack: parseInt(daysBack) })
      });

      if (!res.ok) throw new Error('Backfill failed');
      const data = await res.json();
      alert(`Imported ${data.imported} messages.`);
      onClose();
      onSuccess?.();
    } catch (e) {
      alert('Error during backfill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Historical Messages</DialogTitle>
          <DialogDescription>
            Select how far back to search for messages in Slack.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Label>Time range</Label>
          <RadioGroup value={daysBack} onValueChange={setDaysBack}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="30" id="r1" />
              <Label htmlFor="r1">Last 30 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="90" id="r2" />
              <Label htmlFor="r2">Last 90 days</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="180" id="r3" />
              <Label htmlFor="r3">Last 6 months</Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
