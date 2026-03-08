"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, FileText, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

interface CSVImportDialogProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CSVImportDialog({ channelId, isOpen, onClose, onSuccess }: CSVImportDialogProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Mapping State
  const [contentCol, setContentCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [fieldMappings, setFieldMappings] = useState<Record<string, { import: boolean, name: string }>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('preview', 'true');

    try {
      const res = await fetch(`/api/channels/${channelId}/csv-import`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setPreviewData(data);
      
      // Initialize mappings
      const initial: any = {};
      data.headers.forEach((h: string) => {
        initial[h] = { import: true, name: h };
      });
      setFieldMappings(initial);
      
      // Try to guess content column
      const contentGuess = data.headers.find((h: string) => 
        ['content', 'message', 'text', 'body', 'description'].includes(h.toLowerCase())
      );
      if (contentGuess) setContentCol(contentGuess);

      setStep(2);
    } catch (e) {
      alert("Failed to parse CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !contentCol) return;
    setLoading(true);
    
    const fieldsToImport = Object.entries(fieldMappings)
      .filter(([col, cfg]) => cfg.import && col !== contentCol && col !== dateCol)
      .map(([col, cfg]) => ({ column: col, display_name: cfg.name }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'false');
    formData.append('mappings', JSON.stringify({
      content_column: contentCol,
      date_column: dateCol || null,
      fields_to_import: fieldsToImport
    }));

    try {
      const res = await fetch(`/api/channels/${channelId}/csv-import`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setStep(3);
        onSuccess();
      }
    } catch (e) {
      alert("Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            {step === 1 && "Upload a .csv file to import messages into this channel."}
            {step === 2 && "Map your CSV columns to Pulse fields."}
            {step === 3 && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={loading} />
              {loading ? (
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
              ) : (
                <Upload className="w-10 h-10 text-gray-400 mb-4" />
              )}
              <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">.csv files only, up to 5MB</p>
            </div>
          )}

          {step === 2 && previewData && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-indigo-600 font-bold">Content Column (Required)</Label>
                  <Select value={contentCol} onValueChange={setContentCol}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {previewData.headers.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Column (Optional)</Label>
                  <Select value={dateCol} onValueChange={setDateCol}>
                    <SelectTrigger><SelectValue placeholder="Original date" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Set to Now</SelectItem>
                      {previewData.headers.map((h: string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="font-bold">Additional Columns as Filters</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Column Name</TableHead>
                        <TableHead>Display Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.headers.filter((h: string) => h !== contentCol && h !== dateCol).map((h: string) => (
                        <TableRow key={h}>
                          <TableCell>
                            <Switch 
                              checked={fieldMappings[h]?.import} 
                              onCheckedChange={(checked) => setFieldMappings(prev => ({ ...prev, [h]: { ...prev[h], import: checked } }))} 
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{h}</TableCell>
                          <TableCell>
                            <Input 
                              size={1} 
                              className="h-8 text-xs" 
                              value={fieldMappings[h]?.name}
                              onChange={(e) => setFieldMappings(prev => ({ ...prev, [h]: { ...prev[h], name: e.target.value } }))}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Import Successful!</h3>
              <p className="text-gray-500 mt-2">Your messages are being processed. AI themes will update shortly.</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-gray-50/50">
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleImport} disabled={loading || !contentCol} className="bg-indigo-600">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Import {previewData.row_count} rows
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={onClose} className="w-full">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
