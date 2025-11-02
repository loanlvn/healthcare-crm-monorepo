/* eslint-disable @typescript-eslint/no-explicit-any */
// src/features/billing/components/PdfActions.tsx
import { useMemo, useState } from "react";
import { fetchPdfBlob } from "../../lib/pdfClient"

function isCrossOrigin(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin !== window.location.origin;
  } catch {
    // chemins relatifs -> same-origin
    return false;
  }
}

export function PdfActions({ pdfUrl }: { pdfUrl: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | "preview" | "newtab" | "download">(false);
  const [err, setErr] = useState<string | null>(null);
  const cross = useMemo(() => isCrossOrigin(pdfUrl), [pdfUrl]);

  async function handlePreviewInline() {
    setErr(null);
    if (cross) {
      setErr("Aperçu inline impossible: ressource cross-origin sans CORS. Ouvre dans un onglet.");
      return;
    }
    try {
      setBusy("preview");
      const { blob } = await fetchPdfBlob(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function handleOpenNewTab() {
    setErr(null);
    try {
      setBusy("newtab");
      if (cross) {
        // Pas de fetch -> navigation directe, pas bloquée par CORS
        const win = window.open(pdfUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          const a = document.createElement("a");
          a.href = pdfUrl; a.target = "_blank"; a.rel = "noopener"; a.click();
        }
      } else {
        const { blob } = await fetchPdfBlob(pdfUrl);
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
          const a = document.createElement("a");
          a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  async function handleDownload() {
    setErr(null);
    if (cross) {
      // Le download attribute est ignoré sur cross-origin dans la plupart des browsers.
      // On tente une navigation directe ; l'utilisateur pourra "Enregistrer sous..." dans le viewer PDF.
      const win = window.open(pdfUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        const a = document.createElement("a");
        a.href = pdfUrl; a.target = "_blank"; a.rel = "noopener"; a.click();
      }
      return;
    }
    try {
      setBusy("download");
      const { blob, filename } = await fetchPdfBlob(pdfUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline" onClick={handlePreviewInline} disabled={!!busy}>
          {busy === "preview" ? "Préparation…" : "Aperçu dans la page"}
        </button>
        <button type="button" className="btn btn-outline" onClick={handleOpenNewTab} disabled={!!busy}>
          {busy === "newtab" ? "Ouverture…" : "Ouvrir dans un onglet"}
        </button>
        <button type="button" className="btn btn-outline" onClick={handleDownload} disabled={!!busy}>
          {busy === "download" ? "Téléchargement…" : "Télécharger PDF"}
        </button>
      </div>

      {err && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm whitespace-pre-wrap">
          {err}
        </div>
      )}

      {previewUrl && (
        <div className="mt-2 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-token bg-surface">
            <div className="text-sm text-muted">Aperçu PDF</div>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
            >
              Fermer
            </button>
          </div>
          <iframe title="Aperçu PDF" src={previewUrl} className="w-full h-[70vh]" />
        </div>
      )}
    </div>
  );
}
