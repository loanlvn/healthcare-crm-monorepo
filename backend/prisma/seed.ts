/* eslint-disable */
import { PrismaClient, Prisma, Appointment, Patient, Invoice } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helpers
const now = new Date();
const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
const setTime = (date: Date, h: number, m = 0) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};
const euro = (n: number) => n.toFixed(2); // Prisma Decimal accepte string

async function main() {
await prisma.notification.deleteMany();
await prisma.payment.deleteMany();
await prisma.invoice.deleteMany();
await prisma.appointmentReminder.deleteMany();
await prisma.appointment.deleteMany();

await prisma.messageReceipt.deleteMany();
await prisma.message.deleteMany();
await prisma.conversationParticipant.deleteMany();
await prisma.conversation.deleteMany();

await prisma.patientDoctor.deleteMany();
await prisma.patient.deleteMany();
await prisma.passwordReset.deleteMany().catch(() => {});
await prisma.refreshToken.deleteMany();
await prisma.auditLog.deleteMany();
await prisma.doctorProfile.deleteMany();
await prisma.user.deleteMany();

  // 1) Users (+ DoctorProfile pour les DOCTOR)
  const passAdmin     = await bcrypt.hash('Admin123@', 10);
  const passDoctor1   = await bcrypt.hash('doctor123', 10);   // cardio
  const passDoctor2   = await bcrypt.hash('doctor123', 10);   // dermato
  const passSecretary = await bcrypt.hash('secretary123', 10);

  const [admin, doctor1, doctor2, secretary] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@clinic.local',
        passwordHash: passAdmin,
        firstName: 'Admin',
        lastName: 'Root',
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'dr.house@clinic.local',
        passwordHash: passDoctor1,
        firstName: 'Gregory',
        lastName: 'House',
        role: 'DOCTOR',
        isActive: true,
        mustChangePassword: false,
        DoctorProfile: {
          create: {
            specialties: ['Cardiologie', 'Médecine interne'],
            phone: '+351 910000010',
            bio: 'Cardiologue avec appétence pour les cas complexes.',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'derm@clinic.local',
        passwordHash: passDoctor2,
        firstName: 'Bob',
        lastName: 'Derm',
        role: 'DOCTOR',
        isActive: true,
        mustChangePassword: false,
        DoctorProfile: {
          create: {
            specialties: ['Dermatologie', 'Médecine du sport'],
            phone: '+351 910000011',
            bio: 'Dermatologue — pathologies inflammatoires et cutanées.',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'secretary@clinic.local',
        passwordHash: passSecretary,
        firstName: 'Lisa',
        lastName: 'Cuddy',
        role: 'SECRETARY',
        isActive: true,
        mustChangePassword: false,
      },
    }),
  ]);

  // 2) Patients (owner = doctor1). NEW champs soft delete présents par défaut.
  const patients = await prisma.$transaction([
    prisma.patient.create({
      data: {
        firstName: 'Alice',
        lastName: 'Martin',
        birthDate: new Date('1992-03-14'),
        phone: '+351 910000001',
        email: 'alice.martin@example.com',
        address: 'Rua das Flores 12, Lisboa',
        assuranceNumber: 'PT-ALC-922314',
        doctorName: 'Dr. Gregory House',
        notes: 'Allergie pénicilline.',
        ownerId: doctor1.id,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Bruno',
        lastName: 'Santos',
        birthDate: new Date('1988-10-02'),
        phone: '+351 910000002',
        email: 'bruno.santos@example.com',
        address: 'Av. da Liberdade 200, Lisboa',
        assuranceNumber: 'PT-BRU-881002',
        doctorName: 'Dr. Gregory House',
        notes: 'Hypertension légère.',
        ownerId: doctor1.id,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Carla',
        lastName: 'Ferreira',
        birthDate: new Date('1979-07-25'),
        phone: '+351 910000003',
        email: 'carla.ferreira@example.com',
        address: 'Praça do Comércio 5, Lisboa',
        assuranceNumber: 'PT-CAR-790725',
        doctorName: 'Dr. Gregory House',
        notes: 'Grossesse récente; suivi post-partum.',
        ownerId: doctor1.id,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Daniel',
        lastName: 'Costa',
        birthDate: new Date('2001-01-11'),
        phone: '+351 910000004',
        email: 'daniel.costa@example.com',
        address: 'R. Augusta 45, Lisboa',
        assuranceNumber: 'PT-DAN-010111',
        doctorName: 'Dr. Gregory House',
        notes: 'Asthme effort; inhalateur.',
        ownerId: doctor1.id,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Eva',
        lastName: 'Gomes',
        birthDate: new Date('1995-12-09'),
        phone: '+351 910000005',
        email: 'eva.gomes@example.com',
        address: 'R. Garrett 9, Lisboa',
        assuranceNumber: 'PT-EVA-951209',
        doctorName: 'Dr. Gregory House',
        notes: 'Migraine; triptans en cours.',
        ownerId: doctor1.id,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Filipe',
        lastName: 'Oliveira',
        birthDate: new Date('1984-05-30'),
        phone: '+351 910000006',
        email: 'filipe.oliveira@example.com',
        address: 'Campo Pequeno 3, Lisboa',
        assuranceNumber: 'PT-FIL-840530',
        doctorName: 'Dr. Gregory House',
        notes: 'Diabète type 2 (métformine).',
        ownerId: doctor1.id,
      },
    }),
  ]);

  // 2.b) Assignations multi-docteurs (PatientDoctor)
  // On assigne doctor2 (Dermatologie) sur 1 patient pour tester les permissions
  await prisma.patientDoctor.create({
    data: {
      patientId: patients[0].id,     // Alice
      doctorId: doctor2.id,          // dermato
      specialty: 'Dermatologie',
      primary: false,
      assignedBy: admin.id,
    },
  });

  // 3) Appointments — on laisse majoritairement doctor1 ; un RDV avec doctor2 pour l’exemple
  type AppPlan = {
    p: Patient;
    dayOffset: number;
    start: number;
    durationMin: number;
    reason: string;
    location: string; 
    doctorId?: string;
  }
  const appointments: Appointment[] = [];
  const apptsData: AppPlan[] = [
    { p: patients[0], dayOffset: -2, start: 9,  durationMin: 30, reason: 'Consultation initiale', location: 'Cabinet 1' },
    { p: patients[1], dayOffset: -1, start: 10, durationMin: 30, reason: 'Suivi tension',         location: 'Cabinet 1' },
    { p: patients[2], dayOffset:  0, start: 11, durationMin: 45, reason: 'Post-partum',           location: 'Cabinet 2' },
    { p: patients[3], dayOffset:  1, start: 9,  durationMin: 30, reason: 'Crise d’asthme',        location: 'Cabinet 1' },
    { p: patients[4], dayOffset:  1, start: 10, durationMin: 30, reason: 'Migraine récurrente',   location: 'Cabinet 2', doctorId: doctor2.id },
    { p: patients[5], dayOffset:  2, start: 14, durationMin: 30, reason: 'Bilan diabète',         location: 'Cabinet 1' },
    { p: patients[0], dayOffset:  3, start: 9,  durationMin: 30, reason: 'Résultats analyses',    location: 'Cabinet 2' },
    { p: patients[2], dayOffset:  4, start: 15, durationMin: 30, reason: 'Suivi gynéco',          location: 'Cabinet 1' },
  ];
  for (const a of apptsData) {
    const start = setTime(addDays(a.dayOffset), a.start);
    const end = setTime(addDays(a.dayOffset), a.start, a.durationMin);
    const created = await prisma.appointment.create({
      data: {
        patientId: a.p.id,
        doctorId: a.doctorId ?? doctor1.id,
        startsAt: start,
        endsAt: end,
        reason: a.reason,
        status: a.dayOffset < 0 ? 'DONE' : a.dayOffset === 0 ? 'CONFIRMED' : 'SCHEDULED',
        location: a.location,
        notes: '',
      },
    });
    appointments.push(created);

    for (const a of appointments) {
  // on ne planifie que pour les RDV à venir, utiles et encore actifs
  if (['SCHEDULED', 'CONFIRMED'].includes(a.status) && a.startsAt > now) {
    const scheduledAt = new Date(a.startsAt.getTime() - 24 * 60 * 60 * 1000);

    // Si le RDV est dans <24h, scheduledAt sera dans le passé -> le job l’enverra au prochain tick
    await prisma.appointmentReminder.upsert({
      where: { appointmentId: a.id },
      create: {
        appointmentId: a.id,
        scheduledAt,
        status: 'PENDING',
      },
      update: {
        scheduledAt,
        status: 'PENDING',
        lastError: null,
        retryCount: 0,
      },
    });
  } else {
    // Sécurité: si RDV passé/annulé/done/no_show → s’assurer qu’aucun reminder n’existe
    await prisma.appointmentReminder.deleteMany({
      where: { appointmentId: a.id },
    });
  }
}
  }

  // 4) Invoices
  const prefix = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  let counter = 1;
  const nextNumber = () => `${prefix}${String(counter++).padStart(4, '0')}`;

  const invoices = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        patientId: patients[0].id,
        appointmentId: appointments[0].id, // passé → DONE
        issuerId: doctor1.id,
        number: nextNumber(),
        date: addDays(-2),
        items: [
          { label: 'Consultation', qty: 1, unitPrice: 50, taxRate: 0.23 },
          { label: 'ECG',          qty: 1, unitPrice: 30, taxRate: 0.23 },
        ] as unknown as Prisma.JsonArray,
        subtotal: euro(80),
        taxTotal: euro(18.40),
        total: euro(98.40),
        status: 'PAID',
        paidAt: addDays(-2),
        pdfUrl: 'https://example.com/invoices/paid-1.pdf',
        sentAt: addDays(-2),
      },
    }),
    prisma.invoice.create({
      data: {
        patientId: patients[1].id,
        appointmentId: appointments[1].id,
        issuerId: doctor1.id,
        number: nextNumber(),
        date: addDays(-1),
        items: [{ label: 'Consultation suivi', qty: 1, unitPrice: 50, taxRate: 0.23 }] as unknown as Prisma.JsonArray,
        subtotal: euro(50),
        taxTotal: euro(11.50),
        total: euro(61.50),
        status: 'SENT',
        sentAt: addDays(-1),
        pdfUrl: 'https://example.com/invoices/sent-2.pdf',
      },
    }),
    prisma.invoice.create({
      data: {
        patientId: patients[2].id,
        appointmentId: appointments[2].id,
        issuerId: doctor1.id,
        number: nextNumber(),
        date: now,
        items: [{ label: 'Consultation gynéco', qty: 1, unitPrice: 70, taxRate: 0.23 }] as unknown as Prisma.JsonArray,
        subtotal: euro(70),
        taxTotal: euro(16.10),
        total: euro(86.10),
        status: 'DRAFT',
      },
    }),
    prisma.invoice.create({
      data: {
        patientId: patients[4].id,
        appointmentId: appointments[4].id, // RDV doctor2
        issuerId: doctor2.id,
        number: nextNumber(),
        date: addDays(1),
        items: [{ label: 'Traitement migraine', qty: 1, unitPrice: 40, taxRate: 0.23 }] as unknown as Prisma.JsonArray,
        subtotal: euro(40),
        taxTotal: euro(9.20),
        total: euro(49.20),
        status: 'SENT',
        sentAt: addDays(1),
        pdfUrl: 'https://example.com/invoices/sent-4.pdf',
      },
    }),
    prisma.invoice.create({
      data: {
        patientId: patients[5].id,
        appointmentId: appointments[5].id,
        issuerId: doctor1.id,
        number: nextNumber(),
        date: addDays(2),
        items: [
          { label: 'Consultation diabète', qty: 1, unitPrice: 60, taxRate: 0.23 },
          { label: 'HbA1c',               qty: 1, unitPrice: 20, taxRate: 0.23 },
        ] as unknown as Prisma.JsonArray,
        subtotal: euro(80),
        taxTotal: euro(18.40),
        total: euro(98.40),
        status: 'PAID',
        sentAt: addDays(2),
        paidAt: addDays(2),
        pdfUrl: 'https://example.com/invoices/paid-5.pdf',
      },
    }),
  ]);

  // 5) Payments
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: invoices[0].id,
        amount: euro(98.40),
        method: 'CARD',
        paidAt: addDays(-2),
        reference: 'POS-0001',
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[4].id,
        amount: euro(98.40),
        method: 'TRANSFER',
        paidAt: addDays(2),
        reference: 'IBAN-TRF-2025-0005',
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[1].id,
        amount: euro(30.00), // partiel
        method: 'CASH',
        paidAt: addDays(-1),
        reference: 'CASH-0002',
      },
    }),
  ]);

