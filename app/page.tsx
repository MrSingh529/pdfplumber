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
    if (!file) return setStatus("Please choose a PDF first.");
    if (file.type !== "application/pdf") return setStatus("Only PDF files are supported.");

    try {
      setIsUploading(true);
      setStatus("Uploading & converting…");

      const form = new FormData();
      form.append("file", file, file.name);

      const res = await fetch("/api/convert", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.text()) || `Conversion failed with ${res.status}`);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-white" />

      {/* header / brand */}
      <header className="relative z-10 flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-semibold">
            RV
          </div>
          <div className="text-xl font-semibold tracking-tight">
            RV Solutions
          </div>
        </div>
      </header>

      {/* content */}
      <main className="relative z-10 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-black/5 p-6">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-semibold">PDF → Excel</h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-medium">
              by RV Solutions
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Upload a PDF with tables. We’ll extract all tables and put each one on its own Excel sheet.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="border-2 border-dashed rounded-xl p-6 text-center">
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                id="pdf-input"
              />
              <label
                htmlFor="pdf-input"
                className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 transition"
              >
                Choose PDF
              </label>
              <div className="mt-2 text-sm text-gray-700">
                {fileName || "No file selected"}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition shadow-sm"
            >
              {isUploading ? "Converting…" : "Convert to Excel"}
            </button>

            {status && (
              <div className="text-sm text-gray-700 rounded-lg bg-gray-50 border px-3 py-2">
                {status}
              </div>
            )}
          </form>

          <footer className="mt-6 text-xs text-gray-500">
            Works best on machine-generated PDFs (not scans). Large files may take longer.
          </footer>
        </div>
      </main>

      {/* footer */}
      <div className="relative z-10 text-center text-xs text-gray-500 pb-8">
        © {new Date().getFullYear()} RV Solutions · All rights reserved
      </div>
    </div>
  );
}
