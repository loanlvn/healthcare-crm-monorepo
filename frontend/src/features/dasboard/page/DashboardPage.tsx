/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCw, 
  Bell, 
  Search,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Filter,
  X
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { useAuth } from "@/store/auth";
import {
  useCreateAppointment,
  useListAppointments,
} from "@/features/appointements/services/hooksAppointments2";
import type {
  AppointmentDTO,
  ListParams,
} from "../../appointements/types/AppointmentsTypes";
import { AppointmentEditor } from "@/features/appointements/pages/AppointmentEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NextAppointmentsWidget } from "@/components/ui/NextAppointmentsWidget";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/ButtonUI";
import { TextInput } from "@/components/ui/Input";
import type { CreateAppointmentBody } from "@/features/appointements/services/serviceAppointments2";

// ------------------ Helpers ------------------
const now = () => new Date();
const addDays = (d: number, base = now()) => new Date(base.getTime() + d * 86400000);
const statusColors: Record<AppointmentDTO["status"], string> = {
  SCHEDULED: "#3b82f6",
  CONFIRMED: "#10b981",
  CANCELLED: "#ef4444",
  NO_SHOW: "#f59e0b",
  DONE: "#6b7280",
};

function fullName(x?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!x) return "";
  return `${x.firstName ?? ""} ${x.lastName ?? ""}`.trim();
}

function toISO(d: Date) {
  return d.toISOString();
}

function toLocal(d: Date) {
  const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
}

function fromLocal(s: string) {
  return new Date(s);
}

