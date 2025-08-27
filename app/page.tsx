"use client";
import React, { useState, useRef } from "react";

export default function HomePage() {
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setStatus("Please choose a PDF first.");
      return;
    }
    if (file.type !== "application/pdf") {
      setStatus("Only PDF files are supported.");
      return;
    }

    try {
      setIsUploading(true);
      setStatus("Uploading & converting…");

      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch("/api/convert", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Conversion failed with ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = file.name.replace(/\.pdf$/i, "");
      a.download = `${base || "output"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("Done! Your Excel has downloaded.");
    } catch (err: any) {
      setStatus(err?.message || "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">PDF → Excel</h1>
        <p className="text-sm text-gray-600 mb-6">Upload a PDF with tables. We’ll extract all tables and put each one on its own Excel sheet.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-6 text-center">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              id="pdf-input"
            />
            <label htmlFor="pdf-input" className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200">
              Choose PDF
            </label>
            <div className="mt-2 text-sm text-gray-700">{fileName || "No file selected"}</div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {isUploading ? "Converting…" : "Convert to Excel"}
          </button>

          {status && <div className="text-sm text-gray-700">{status}</div>}
        </form>

        <footer className="mt-6 text-xs text-gray-500">
          Works best on machine-generated PDFs (not scans). Large files may take longer.
        </footer>
      </div>
    </main>
  );
}