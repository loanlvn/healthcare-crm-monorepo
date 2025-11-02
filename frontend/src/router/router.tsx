import { createBrowserRouter, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppLayout from "../layout/AppLayout";
import { AdminOnly, Protected } from "../router/ProtectedRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import MePage from "../features/users/pages/MePage";
import UserDetailPage from "../features/users/pages/UserDetailPage";
import UsersListPage from "../features/users/pages/UsersListiPage";
import ChangePasswordPage from "../features/auth/pages/ChangePasswordPage";
import UserCreatePage from "../features/users/pages/UserCreatedPage";
import ForgotRequestPage from "@/features/auth/pages/ForgotRequestPage";
import ForgotVerifyPage from "@/features/auth/pages/ForgotVerifyPage";
import ForgotResetPage from "@/features/auth/pages/ForgotResetPage";
import DoctorsListPage from "@/features/doctors/pages/DoctorsListPage";
import DoctorDetailPage from "@/features/doctors/pages/DoctorsDetailPage";
import DoctorsProfileEditPage from "@/features/doctors/pages/DoctorEditPage";
import PatientCreatePage from "@/features/patients/pages/PatientCreatePage";
import PatientDetailPage from "@/features/patients/pages/PatientsDetailPage";
import PatientsEditPage from "@/features/patients/pages/PatientsEditPage";
import PatientsListPage from "@/features/patients/pages/PatientsListPage";
import ConversationsPage from "@/features/chat/pages/ConversationPage3";

const DashboardPage = lazy(
  () => import("@/features/dasboard/page/DashboardPage")
);
const AppointmentsPage = lazy(
  () => import("@/features/appointements/pages/AppointmentsPage2")
);
const AppointmentDetailPage = lazy(
  () => import("@/features/appointements/pages/AppointmentDetailPage")
);
const InvoicesPage = lazy(
  () => import("@/features/billing/pages/InvoicesPage")
);
const InvoiceDetailPage = lazy(
  () => import("@/features/billing/pages/InvoiceDetailPage")
);
const NewInvoicePage = lazy(
  () => import("@/features/billing/pages/NewInvoicePage")
);
const PaymentsPage = lazy(
  () => import("@/features/billing/pages/PaymentsPage")
);
const NewPaymentPage = lazy(
  () => import("@/features/billing/pages/NewPaymentPage")
);

const Fallback = <div className="p-6 text-sm text-muted">Chargement…</div>;

export const router = createBrowserRouter([
  // --- PUBLIC ---
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot", element: <ForgotRequestPage /> },
  { path: "/forgot/verify", element: <ForgotVerifyPage /> },
  { path: "/forgot/reset", element: <ForgotResetPage /> },
  {
    path: "/change-password",
    element: (
      <Protected>
        <ChangePasswordPage />
      </Protected>
    ),
  },

  // --- PROTÉGÉ ---
  {
    path: "/",
    element: <AppLayout />,
    children: [
      // Dashboard réel (calendrier + widgets)
      {
        path: "/dashboard",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <DashboardPage />
            </Suspense>
          </Protected>
        ),
      },

      // Onglet Rendez-vous (table + filtres + actions)
      {
        path: "/appointments",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <AppointmentsPage />
            </Suspense>
          </Protected>
        ),
      },
      {
        path: "/appointments/:id",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <AppointmentDetailPage />
            </Suspense>
          </Protected>
        ),
      },
      // Utilisateurs
      {
        path: "/me",
        element: (
          <Protected>
            <MePage />
          </Protected>
        ),
      },
      {
        path: "/users",
        element: (
          <AdminOnly>
            <UsersListPage />
          </AdminOnly>
        ),
      },
      {
        path: "/users/new",
        element: (
          <AdminOnly>
            <UserCreatePage />
          </AdminOnly>
        ),
      },
      {
        path: "/users/:id",
        element: (
          <AdminOnly>
            <UserDetailPage />
          </AdminOnly>
        ),
      },

      // Docteurs
      {
        path: "/doctors",
        element: (
          <AdminOnly>
            <DoctorsListPage />
          </AdminOnly>
        ),
      },
      {
        path: "/doctors/:id",
        element: (
          <AdminOnly>
            <DoctorDetailPage />
          </AdminOnly>
        ),
      },
      {
        path: "/doctors/:id/profile",
        element: (
          <AdminOnly>
            <DoctorsProfileEditPage />
          </AdminOnly>
        ),
      },

      // Patients
      {
        path: "/patients",
        element: (
          <Protected>
            <PatientsListPage />
          </Protected>
        ),
      },
      {
        path: "/patients/new",
        element: (
          <Protected>
            <PatientCreatePage />
          </Protected>
        ),
      },
      {
        path: "/patients/:id",
        element: (
          <Protected>
            <PatientDetailPage />
          </Protected>
        ),
      },
      {
        path: "/patients/:id/edit",
        element: (
          <Protected>
            <PatientsEditPage />
          </Protected>
        ),
      },

      // Chat
      {
        path: "/chat",
        element: (
          <Protected>
            <ConversationsPage />
          </Protected>
        ),
      },

      // Billing — Invoices
      {
        path: "/billing/invoices",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <InvoicesPage />
            </Suspense>
          </Protected>
        ),
      },
      {
        path: "/billing/invoices/:id",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <InvoiceDetailPage />
            </Suspense>
          </Protected>
        ),
      },
      {
        path: "/billing/new-invoice",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <NewInvoicePage />
            </Suspense>
          </Protected>
        ),
      },

      // Billing — Payments
      {
        path: "/billing/payments",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <PaymentsPage />
            </Suspense>
          </Protected>
        ),
      },
      {
        path: "/billing/new-payment",
        element: (
          <Protected>
            <Suspense fallback={Fallback}>
              <NewPaymentPage />
            </Suspense>
          </Protected>
        ),
      },

      // Index -> dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // 404
      {
        path: "*",
        element: (
          <div className="p-6 text-sm text-muted">Page introuvable.</div>
        ),
      },
    ],
  },
]);
