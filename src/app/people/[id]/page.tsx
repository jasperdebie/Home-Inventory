'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { usePerson } from '@/lib/hooks/usePerson';
import { usePeople } from '@/lib/hooks/usePeople';
import { ReminderSection } from '@/components/people/ReminderSection';
import { ReminderFormDialog } from '@/components/people/ReminderFormDialog';
import { GiftIdeaSection } from '@/components/people/GiftIdeaSection';
import { HistorySection } from '@/components/people/HistorySection';

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { groups } = usePeople();
  const {
    loading, person, groupName, reminders, giftIdeas,
    updatePerson, deletePerson,
    addReminder, updateReminder, deleteReminder,
    addGiftIdea, updateGiftIdea, deleteGiftIdea,
  } = usePerson(id);

  const [reminderDialog, setReminderDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <p className="text-gray-500">Persoon niet gevonden.</p>
        <Link href="/people" className="text-rose-600">
          ← Terug naar personen
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-rose-50/40">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/people" aria-label="Terug" className="text-gray-400 hover:text-gray-600 text-xl">
            ←
          </Link>
          <h1 className="text-2xl font-bold text-rose-900 flex-1 truncate">{person.name}</h1>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (!confirm(`${person.name} verwijderen?`)) return;
              const ok = await deletePerson();
              if (ok) {
                toast(`${person.name} verwijderd`);
                router.push('/people');
              } else {
                toast('Verwijderen mislukt', 'error');
              }
            }}
          >
            Verwijderen
          </Button>
        </header>

        <Card className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groep</label>
            <select
              value={person.group_id ?? ''}
              onChange={(e) => updatePerson({ group_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="">Geen groep</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groupName && person.group_id && (
              <p className="mt-1 text-xs text-gray-400">Huidige groep: {groupName}</p>
            )}
          </div>

          <Input
            label="Verjaardag"
            type="date"
            defaultValue={person.birthday ?? ''}
            onBlur={(e) => {
              if ((e.target.value || null) !== person.birthday) {
                updatePerson({ birthday: e.target.value || null });
              }
            }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
            <textarea
              defaultValue={person.notes ?? ''}
              onBlur={(e) => {
                if ((e.target.value.trim() || null) !== person.notes) {
                  updatePerson({ notes: e.target.value });
                }
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Allergieën, partner, voorkeuren…"
            />
          </div>
        </Card>

        <ReminderSection
          reminders={reminders}
          onToggle={(rid, done) => updateReminder(rid, { done })}
          onDelete={deleteReminder}
          onAdd={() => setReminderDialog(true)}
        />

        <GiftIdeaSection
          giftIdeas={giftIdeas}
          onAdd={addGiftIdea}
          onToggle={(gid, given) => updateGiftIdea(gid, { given })}
          onDelete={deleteGiftIdea}
        />

        <HistorySection reminders={reminders} giftIdeas={giftIdeas} />
      </div>

      <ReminderFormDialog
        open={reminderDialog}
        onClose={() => setReminderDialog(false)}
        onSubmit={addReminder}
      />
    </div>
  );
}
