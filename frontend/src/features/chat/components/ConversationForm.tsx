/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/ButtonUI";
import { TextInput } from "@/components/ui/Input";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { usePatientsForPicker } from "@/features/patients/services/hooksPatients";
import { useUserPicker, type RolePick } from "@/features/users/service/hooksUsers";
import { useAuth } from "@/store/auth";
import { User2Icon } from "lucide-react";

interface CreateConversationFormProps {
  onCreate: (type: "INTERNAL" | "PATIENT", patientId: string, participantIds: string[]) => Promise<void>;
  isCreating: boolean;
}

export function CreateConversationForm({ onCreate, isCreating }: CreateConversationFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [conversationType, setConversationType] = useState<"INTERNAL" | "PATIENT">("INTERNAL");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Patients search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const patients = usePatientsForPicker({
    q: patientQuery,
    page: patientPage,
    pageSize: 20,
    orderBy: "lastName",
    order: "asc",
  });

  // Users search
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState<RolePick>("ALL");
  const [userPage, setUserPage] = useState(1);
  const users = useUserPicker({
    q: userQuery,
    role: userRole,
    page: userPage,
    limit: 20,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate(conversationType, selectedPatientId, selectedParticipants);
    setSelectedPatientId("");
    setSelectedParticipants([]);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  return (
    <Card variant="ghost" elevation={0} className="p-0 backdrop-blur-sm">
      {/* Header compact */}
      <div className="px-4 py-3 border-b border-token flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wide">Nouvelle conversation</h3>

        {/* Segmented control compact */}
        <div className="inline-flex rounded-xl border border-token overflow-hidden">
          <button
            type="button"
            onClick={() => setConversationType("INTERNAL")}
            className={[
              "px-3 py-1.5 text-xs transition",
              conversationType === "INTERNAL"
                ? "bg-[color:color-mix(in_oklab,var(--surface)_90%,transparent)] font-medium"
                : "hover:bg-[color:color-mix(in_oklab,var(--surface)_70%,transparent)]",
            ].join(" ")}
          >
            Interne
          </button>
          <button
            type="button"
            onClick={() => setConversationType("PATIENT")}
            className={[
              "px-3 py-1.5 text-xs transition border-l border-token/60",
              conversationType === "PATIENT"
                ? "bg-[color:color-mix(in_oklab,var(--surface)_90%,transparent)] font-medium"
                : "hover:bg-[color:color-mix(in_oklab,var(--surface)_70%,transparent)]",
            ].join(" ")}
          >
            Patient
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {conversationType === "PATIENT" && (
            <motion.div
              key="patient-form"
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Patient Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Rechercher un patient</label>
                <div className="flex gap-2">
                  <TextInput
                    id="patient-search"
                    name="patient-search"
                    value={patientQuery}
                    onChange={(e: any) => {
                      setPatientQuery(e.target.value);
                      setPatientPage(1);
                    }}
                    onBlur={() => {}}
                    placeholder="Nom, email, téléphone…"
                    leftIcon={<span>🔍</span>}
                  />
                  <Button type="button" variant="outline" onClick={() => patients.refetch()}>
                    Rechercher
                  </Button>
                </div>
              </div>

              {/* Patient List (compact + séparateurs + état actif translucide) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Sélectionner un patient</label>
                <div className="rounded-xl border border-token overflow-hidden max-h-52">
                  {(patients.data?.items ?? []).map((patient) => {
                    const active = selectedPatientId === patient.id;
                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={[
                          "px-3 py-2 cursor-pointer border-b border-token/50 transition",
                          active
                            ? "bg-[color:color-mix(in_oklab,var(--surface)_90%,transparent)]"
                            : "hover:bg-[color:color-mix(in_oklab,var(--surface)_70%,transparent)]",
                        ].join(" ")}
                      >
                        <div className="font-medium text-sm truncate">
                          {patient.lastName} {patient.firstName}
                        </div>
                        <div className="text-xs text-muted truncate">{patient.phone || patient.email}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Participants Selection */}
          <motion.div key="participants-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                {conversationType === "INTERNAL" ? "Participants" : "Participants internes (optionnel)"}
              </label>

              {/* Filtres + search compacts */}
              <div className="flex gap-2">
                {isAdmin && (
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as RolePick)}
                    className="input h-auto"
                  >
                    <option value="ALL">TOUS</option>
                    <option value="DOCTOR">DOCTEUR</option>
                    <option value="SECRETARY">SECRÉTAIRE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                )}
                <TextInput
                  id="user-search"
                  name="user-search"
                  value={userQuery}
                  onChange={(e: any) => {
                    setUserQuery(e.target.value);
                    setUserPage(1);
                  }}
                  onBlur={() => {}}
                  placeholder="Rechercher un utilisateur…"
                  leftIcon={<span> <User2Icon /> </span>}
                />
                <Button type="button" variant="outline" onClick={() => users.refetch()}>
                  Go
                </Button>
              </div>

              {/* Users List (compact + check + séparateurs) */}
              <div className="rounded-xl border border-token overflow-hidden max-h-52">
                {(users.data?.items ?? []).map((u) => {
                  const checked = selectedParticipants.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleParticipant(u.id)}
                      className={[
                        "px-3 py-2 cursor-pointer border-b border-token/50 transition",
                        checked
                          ? "bg-[color:color-mix(in_oklab,var(--surface)_90%,transparent)]"
                          : "hover:bg-[color:color-mix(in_oklab,var(--surface)_70%,transparent)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="h-4 w-4 accent-[color:var(--primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {u.firstName} {u.lastName}
                          </div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="pt-1">
          <Button
            type="submit"
            fullWidth
            loading={isCreating}
            disabled={
              isCreating ||
              (conversationType === "INTERNAL" && selectedParticipants.length === 0) ||
              (conversationType === "PATIENT" && !selectedPatientId)
            }
          >
            {isCreating ? "Création..." : "Créer / Rejoindre"}
          </Button>
          <p className="text-[11px] text-muted text-center mt-2">
            Le serveur réutilise automatiquement une conversation existante avec les mêmes participants.
          </p>
        </div>
      </form>
    </Card>
  );
}
