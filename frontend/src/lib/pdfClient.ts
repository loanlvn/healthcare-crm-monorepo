import { api } from "@/lib/api";

function toApiPath(u: string): string {
  try {
    const p = new URL(u, window.location.origin).pathname;
    return p.replace(/^\/api\//, "");
  } catch {
    return u.replace(/^\/api\//, "");
  }
}

function parseFilename(disposition: string | null): string {
  if (!disposition) return "";
  const m = /filename\*?=(?:UTF-8'')?("?)([^";]+)\1/.exec(disposition);
  return m ? decodeURIComponent(m[2]) : "";
}

async function safeText(r: Response): Promise<string> {
  try { return await r.clone().text(); } catch { return ""; }
}

export async function fetchPdfBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  const path = url.startsWith("/api/") ? toApiPath(url) : url;

  const resp = await api.get(path, {
    credentials: "include" as RequestCredentials,
    headers: { Accept: "application/pdf" },
    timeout: false,
  });

  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${txt.slice(0, 200)}`);
  }

  const ab = await resp.arrayBuffer();

  // Vérifie qu'on a bien un PDF (magic header)
  const head = new Uint8Array(ab).slice(0, 5);
  const isPdf = head.length === 5 && String.fromCharCode(...head) === "%PDF-";
  if (!isPdf) {
    const txt = await new Response(ab).text().catch(() => "");
    throw new Error(`Not a PDF — ${txt.slice(0, 200)}`);
  }

  const filename = parseFilename(resp.headers.get("content-disposition")) || "invoice.pdf";
  const blob = new Blob([ab], { type: "application/pdf" });
  return { blob, filename };
}
