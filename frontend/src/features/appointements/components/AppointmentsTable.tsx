import { motion } from "framer-motion";
import { statusLabel, toLocalInput } from "../services/utilsAppointments";
import type { AppointmentDTO } from "../types/AppointmentsTypes";

export function AppointmentsTable({
  items,
  onEdit,
  onCancel,
  onForceReminder,
}: {
  items: AppointmentDTO[];
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onForceReminder?: (id: string) => void;
}) {
  if (!items?.length) return <p className="text-muted">Aucun rendez-vous.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-token surface">
      <table className="w-full text-sm">
        <thead
          className="sticky top-0 backdrop-blur-sm"
          style={{
            background: "color-mix(in oklab, var(--surface) 70%, transparent)",
          }}
        >
          <tr className="text-left">
            {[
              "Date",
              "Heure",
              "Patient",
              "Docteur",
              "Statut",
              "Raison",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-2 font-medium text-muted border-b border-token"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((a) => {
            const [date, time] = toLocalInput(a.startsAt).split("T");
            return (
              <motion.tr
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{
                  backgroundColor: "var(--surface-2)",
                  translateY: -1,
                }}
                className="border-b border-token"
              >
                <td className="px-3 py-2 whitespace-nowrap">{date}</td>
                <td className="px-3 py-2 whitespace-nowrap">{time}</td>
                <td className="px-3 py-2">
                  {a.patient
                    ? `${a.patient.firstName} ${a.patient.lastName}`
                    : a.patientId}
                </td>
                <td className="px-3 py-2">
                  {a.doctor
                    ? `${a.doctor.firstName} ${a.doctor.lastName}`
                    : a.doctorId}
                </td>
                <td className="px-3 py-2">
                  <span className="badge">{statusLabel(a.status)}</span>
                </td>
                <td
                  className="px-3 py-2 max-w-[22ch] truncate"
                  title={a.reason ?? ""}
                >
                  {a.reason ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {onEdit && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-outline btn-xs"
                        onClick={() => onEdit(a.id)}
                      >
                        Éditer
                      </motion.button>
                    )}
                    {onCancel && a.status !== "CANCELLED" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-outline btn-xs"
                        onClick={() => onCancel(a.id)}
                      >
                        Annuler
                      </motion.button>
                    )}
                    {onForceReminder &&
                      (a.status === "SCHEDULED" ||
                        a.status === "CONFIRMED") && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="btn btn-primary btn-xs"
                          onClick={() => onForceReminder(a.id)}
                        >
                          Rappel
                        </motion.button>
                      )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
