import { redirect } from 'next/navigation';
import { getIsAppAdmin } from '@/lib/auth/app-admin';
import { NewTeamForm } from './_form';

export default async function NewTeamPage() {
  if (!(await getIsAppAdmin())) redirect('/dashboard');
  return <NewTeamForm />;
}
