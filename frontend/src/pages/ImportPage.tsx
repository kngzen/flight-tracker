import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { importOpenFlights } from "../lib/api";
import toast from "react-hot-toast";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await importOpenFlights(selectedFile);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["flights"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Imported ${res.imported} flights!`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Flights</h1>
        <p className="text-slate-400 mt-1">Import from OpenFlights CSV format</p>
      </div>

      {/* Format info */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Expected CSV Format
        </h2>
        <p className="text-sm text-slate-400">
          The importer accepts CSV files with any of these column names (case-insensitive):
        </p>
        <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
          date, from, to, airline, flight_number, aircraft, seat_class, seat, duration, reason, note
        </div>
        <p className="text-sm text-slate-400">
          Only <strong className="text-slate-200">date</strong>, <strong className="text-slate-200">from</strong>{" "}
          (IATA code), and <strong className="text-slate-200">to</strong> (IATA code) are required. All other
          fields are optional.
        </p>
        <p className="text-sm text-slate-400">
          Date formats accepted: <code className="text-slate-300">YYYY-MM-DD</code>,{" "}
          <code className="text-slate-300">DD/MM/YYYY</code>, <code className="text-slate-300">MM/DD/YYYY</code>
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragging
            ? "border-brand-500 bg-brand-500/10"
            : "border-slate-700 hover:border-slate-600"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        {selectedFile ? (
          <div>
            <p className="font-medium text-slate-200">{selectedFile.name}</p>
            <p className="text-sm text-slate-400 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
            </p>
          </div>
        ) : (
          <div>
            <p className="text-slate-300 font-medium">Drop your CSV file here</p>
            <p className="text-sm text-slate-500 mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <button
          className="btn-primary w-full"
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? "Importing..." : "Import Flights"}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="card flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-200">Import complete</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {result.imported} flights imported · {result.skipped} rows skipped
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="card space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Warnings ({result.errors.length})</span>
              </div>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-slate-400 font-mono">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
