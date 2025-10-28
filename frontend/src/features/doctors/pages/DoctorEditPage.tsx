/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchDoctorById, updateDoctorProfile, toSpecialtyArray } from '../service/doctors';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/widget/Form';
import { TextField } from '@/components/widget/TextField';
import { Button } from '@/components/ui/ButtonUI';
import { queryClient } from '@/lib/query'; 

const schema = z.object({
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(), 
});
type Input = z.infer<typeof schema>;

export default function DoctorsProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => fetchDoctorById(id!),
    enabled: Boolean(id),
  });

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: '',
      bio: '',
      specialties: '',
    },
  });

  React.useEffect(() => {
    if (!data) return;
    form.reset({
      phone: data.doctorProfile?.phone ?? '',
      bio: data.doctorProfile?.bio ?? '',
      specialties: (data.doctorProfile?.specialties ?? []).join(', '),
    });
  }, [data]);

  const mut = useMutation({
    mutationFn: (values: Input) =>
      updateDoctorProfile(id!, {
        phone: values.phone || null,
        bio: values.bio || null,
        specialties: toSpecialtyArray(values.specialties),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['doctor', id], updated);
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', id] });
      // si ton menu / avatar affiche des infos du médecin connecté :
      queryClient.invalidateQueries({ queryKey: ['me'] });

      navigate(`/doctors/${id}`, { replace: true });
    },
  });

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (isError) return <div className="p-6 text-[color:var(--danger)]">Erreur</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Éditer le profil</h1>

      <Form form={form} onSubmit={(v) => mut.mutate(v)} className="space-y-4">
        <TextField name="phone" label="Téléphone" placeholder="+351 ..." />
        <TextField name="specialties" label="Spécialités" placeholder="Cardiologie, Dermatologie" />
        <TextField name="bio" label="Bio" placeholder="Biographie…" multiline />

        <div className="flex gap-2">
          <Button type="submit" loading={mut.isPending} loadingText="Enregistrement…">Enregistrer</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
        </div>
      </Form>
    </div>
  );
}
