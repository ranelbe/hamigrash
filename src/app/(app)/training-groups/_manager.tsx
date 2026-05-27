'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { he } from '@/lib/i18n/he';
import { toast } from '@/lib/stores/toast';
import { trainingGroupSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';
import { createTrainingGroup, updateTrainingGroup, deleteTrainingGroup } from '@/lib/actions/training-groups';

type Group = { id: string; name: string; description: string | null; playerCount: number };

export function TrainingGroupsManager({ initialGroups }: { initialGroups: Group[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">קבוצות אימון</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">
          קבוצות עם זמני אימון משותפים. שחקנים באותה קבוצה ישאפו להישאר יחד באיזון.
        </p>
      </header>

      {(showCreate || editing) && (
        <GroupForm
          initial={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => router.refresh()}
        />
      )}

      {!showCreate && !editing && (
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" />הוספת קבוצת אימון
        </Button>
      )}

      <Card>
        <CardHeader><CardTitle>קבוצות קיימות ({initialGroups.length})</CardTitle></CardHeader>
        <CardBody className="p-0">
          {initialGroups.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400 p-5">עדיין לא הוגדרו קבוצות אימון.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-700">
              {initialGroups.map(g => <Row key={g.id} group={g} onEdit={() => setEditing(g)} />)}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ group, onEdit }: { group: Group; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm(`למחוק את "${group.name}"? שחקנים יישארו אבל ללא שיוך לקבוצה זו.`)) return;
    start(async () => {
      try {
        await deleteTrainingGroup(group.id);
        toast.success('קבוצת האימון נמחקה');
        router.refresh();
      } catch (e: any) {
        toast.error(e.message ?? 'מחיקה נכשלה');
      }
    });
  }
  return (
    <li className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink-900 dark:text-ink-50 truncate">{group.name}</div>
        {group.description && <div className="text-xs text-ink-500 dark:text-ink-400 truncate">{group.description}</div>}
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400 tabular shrink-0">
        <Users className="size-3.5" />{group.playerCount}
      </span>
      <button onClick={onEdit} className="size-9 rounded-lg bg-white dark:bg-ink-700 ring-1 ring-ink-200 dark:ring-ink-600 grid place-items-center hover:bg-ink-50 dark:hover:bg-ink-600" aria-label="עריכה">
        <Pencil className="size-4" />
      </button>
      <button onClick={remove} disabled={pending} className="size-9 rounded-lg bg-white dark:bg-ink-700 ring-1 ring-ink-200 dark:ring-ink-600 grid place-items-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40" aria-label="מחיקה">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function GroupForm({ initial, onClose, onSaved }: { initial: Group | null; onClose: () => void; onSaved: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = validate(trainingGroupSchema, { name: name.trim(), description: description.trim() || undefined });
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      if (initial) {
        await updateTrainingGroup(initial.id, parsed);
        toast.success('הקבוצה עודכנה');
      } else {
        await createTrainingGroup(parsed);
        toast.success('הקבוצה נוצרה');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'שמירה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{initial ? 'עריכת קבוצת אימון' : 'הוספת קבוצת אימון'}</CardTitle></CardHeader>
      <CardBody>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label="שם הקבוצה" value={name} onChange={e => { setName(e.target.value); clear('name'); }} placeholder="לדוגמה: ראשון בערב" error={errors.name} />
          <Input label="תיאור (אופציונלי)" value={description} onChange={e => { setDescription(e.target.value); clear('description'); }} placeholder="לדוגמה: 19:00, מגרש 2" error={errors.description} />
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>{initial ? he.common.save : he.common.create}</Button>
            <Button variant="ghost" type="button" onClick={onClose}>{he.common.cancel}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
