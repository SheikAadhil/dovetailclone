"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, History, Calendar, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="rounded-[2.5rem] p-0 border-none shadow-2xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 sm:p-10 pb-0">
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <History className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter">Signal Synchronization</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-500 font-bold mt-2">
              Pulse AI will scan historical Slack archives to reconstruct theme evolution.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 px-6 sm:px-10">
          <div className="py-2 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Depth Scope</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 pb-6">
              {options.map((opt) => (
                <button 
                  key={opt.id}
                  type="button"
                  onClick={() => setDaysBack(opt.id)}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group ${daysBack === opt.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex shrink-0 items-center justify-center transition-all ${daysBack === opt.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-200'}`}>
                      {daysBack === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-black text-gray-900 block group-hover:text-indigo-600 transition-colors truncate">{opt.label}</span>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">{opt.desc}</p>
                    </div>
                  </div>
                  {daysBack === opt.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 animate-in zoom-in-50 duration-300" />}
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 sm:p-10 pt-4 pb-10 border-t border-gray-50 bg-gray-50/30 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-start">
            <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-2xl h-12 sm:h-14 px-8 font-black text-xs uppercase tracking-widest border-gray-200 bg-white w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading} className="rounded-2xl h-12 sm:h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex-1 w-full sm:w-auto">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <History className="w-5 h-5 mr-3" />}
              Execute Sync
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