// 6) Conversations & Messages (nouveau modèle)

//
// Helpers pour le chat
//
async function ensureParticipants(conversationId: string, userIds: string[]) {
  const unique = Array.from(new Set(userIds));
  await prisma.conversationParticipant.createMany({
    data: unique.map((uid) => ({ conversationId, userId: uid })),
    skipDuplicates: true,
  });
  return unique;
}

async function postMessage(conversationId: string, senderId: string, content: string, type: 'NOTE' | 'ALERT' | 'REMINDER' = 'NOTE', createdAt?: Date) {
  const msg = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      type,
      ...(createdAt ? { createdAt } : {}),
    },
  });

  // Receipts: sender lu, les autres non-lu
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  await prisma.messageReceipt.createMany({
    data: participants.map((p) => ({
      messageId: msg.id,
      userId: p.userId,
      readAt: p.userId === senderId ? msg.createdAt : null,
    })),
  });

  // lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: msg.createdAt },
  });

  return msg;
}

//
// 6.a) Conversations PATIENT (une par patient, participants = owner (doctor1) + secretary)
//      -> seuls les messages du DOCTOR owner sont seedés ici (conforme à la règle)
//
const patientConversations = new Map<string, string>();

for (const p of patients) {
  const conv = await prisma.conversation.create({
    data: {
      type: 'PATIENT',
      patientId: p.id,
    },
    select: { id: true },
  });
  patientConversations.set(p.id, conv.id);

  await ensureParticipants(conv.id, [doctor1.id, secretary.id]);
}

