# HealthCare CRM 

Monorepo contenant **frontend** (React + Vite + TypeScript) et **backend** (Node.js + Express + Prisma + PostgreSQL) pour un CRM médical :
- Authentification JWT + **RBAC** (ADMIN / DOCTOR / SECRETARY)
- Patients, Médecins, RDV (rappels), Messages/Chat, Facturation (invoices/payments), Notifications
- Upload d’avatars utilisateurs (local, dossier `backend/uploads/avatars`)

## 🗂️ Structure

├─ frontend/ # App React (Vite + TS)
│ ├─ src/
│ └─ .env.development # non commité
│ └─ .env.production # non commité
├─ backend/ # API Node/Express (TS) + Prisma
│ ├─ src/
│ ├─ prisma/ # schema + migrations + seed
│ └─ .env # non commité
└─ .gitignore

## 🧰 Stack principale
- **Frontend** : React 18, Vite, TypeScript
- **Backend** : Node 20, Express, TypeScript, Zod, Nodemailer
- **DB** : PostgreSQL + **Prisma**
- **Auth** : JWT + RBAC
- **Jobs** : rappels de rendez-vous
- **Tests/CI** : (à compléter si nécessaire)

---

## ⚙️ Prérequis
- Node.js ≥ 18 (idéalement 20)
- pnpm / npm / yarn (au choix)
- PostgreSQL ≥ 14 (local)

## ⚠️ Variables et .env du back 

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthcrm
JWT_SECRET=change-me
PORT=4000
NODE_ENV=development

# SMTP (si tu envoies des emails)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM="HealthCRM <noreply@exemple.com>"

## ⚠️ Variables et .env du front frontend/.env.development

VITE_API_URL=http://localhost:4000/api

## Démarrage back et front
-----------------------------------------------
cd backend
npm install

# Prisma
npx prisma generate
npx prisma migrate dev -n "init"

# (optionnel) Seed si dispo
# npm run seed
# ou: npx ts-node prisma/seed.ts

# Lancer en dev
npm run dev
------------------------------------------------
cd frontend
npm install
npm run dev
# App: http://localhost:5173
# API: http://localhost:4000/api

