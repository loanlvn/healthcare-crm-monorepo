/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchDoctorById } from "../service/doctors";
import { Button } from "@/components/ui/ButtonUI";

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => fetchDoctorById(id!),
    enabled: Boolean(id),
  });

  if (!id)
    return <div className="p-6 text-[color:var(--danger)]">ID manquant.</div>;
  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (isError)
    return (
      <div className="p-6 text-[color:var(--danger)]">
        {String((error as any)?.message ?? "Erreur")}
      </div>
    );
  if (!data) return <div className="p-6">Docteur introuvable.</div>;

  const full = `${data.firstName} ${data.lastName}`.trim();
  const specs = data.doctorProfile?.specialties ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dr {full}</h1>
        <Link to={`/doctors/${id}/profile`}>
          <Button>Éditer le profil</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs text-muted">Email</div>
          <div>{data.email}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Téléphone</div>
          <div>{data.doctorProfile?.phone || "—"}</div>
        </div>
        <div className="card p-4 md:col-span-2">
          <div className="text-xs text-muted mb-1">Spécialités</div>
          <div className="flex flex-wrap gap-2">
            {specs.length ? (
              specs.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "var(--muted-100)" }}
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
        </div>
        <div className="card p-4 md:col-span-2">
          <div className="text-xs text-muted mb-1">Bio</div>
          <div className="whitespace-pre-wrap">
            {data.doctorProfile?.bio || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