// Messages dans PATIENT conv — envoyés par le DOCTOR owner (doctor1)
await postMessage(
  patientConversations.get(patients[0].id)!,
  doctor1.id,
  "Préparer le dossier d'Alice pour contrôle ECG.",
  'NOTE'
);
await postMessage(
  patientConversations.get(patients[1].id)!,
  doctor1.id,
  'Bruno a appelé: tension élevée hier soir.',
  'ALERT'
);
await postMessage(
  patientConversations.get(patients[2].id)!,
  doctor1.id,
  'Envoyer rappel RDV post-partum.',
  'REMINDER'
);
await postMessage(
  patientConversations.get(patients[4].id)!,
  doctor1.id,
  'Eva demande un justificatif pour son employeur.',
  'NOTE'
);
await postMessage(
  patientConversations.get(patients[5].id)!,
  doctor1.id,
  'Prévoir bandelettes glycémiques pour Filipe.',
  'REMINDER'
);
await postMessage(
  patientConversations.get(patients[0].id)!,
  doctor1.id,
  "Dossier d'Alice prêt pour revue.",
  'NOTE'
);
await postMessage(
  patientConversations.get(patients[3].id)!,
  doctor1.id,
  'Daniel: renouvellement Ventoline.',
  'REMINDER'
);
await postMessage(
  patientConversations.get(patients[1].id)!,
  doctor1.id,
  'Programmer Holter pour Bruno.',
  'ALERT'
);
await postMessage(
  patientConversations.get(patients[2].id)!,
  doctor1.id,
  'Carla confirme sa présence demain.',
  'NOTE'
);
await postMessage(
  patientConversations.get(patients[4].id)!,
  doctor1.id,
  'Envoyer ordonnance anti-migraine à la pharmacie.',
  'NOTE'
);

