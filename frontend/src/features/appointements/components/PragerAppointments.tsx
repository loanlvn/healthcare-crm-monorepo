import { motion } from "framer-motion";

export function Pager({
  meta,
  onPage,
}: {
  meta?: { page: number; pageSize: number; total: number };
  onPage: (p: number) => void;
}) {
  if (!meta) return null;
  const max = Math.max(1, Math.ceil((meta.total ?? 0) / (meta.pageSize || 1)));
  const canPrev = meta.page > 1;
  const canNext = meta.page < max;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted">
        Total : <span className="badge">{meta.total ?? 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: canPrev ? 1.02 : 1 }}
          whileTap={{ scale: canPrev ? 0.98 : 1 }}
          disabled={!canPrev}
          className={`btn btn-outline btn-sm ${!canPrev ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPage(meta.page - 1)}
        >
          Préc.
        </motion.button>
        <span className="text-sm">
          Page {meta.page} / {max}
        </span>
        <motion.button
          whileHover={{ scale: canNext ? 1.02 : 1 }}
          whileTap={{ scale: canNext ? 0.98 : 1 }}
          disabled={!canNext}
          className={`btn btn-outline btn-sm ${!canNext ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => onPage(meta.page + 1)}
        >
          Suiv.
        </motion.button>
      </div>
    </div>
  );
}
