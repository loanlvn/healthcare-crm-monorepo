import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";

export function AppointmentsFilters({
  onChange,
}: {
  onChange: (v: { from?: string; to?: string }) => void;
}) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const payload = () => ({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Filter className="h-4 w-4" />
        <span>Filtrer par période</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="label">
          De
          <input
            className="input mt-1"
            aria-label="Filtrer à partir de"
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="label">
          À
          <input
            className="input mt-1"
            aria-label="Filtrer jusqu'à"
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary"
          onClick={() => onChange(payload())}
        >
          Appliquer
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-outline"
          onClick={() => {
            setFrom("");
            setTo("");
            onChange({});
          }}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
        </motion.button>
      </div>
    </div>
  );
}
