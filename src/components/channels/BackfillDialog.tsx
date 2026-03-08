"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, History, Calendar, CheckCircle2 } from "lucide-react";

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
      alert(`Successfully synchronized ${data.imported} signals from history.`);
      onClose();
      onSuccess?.();
    } catch (e) {
      console.error(e);
      alert('Operational failure during signal synchronization.');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { id: '30', label: 'Last 30 Days', desc: 'Recent operational context' },
    { id: '90', label: 'Last 90 Days', desc: 'Quarterly trend analysis' },
    { id: '180', label: 'Last 6 Months', desc: 'Extended signal reconstruction' },
    { id: '365', label: 'All Time (1 Year)', desc: 'Complete historical baseline' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl max-w-2xl overflow-hidden">
        <DialogHeader className="mb-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <History className="w-6 h-6" />
          </div>
          <DialogTitle className="text-3xl font-black tracking-tighter">Signal Synchronization</DialogTitle>
          <DialogDescription className="text-gray-500 font-bold mt-2">
            Pulse AI will scan historical Slack archives to reconstruct theme evolution.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Depth Scope</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => (
              <button 
                key={opt.id}
                type="button"
                onClick={() => setDaysBack(opt.id)}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left group ${daysBack === opt.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${daysBack === opt.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-200'}`}>
                    {daysBack === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-black text-gray-900 block group-hover:text-indigo-600 transition-colors">{opt.label}</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{opt.desc}</p>
                  </div>
                </div>
                {daysBack === opt.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 animate-in zoom-in-50 duration-300" />}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-2xl h-14 px-8 font-black text-xs uppercase tracking-widest border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading} className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <History className="w-5 h-5 mr-3" />}
            Execute Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
