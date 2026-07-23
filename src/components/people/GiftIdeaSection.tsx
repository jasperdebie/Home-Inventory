'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { GiftIdea } from '@/lib/people/shared';

interface Props {
  giftIdeas: GiftIdea[];
  onAdd: (text: string) => void;
  onToggle: (id: string, given: boolean) => void;
  onDelete: (id: string) => void;
}

export function GiftIdeaSection({ giftIdeas, onAdd, onToggle, onDelete }: Props) {
  const [text, setText] = useState('');
  const open = giftIdeas.filter((g) => !g.given);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cadeau-ideeën</h2>
      <Card padding={false}>
        <ul className="divide-y divide-gray-100">
          {open.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onToggle(g.id, true)}
                aria-label="Als gegeven markeren"
              />
              <span className="flex-1 min-w-0 text-gray-900">{g.text}</span>
              <button
                type="button"
                onClick={() => onDelete(g.id)}
                className="text-gray-300 hover:text-red-500"
                aria-label="Verwijderen"
              >
                🗑
              </button>
            </li>
          ))}
          {open.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">Nog geen ideeën.</li>
          )}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onAdd(text.trim());
            setText('');
          }}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100"
        >
          <Input placeholder="Nieuw idee" value={text} onChange={(e) => setText(e.target.value)} />
          <Button type="submit" disabled={!text.trim()}>
            +
          </Button>
        </form>
      </Card>
    </section>
  );
}
