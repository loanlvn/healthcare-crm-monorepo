import { useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";

type Props = {
  src?: string | null;
  baseUrl?: string;
  bust?: string | number | null;
  initials?: string;
  size?: number;
  rounded?: "full" | "2xl";
  withBorder?: boolean;
  className?: string;

  // Mode édition (optionnel)
  editable?: boolean;
  uploading?: boolean;
  onPick?: (file: File) => void;
  accept?: string;
  hint?: string;
  alt?: string;
};

function buildSrc(src?: string | null, baseUrl?: string, bust?: string | number | null) {
  if (!src) return undefined;
  let final = src.startsWith("/") && baseUrl ? `${baseUrl}${src}` : src;
  if (bust != null && bust !== "") {
    final += (final.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(String(bust));
  }
  return final;
}

export default function Avatar({
  src,
  baseUrl,
  bust,
  initials = "U",
  size = 64,
  rounded = "2xl",
  withBorder = true,
  className,
  editable = false,
  uploading = false,
  onPick,
  accept = "image/png,image/jpeg,image/webp",
  hint,
  alt = "Avatar",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errored, setErrored] = useState(false);

  const computedSrc = useMemo(() => {
    setErrored(false); // src change -> on reset l'état erreur
    return buildSrc(src || undefined, baseUrl, bust);
  }, [src, baseUrl, bust]);

  const radiusCls = rounded === "full" ? "rounded-full" : "rounded-2xl";

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <div
          className={[
            "relative overflow-hidden grid place-items-center surface",
            radiusCls,
            withBorder ? "border border-token" : "",
          ].join(" ")}
          style={{ width: size, height: size }}
          title={computedSrc || ""}
        >
          {computedSrc && !errored ? (
            <img
              src={computedSrc}
              alt={alt}
              className="h-full w-full object-cover"
              onError={() => setErrored(true)}
              draggable={false}
            />
          ) : (
            <span className="text-sm font-semibold select-none">{initials}</span>
          )}
        </div>

        {editable && (
          <label
            className={`btn btn-outline text-sm cursor-pointer ${uploading ? "pointer-events-none opacity-70" : ""}`}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={16} />
            <span>{uploading ? "Téléversement…" : "Changer la photo"}</span>
          </label>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f && onPick) onPick(f);
            e.currentTarget.value = "";
          }}
          disabled={uploading}
        />
      </div>

      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
