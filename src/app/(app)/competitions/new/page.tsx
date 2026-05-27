import { redirect } from 'next/navigation';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { NewCompetitionForm } from './_form';

export default async function NewCompetitionPage() {
  if (!(await getIsAppAdmin())) redirect('/dashboard');
  return <NewCompetitionForm />;
}