// ------------------ Dashboard amélioré ------------------
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const isDoctor = role === "DOCTOR";
  const myDoctorId = (user as any)?.doctorId ?? user?.id ?? undefined;

  const initialFrom = useMemo(() => addDays(-30), []);
  const initialTo = useMemo(() => addDays(30), []);

  const [range, setRange] = useState<{ from: Date; to: Date }>({
    from: initialFrom,
    to: initialTo,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [doctorId, setDoctorId] = useState<string | undefined>(undefined);
  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [quickSearch, setQuickSearch] = useState("");

  // Params de liste appliqués au rôle - UTILISATION DU HOOK2
  const listParams: ListParams = useMemo(
    () => ({
      from: toISO(range.from),
      to: toISO(range.to),
      doctorId: isDoctor ? myDoctorId : doctorId,
      patientId,
      page: 1,
      pageSize: 100,
    }),
    [range.from, range.to, isDoctor, myDoctorId, doctorId, patientId, quickSearch]
  );

  // UTILISATION DU HOOK2
  const { data, isFetching, refetch } = useListAppointments(listParams);

  // Stats améliorées
  const isInside = (d: Date, a: Date, b: Date) => d >= a && d <= b;
  const wStart = now();
  const wEnd = addDays(7);

  const coversNext7 = range.from.getTime() <= wStart.getTime() && range.to.getTime() >= wEnd.getTime();

  const kpiSourceItems: AppointmentDTO[] = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter(a => {
      const s = new Date(a.startsAt);
      return isInside(s, wStart, wEnd);
    });
  }, [data?.items, wStart.getTime(), wEnd.getTime()]);

  const kpiQueryParams: ListParams = useMemo(
    () => ({
      from: toISO(wStart),
      to: toISO(wEnd),
      doctorId: isDoctor ? myDoctorId : undefined,
      page: 1,
      pageSize: 100,
    }),
    [isDoctor, myDoctorId, wStart.getTime(), wEnd.getTime()]
  );

  // UTILISATION DU HOOK2 pour les KPIs
  const { data: kpiQueryData } = useListAppointments(kpiQueryParams);

  const kpiItems = !coversNext7 ? (kpiQueryData?.items ?? []) : kpiSourceItems;

  // Statistiques avancées
  const stats = useMemo(() => {
    const items = kpiItems;
    let total = 0, confirmed = 0, scheduled = 0, cancelled = 0, done = 0;
    
    for (const a of items) {
      total++;
      if (a.status === "CONFIRMED") confirmed++;
      else if (a.status === "SCHEDULED") scheduled++;
      else if (a.status === "CANCELLED") cancelled++;
      else if (a.status === "DONE") done++;
    }

    const completionRate = total > 0 ? ((done + confirmed) / total) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

    return { 
      total, 
      confirmed, 
      scheduled, 
      cancelled, 
      done,
      completionRate: Math.round(completionRate),
      cancellationRate: Math.round(cancellationRate)
    };
  }, [kpiItems]);

  // UTILISATION DU HOOK2 pour la création
  const create = useCreateAppointment();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<{ startsAt?: string; endsAt?: string } | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);

  const events = (data?.items ?? []).map((a) => ({
    id: a.id,
    title: fullName(a.patient) || a.reason || "Rendez-vous",
    start: a.startsAt,
    end: a.endsAt,
    backgroundColor: statusColors[a.status],
    borderColor: statusColors[a.status],
    extendedProps: { appt: a },
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const editorInitial = useMemo(() => ({
    mode: "create" as const,
    startsAt: draft?.startsAt,
    endsAt: draft?.endsAt,
  }), [draft?.startsAt, draft?.endsAt]);

  return (
    <motion.div
      className="min-h-screen bg-background p-4 space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header amélioré */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center"
          >
            <CalendarIcon className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-fg">Tableau de bord</h1>
            <p className="text-sm text-muted">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Recherche rapide */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
            <TextInput
              id="quick-search"
              name="quick-search"
              value={quickSearch}
              onChange={(e: any) => setQuickSearch(e.target.value)}
              onBlur={() => {}}
              placeholder="Rechercher..."
              className="pl-10 w-64"
            />
          </div>

          {/* Filtres */}
          <Button
            variant={showFilters ? "primary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filtres
          </Button>

          <Button
            variant="ghost"
            onClick={() => refetch()}
            loading={isFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setDraft(null);
              setEditorOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouveau RDV
          </Button>
        </div>
      </motion.div>

      {/* Filtres avancés */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-fg">Filtres avancés</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Fermer
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg">
                    Période début
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={toLocal(range.from)}
                    onChange={(e) =>
                      setRange((r) => ({
                        ...r,
                        from: fromLocal(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg">
                    Période fin
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={toLocal(range.to)}
                    onChange={(e) =>
                      setRange((r) => ({ ...r, to: fromLocal(e.target.value) }))
                    }
                  />
                </div>
                {!isDoctor && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-fg">
                      Docteur ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                      <input
                        className="input pl-10"
                        placeholder="UUID du docteur"
                        value={doctorId ?? ""}
                        onChange={(e) =>
                          setDoctorId(e.target.value || undefined)
                        }
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg">
                    Patient ID
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                    <input
                      className="input pl-10"
                      placeholder="UUID du patient"
                      value={patientId ?? ""}
                      onChange={(e) =>
                        setPatientId(e.target.value || undefined)
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs améliorés */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        <KpiCard
          label="Total (7j)"
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          trend={stats.total > 0 ? "positive" : "neutral"}
        />
        <KpiCard
          label="Confirmés"
          value={stats.confirmed}
          icon={<UserCheck className="w-5 h-5" />}
          color="emerald"
          percentage={stats.completionRate}
        />
        <KpiCard
          label="Planifiés"
          value={stats.scheduled}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <KpiCard
          label="Annulés"
          value={stats.cancelled}
          icon={<X className="w-5 h-5" />}
          color="rose"
          percentage={stats.cancellationRate}
        />
        <KpiCard
          label="Terminés"
          value={stats.done}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <KpiCard
          label="Taux de réalisation"
          value={`${stats.completionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
      </motion.div>

      {/* Main grid: Calendar + Side */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Calendar */}
        <div className="xl:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-fg">
                Calendrier des rendez-vous
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Planifié</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span>Confirmé</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span>Annulé</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                allDaySlot={false}
                slotMinTime="07:00:00"
                slotMaxTime="20:00:00"
                events={events}
                selectable
                selectMirror
                select={(info) => {
                  setDraft({ startsAt: info.startStr, endsAt: info.endStr });
                  setEditorOpen(true);
                }}
                eventClick={(arg) => {
                  const appt = arg.event.extendedProps.appt as AppointmentDTO;
                  navigate(`/appointments/${appt.id}`);
                }}
                datesSet={(arg) => {
                  setRange({ from: arg.start, to: arg.end });
                }}
                height={650}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  meridiem: false,
                }}
              />
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <NextAppointmentsWidget
            title="À venir cette semaine"
            pageSize={5}
            showViewAll={true}
          />
          <TodayList
            appts={data?.items ?? []}
            onOpenAppt={(id) => navigate(`/appointments/${id}`)}
            onOpenPatient={(id) => navigate(`/patients/${id}`)}
          />
          <QuickActionsCard onNewAppointment={() => setEditorOpen(true)} />
        </div>
      </motion.div>

      {/* Create dialog - NOUVEAU AppointmentEditor */}
      <AppointmentEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setDraft(null);
        }}
        initial={editorInitial}
        onSubmit={(body: CreateAppointmentBody) => {
          create.mutate(body)
          setEditorOpen(false);
          setDraft(null);
        }}
        userRole={user?.role}
        currentDoctorId={isDoctor ? myDoctorId : undefined}
      />
    </motion.div>
  );
}

// ------------------ Composants améliorés ------------------

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: "blue" | "emerald" | "amber" | "rose" | "green" | "purple";
  percentage?: number;
  trend?: "positive" | "negative" | "neutral";
}

function KpiCard({ label, value, icon, color = "blue", percentage, trend = "neutral" }: KpiCardProps) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 text-blue-600",
    emerald: "from-emerald-500/10 to-emerald-600/10 text-emerald-600",
    amber: "from-amber-500/10 to-amber-600/10 text-amber-600",
    rose: "from-rose-500/10 to-rose-600/10 text-rose-600",
    green: "from-green-500/10 to-green-600/10 text-green-600",
    purple: "from-purple-500/10 to-purple-600/10 text-purple-600",
  };

  const trendIcons = {
    positive: "↗",
    negative: "↘",
    neutral: "→"
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className={`rounded-2xl bg-gradient-to-br ${colorClasses[color]} p-4 relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {percentage !== undefined && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/50">
                {percentage}%
              </span>
            )}
          </div>
          {trend !== "neutral" && (
            <p className="text-xs mt-1 opacity-70">
              {trendIcons[trend]} vs semaine dernière
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-white/20">
          {icon}
        </div>
      </div>
      
      {/* Background pattern */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <div className="w-full h-full bg-current rounded-full -translate-y-1/2 translate-x-1/2"></div>
      </div>
    </motion.div>
  );
}

function TodayList({
  appts,
  onOpenAppt,
  onOpenPatient,
}: {
  appts: AppointmentDTO[];
  onOpenAppt: (id: string) => void;
  onOpenPatient: (id: string) => void;
}) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  const today = appts
    .filter((a) => {
      const d = new Date(a.startsAt);
      return d >= start && d <= end;
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  const upcoming = today.filter(a => new Date(a.startsAt) > new Date());
  const passed = today.filter(a => new Date(a.startsAt) <= new Date());

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-fg">Aujourd'hui</h3>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Bell className="w-4 h-4" />
          <span>{today.length} RDV</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {upcoming.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-lg border border-token hover:bg-surface/50 transition-colors cursor-pointer group"
            onClick={() => onOpenAppt(a.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  className="font-medium truncate hover:underline text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPatient(a.patientId);
                  }}
                  title="Ouvrir la fiche patient"
                >
                  {fullName(a.patient) || a.patientId}
                </button>
                <StatusBadge status={a.status} />
              </div>
              <div className="text-xs text-muted flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>{new Date(a.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>·</span>
                <span>{a.location ?? "Lieu non précisé"}</span>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm">
                →
              </Button>
            </div>
          </motion.div>
        ))}
        
        {passed.length > 0 && (
          <div className="pt-2 border-t border-token">
            <p className="text-xs text-muted mb-2">Terminés aujourd'hui</p>
            {passed.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded text-sm opacity-60"
              >
                <span className="truncate">{fullName(a.patient)}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}

        {today.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-muted"
          >
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun rendez-vous aujourd'hui</p>
          </motion.div>
        )}
      </div>
    </Card>
  );
}

function QuickActionsCard({ onNewAppointment }: { onNewAppointment: () => void }) {
  const actions = [
    {
      label: "Nouveau RDV",
      description: "Créer un rendez-vous",
      icon: Plus,
      action: onNewAppointment,
      color: "primary"
    },
    {
      label: "Voir agenda",
      description: "Calendrier complet",
      icon: CalendarIcon,
      action: () => window.location.href = "/appointments",
      color: "outline"
    },
    {
      label: "Patients",
      description: "Gérer les patients",
      icon: Users,
      action: () => window.location.href = "/patients",
      color: "outline"
    }
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-fg mb-4">Actions rapides</h3>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant={action.color as any}
              fullWidth
              className="justify-start h-auto py-3"
              onClick={action.action}
              leftIcon={<action.icon className="w-4 h-4" />}
            >
              <div className="text-left">
                <div className="font-medium">{action.label}</div>
                <div className="text-xs text-muted">{action.description}</div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}