//
// 6.b) Conversation INTERNAL 1-to-1 (doctor1 <-> secretary) pour la coordination staff
//
const internalConv = await prisma.conversation.create({
  data: { type: 'INTERNAL' },
  select: { id: true },
});
await ensureParticipants(internalConv.id, [doctor1.id, secretary.id]);

await postMessage(internalConv.id, secretary.id, "J'ai mis à jour l'agenda de demain.", 'NOTE');
await postMessage(internalConv.id, doctor1.id, 'Merci, je regarde les dossiers.', 'NOTE');

// (Optionnel) INTERNAL doctor1 <-> admin
const internalAdminConv = await prisma.conversation.create({
  data: { type: 'INTERNAL' },
  select: { id: true },
});
await ensureParticipants(internalAdminConv.id, [doctor1.id, admin.id]);
await postMessage(internalAdminConv.id, admin.id, 'Pense aux factures en attente.', 'REMINDER');


  // 7) Notifications
  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: doctor1.id,
        type: 'APPOINTMENT_REMINDER',
        payload: { appointmentId: appointments[2].id, at: appointments[2].startsAt },
        channel: 'IN_APP',
        status: 'PENDING',
      },
    }),
    prisma.notification.create({
      data: {
        userId: secretary.id,
        type: 'MESSAGE_NEW',
        payload: { patientId: patients[0].id },
        channel: 'IN_APP',
        status: 'READ',
      },
    }),
    prisma.notification.create({
      data: {
        userId: doctor1.id,
        type: 'INVOICE_SENT',
        payload: { invoiceId: invoices[1].id },
        channel: 'IN_APP',
        status: 'SENT',
      },
    }),
    prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'PAYMENT_RECEIVED',
        payload: { invoiceId: invoices[0].id, amount: 98.4 },
        channel: 'IN_APP',
        status: 'SENT',
      },
    }),
    prisma.notification.create({
      data: {
        userId: doctor2.id,
        type: 'PAYMENT_RECEIVED',
        payload: { invoiceId: invoices[3].id, amount: 49.2 },
        channel: 'IN_APP',
        status: 'SENT',
      },
    }),
    prisma.notification.create({
      data: {
        userId: secretary.id,
        type: 'MESSAGE_NEW',
        payload: { patientId: patients[3].id },
        channel: 'IN_APP',
        status: 'PENDING',
      },
    }),
  ]);

console.log('✅ Seed ok :',
  '\n- users:', await prisma.user.count(),
  '\n- doctorProfiles:', await prisma.doctorProfile.count(),
  '\n- patients:', await prisma.patient.count(),
  '\n- patientDoctors:', await prisma.patientDoctor.count(),
  '\n- appointments:', await prisma.appointment.count(),
  '\n- invoices:', await prisma.invoice.count(),
  '\n- payments:', await prisma.payment.count(),
  '\n- conversations:', await prisma.conversation.count(),
  '\n- messages:', await prisma.message.count(),
  '\n- messageReceipts:', await prisma.messageReceipt.count(),
  '\n- notifications:', await prisma.notification.count()
);

}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
