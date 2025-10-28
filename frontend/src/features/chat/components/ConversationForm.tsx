/* eslint-disable @typescript-eslint/no-explicit-any */
// CreateConversationForm.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/ButtonUI';
import { TextInput } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { usePatientsForPicker } from '@/features/patients/services/hooksPatients';
import { useUserPicker, type RolePick } from '@/features/users/service/hooksUsers';
import { useAuth } from '@/store/auth';

interface CreateConversationFormProps {
  onCreate: (type: 'INTERNAL' | 'PATIENT', patientId: string, participantIds: string[]) => Promise<void>;
  isCreating: boolean;
}

export function CreateConversationForm({ onCreate, isCreating }: CreateConversationFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [conversationType, setConversationType] = useState<'INTERNAL' | 'PATIENT'>('INTERNAL');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Patients search
  const [patientQuery, setPatientQuery] = useState('');
  const [patientPage, setPatientPage] = useState(1);
  const patients = usePatientsForPicker({
    q: patientQuery,
    page: patientPage,
    pageSize: 20,
    orderBy: 'lastName',
    order: 'asc',
  });

  // Users search
  const [userQuery, setUserQuery] = useState('');
  const [userRole, setUserRole] = useState<RolePick>(isAdmin ? 'ALL' : (user?.role as RolePick));
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
    // Reset form
    setSelectedPatientId('');
    setSelectedParticipants([]);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Card>
      <h3 className="font-semibold text-lg mb-4">Nouvelle Conversation</h3>

      {/* Conversation Type Selection */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={conversationType === 'INTERNAL' ? 'primary' : 'outline'}
          onClick={() => setConversationType('INTERNAL')}
        >
          Interne
        </Button>
        <Button
          variant={conversationType === 'PATIENT' ? 'primary' : 'outline'}
          onClick={() => setConversationType('PATIENT')}
        >
          Patient
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {conversationType === 'PATIENT' && (
            <motion.div
              key="patient-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Patient Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rechercher un patient</label>
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
                    placeholder="Nom, email, téléphone..."
                    leftIcon={<span>🔍</span>}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => patients.refetch()}
                  >
                    Rechercher
                  </Button>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sélectionner un patient</label>
                <div className="border rounded-lg max-h-48 overflow-auto">
                  {patients.data?.items.map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-3 border-b cursor-pointer hover:bg-surface ${
                        selectedPatientId === patient.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <div className="font-medium">
                        {patient.lastName} {patient.firstName}
                      </div>
                      <div className="text-sm text-muted">
                        {patient.phone || patient.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Participants Selection */}
          <motion.div
            key="participants-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {conversationType === 'INTERNAL' ? 'Participants' : 'Participants internes (optionnel)'}
              </label>
              
              {/* Role Filter and Search */}
              <div className="flex gap-2">
                {isAdmin && (
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as RolePick)}
                    className="input text-sm"
                  >
                    <option value="ALL">Tous</option>
                    <option value="DOCTOR">Docteur</option>
                    <option value="SECRETARY">Secrétaire</option>
                    <option value="ADMIN">Admin</option>
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
                  placeholder="Rechercher un utilisateur..."
                  leftIcon={<span>👤</span>}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => users.refetch()}
                >
                  Go
                </Button>
              </div>

              {/* Users List */}
              <div className="border rounded-lg max-h-48 overflow-auto">
                {users.data?.items.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border-b cursor-pointer hover:bg-surface ${
                      selectedParticipants.includes(user.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleParticipant(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(user.id)}
                        onChange={() => {}}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <Button
          type="submit"
          fullWidth
          loading={isCreating}
          disabled={
            isCreating ||
            (conversationType === 'INTERNAL' && selectedParticipants.length === 0) ||
            (conversationType === 'PATIENT' && !selectedPatientId)
          }
        >
          {isCreating ? 'Création...' : 'Créer / Rejoindre'}
        </Button>

        <p className="text-xs text-muted text-center">
          Le serveur réutilise automatiquement une conversation existante avec les mêmes participants.
        </p>
      </form>
    </Card>
  );
}