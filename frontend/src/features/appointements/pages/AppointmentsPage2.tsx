// src/features/appointments/pages/AppointmentsPage.tsx
import { useAuth } from "@/store/auth";
import AdminAppointmentsPage from "../pages/AdminAppointmentsPage";
import DoctorAppointmentsPage from "../pages/DoctorAppointmentsPage";
import SecretaryAppointmentsPage from "../pages/SecreataryAppointmentsPage";

export default function AppointmentsPage() {
  const { user } = useAuth();
  if (!user) return <div className="p-4">Non authentifié.</div>;

  switch (user.role) {
    case "ADMIN":
      return <AdminAppointmentsPage />;
    case "DOCTOR":
      return <DoctorAppointmentsPage />;
    case "SECRETARY":
      return <SecretaryAppointmentsPage />;
    default:
      return <div className="p-4">Rôle inconnu.</div>;
  }
}
