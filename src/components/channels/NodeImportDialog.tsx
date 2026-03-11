"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileCode, CheckCircle2, X, FileText, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface NodeImportDialogProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NodeImportDialog({ channelId, isOpen, onClose, onSuccess }: NodeImportDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "importing" | "success">("upload");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const mdFiles = selectedFiles.filter(f => f.name.endsWith('.md'));
    
    if (mdFiles.length === 0) {
      setError("Please select .md files only.");
      return;
    }
    
    setFiles(prev => [...prev, ...mdFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setStep("importing");
    setProgress(10);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      // Simulate progress since fetch doesn't give us upload progress easily for small files
      const progressInterval = setInterval(() => {
        setProgress(p => p < 90 ? p + 5 : p);
      }, 200);

      const res = await fetch(`/api/channels/${channelId}/md-import`, {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (data.success) {
        setStep("success");
        onSuccess();
      } else {
        throw new Error(data.message || "Import failed");
      }
    } catch (e: any) {
      setError(e.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setStep("upload");
    setProgress(0);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="rounded-[2.5rem] p-0 border-none shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-10 pb-0 shrink-0">
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <FileCode className="w-6 h-6" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tighter">Import Observation Nodes</DialogTitle>
            <DialogDescription className="text-gray-500 font-bold mt-2">
              Upload Markdown files to synthesize themes from your structured observations.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 px-10">
          <div className="py-2 space-y-6">
            {step === "upload" && (
              <>
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-[2rem] bg-gray-50 hover:bg-gray-100/80 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept=".md" 
                    multiple 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleFileChange} 
                    disabled={loading} 
                  />
                  <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-sm font-black text-gray-900">Drop observation nodes here</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Supports multiple .md files</p>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-red-600 border border-red-100 animate-in fade-in zoom-in-95 duration-300">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold">{error}</p>
                  </div>
                )}

                {files.length > 0 && (
                  <div className="space-y-3 pb-6">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Queue ({files.length})</span>
                      <button onClick={() => setFiles([])} className="text-[10px] font-black text-red-500 uppercase hover:underline">Clear All</button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl group hover:border-indigo-100 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
                            <span className="text-[9px] font-bold text-gray-300 uppercase shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <button onClick={() => removeFile(idx)} className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === "importing" && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-indigo-100 rounded-3xl animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Synchronizing Signal</h3>
                  <p className="text-sm font-medium text-gray-400">Constructing data points and initializing embeddings...</p>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={progress} className="h-2 rounded-full bg-gray-100" />
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-right">{Math.round(progress)}%</p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-100">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2 px-10">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Import Authorized</h3>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    {files.length} nodes have been ingested. AI theme derivation will take a moment to refresh semantic clusters.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-10 pt-4 border-t border-gray-50 bg-gray-50/30 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-start">
            {step === "success" ? (
              <Button onClick={handleClose} className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 w-full">
                Return to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} disabled={loading} className="rounded-2xl h-14 px-8 font-black text-xs uppercase tracking-widest border-gray-200 bg-white w-full sm:w-auto">
                  Discard
                </Button>
                <Button onClick={handleImport} disabled={loading || files.length === 0} className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex-1 w-full sm:w-auto">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Upload className="w-5 h-5 mr-3" />}
                  Import {files.length} Nodes
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
