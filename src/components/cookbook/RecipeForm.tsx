'use client';

import { useEffect, useRef, useState } from 'react';
import { Recipe, RecipeCategory, CookbookProduct, CookbookEquipment } from '@/lib/supabase/types';
import { IngredientInput, EquipmentInput, ComponentInput, RecipeFormData } from '@/lib/hooks/useRecipes';
import { CATEGORIES } from './CategoryFilter';

const UNITS = ['', 'g', 'kg', 'ml', 'l', 'el', 'kl', 'tl', 'stuk', 'stuks', 'snufje', 'naar smaak', 'bos', 'teen', 'plak', 'potje', 'blik', 'handvol'];

// ─── Ingredient row with product autocomplete ─────────────────────────

interface IngredientRowProps {
  value: IngredientInput;
  onChange: (value: IngredientInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function IngredientRow({ value, onChange, onRemove, canRemove }: IngredientRowProps) {
  const [suggestions, setSuggestions] = useState<CookbookProduct[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNameChange = (name: string) => {
    onChange({ ...value, name, cookbook_product_id: null });

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!name.trim()) { setSuggestions([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cookbook-products?q=${encodeURIComponent(name)}`);
        if (!res.ok) return;
        const data: CookbookProduct[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* ignore */ }
    }, 200);
  };

  const handleSelect = (product: CookbookProduct) => {
    onChange({ ...value, name: product.name, cookbook_product_id: product.id });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="flex gap-2 items-start">
      {/* Product name with autocomplete */}
      <div ref={wrapperRef} className="relative flex-1 min-w-0">
        <input
          type="text"
          value={value.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ingrediënt"
          className="w-full px-3 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white placeholder:text-[var(--cb-muted)] outline-none focus:border-[var(--cb-accent)]"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--cb-line)] shadow-md overflow-hidden max-h-40 overflow-y-auto">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className="w-full px-3 py-2 text-sm text-left text-[var(--cb-ink)] hover:bg-[var(--cb-accent-soft)]"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <input
        type="number"
        min="0"
        step="any"
        value={value.quantity ?? ''}
        onChange={(e) => onChange({ ...value, quantity: e.target.value ? Number(e.target.value) : null })}
        placeholder="Hoev."
        className="w-20 px-2 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white outline-none focus:border-[var(--cb-accent)] shrink-0"
      />

      {/* Unit */}
      <select
        value={value.unit ?? ''}
        onChange={(e) => onChange({ ...value, unit: e.target.value || null })}
        className="w-24 px-2 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white outline-none focus:border-[var(--cb-accent)] shrink-0"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>{u || '—'}</option>
        ))}
      </select>

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-9 flex items-center justify-center text-[var(--cb-muted)] hover:text-red-500 shrink-0"
          aria-label="Verwijder ingrediënt"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Equipment row with autocomplete ──────────────────────────────────

interface EquipmentRowProps {
  value: EquipmentInput;
  onChange: (value: EquipmentInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function EquipmentRow({ value, onChange, onRemove, canRemove }: EquipmentRowProps) {
  const [suggestions, setSuggestions] = useState<CookbookEquipment[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNameChange = (name: string) => {
    onChange({ ...value, name, cookbook_equipment_id: null });

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!name.trim()) { setSuggestions([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cookbook-equipment?q=${encodeURIComponent(name)}`);
        if (!res.ok) return;
        const data: CookbookEquipment[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* ignore */ }
    }, 200);
  };

  const handleSelect = (item: CookbookEquipment) => {
    onChange({ ...value, name: item.name, cookbook_equipment_id: item.id });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="flex gap-2 items-start">
      {/* Equipment name with autocomplete */}
      <div ref={wrapperRef} className="relative flex-1 min-w-0">
        <input
          type="text"
          value={value.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="bv. mixer, spuitzak"
          className="w-full px-3 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white placeholder:text-[var(--cb-muted)] outline-none focus:border-[var(--cb-accent)]"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--cb-line)] shadow-md overflow-hidden max-h-40 overflow-y-auto">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className="w-full px-3 py-2 text-sm text-left text-[var(--cb-ink)] hover:bg-[var(--cb-accent-soft)]"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <input
        type="number"
        min="0"
        step="any"
        value={value.quantity ?? ''}
        onChange={(e) => onChange({ ...value, quantity: e.target.value ? Number(e.target.value) : null })}
        placeholder="Aantal"
        className="w-20 px-2 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white outline-none focus:border-[var(--cb-accent)] shrink-0"
      />

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-9 flex items-center justify-center text-[var(--cb-muted)] hover:text-red-500 shrink-0"
          aria-label="Verwijder benodigdheid"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Sub-recipe row (verwijzing naar bestaand recept) ─────────────────

const CATEGORY_EMOJI_MINI: Record<RecipeCategory, string> = {
  hapje:        '🥨',
  voorgerecht:  '🥗',
  hoofdgerecht: '🍽️',
  dessert:      '🍰',
};

interface SubRecipeRowProps {
  value: ComponentInput;
  options: Recipe[];
  onChange: (value: ComponentInput) => void;
  onRemove: () => void;
}

function SubRecipeRow({ value, options, onChange, onRemove }: SubRecipeRowProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selected = options.find((r) => r.id === value.child_recipe_id) ?? null;
  const filtered = search.trim()
    ? options.filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl border border-[var(--cb-line)] bg-[var(--cb-bg)]">
      <div className="flex gap-2 items-start">
        {/* Recipe picker */}
        <div ref={wrapperRef} className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-left bg-white flex items-center justify-between gap-2 outline-none focus:border-[var(--cb-accent)]"
          >
            <span className={`truncate ${selected ? 'text-[var(--cb-ink)]' : 'text-[var(--cb-muted)]'}`}>
              {selected ? `${CATEGORY_EMOJI_MINI[selected.category]} ${selected.title}` : 'Kies een recept…'}
            </span>
            <span className="text-[var(--cb-muted)] shrink-0">▾</span>
          </button>
          {open && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--cb-line)] shadow-md overflow-hidden">
              <div className="p-1.5 border-b border-[var(--cb-line)] sticky top-0 bg-white">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek recept…"
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white outline-none focus:border-[var(--cb-accent)]"
                />
              </div>
              <div className="max-h-44 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-[var(--cb-muted)]">Geen recepten</div>
                ) : (
                  filtered.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange({ ...value, child_recipe_id: r.id });
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-[var(--cb-accent-soft)]
                        ${r.id === value.child_recipe_id ? 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] font-medium' : 'text-[var(--cb-ink)]'}`}
                    >
                      {CATEGORY_EMOJI_MINI[r.category]} {r.title}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-9 flex items-center justify-center text-[var(--cb-muted)] hover:text-red-500 shrink-0"
          aria-label="Verwijder subrecept"
        >
          ×
        </button>
      </div>

      {/* Optional label */}
      <input
        type="text"
        value={value.label ?? ''}
        onChange={(e) => onChange({ ...value, label: e.target.value || null })}
        placeholder="Label (optioneel, bv. Voor de vulling)"
        className="w-full px-3 py-2 rounded-xl border border-[var(--cb-line)] text-sm text-[var(--cb-ink)] bg-white placeholder:text-[var(--cb-muted)] outline-none focus:border-[var(--cb-accent)]"
      />
    </div>
  );
}

// ─── RecipeForm ───────────────────────────────────────────────────────

interface RecipeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => Promise<void>;
  initial?: Recipe | null;
  allRecipes?: Recipe[];
}

function emptyIngredient(): IngredientInput {
  return { name: '', cookbook_product_id: null, quantity: null, unit: null };
}

function emptyEquipment(): EquipmentInput {
  return { name: '', cookbook_equipment_id: null, quantity: null };
}

function emptyComponent(): ComponentInput {
  return { child_recipe_id: '', label: null };
}

export function RecipeForm({ open, onClose, onSubmit, initial, allRecipes = [] }: RecipeFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecipeCategory | ''>('');
  const [preparation, setPreparation] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState<string>('');
  const [extraTime, setExtraTime] = useState('');
  const [extraTimeLabel, setExtraTimeLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [storage, setStorage] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMade, setIsMade] = useState(false);
  const [starRating, setStarRating] = useState<number | null>(null);
  const [healthRating, setHealthRating] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([emptyIngredient()]);
  const [equipment, setEquipment] = useState<EquipmentInput[]>([emptyEquipment()]);
  const [components, setComponents] = useState<ComponentInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when opening/closing or switching recipe
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setCategory(initial.category);
      setPreparation(initial.preparation);
      setServings(initial.servings);
      setPrepTime(initial.prep_time?.toString() ?? '');
      setExtraTime(initial.extra_time ?? '');
      setExtraTimeLabel(initial.extra_time_label ?? '');
      setImageUrl(initial.image_url ?? '');
      setTags(initial.tags);
      setTagInput('');
      setSource(initial.source ?? '');
      setNotes(initial.notes ?? '');
      setStorage(initial.storage ?? '');
      setIsFavorite(initial.is_favorite);
      setIsMade(initial.is_made);
      setStarRating(initial.star_rating ?? null);
      setHealthRating(initial.health_rating ?? null);
      const ings = (initial.recipe_ingredients ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ name: i.name, cookbook_product_id: i.cookbook_product_id, quantity: i.quantity, unit: i.unit }));
      setIngredients(ings.length ? ings : [emptyIngredient()]);
      const eqs = (initial.recipe_equipment ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((e) => ({ name: e.name, cookbook_equipment_id: e.cookbook_equipment_id, quantity: e.quantity }));
      setEquipment(eqs.length ? eqs : [emptyEquipment()]);
      const comps = (initial.recipe_components ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => ({ child_recipe_id: c.child_recipe_id, label: c.label }));
      setComponents(comps);
    } else {
      setTitle(''); setCategory(''); setPreparation('');
      setServings(4); setPrepTime(''); setExtraTime(''); setExtraTimeLabel('');
      setImageUrl('');
      setTags([]); setTagInput(''); setSource(''); setNotes(''); setStorage('');
      setIsFavorite(false);
      setIsMade(false);
      setStarRating(null);
      setHealthRating(null);
      setIngredients([emptyIngredient()]);
      setEquipment([emptyEquipment()]);
      setComponents([]);
    }
    setError('');
  }, [open, initial]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) setTags((prev) => [...prev, newTag]);
      setTagInput('');
    }
  };

  const updateIngredient = (index: number, value: IngredientInput) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? value : ing)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  };

  const updateEquipment = (index: number, value: EquipmentInput) => {
    setEquipment((prev) => prev.map((eq, i) => (i === index ? value : eq)));
  };

  const removeEquipment = (index: number) => {
    setEquipment((prev) => prev.filter((_, i) => i !== index));
  };

  const addEquipment = () => {
    setEquipment((prev) => [...prev, emptyEquipment()]);
  };

  const updateComponent = (index: number, value: ComponentInput) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const addComponent = () => {
    setComponents((prev) => [...prev, emptyComponent()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Titel is verplicht'); return; }
    if (!category) { setError('Kies een categorie'); return; }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validEquipment = equipment.filter((e) => e.name.trim());
    const validComponents = components.filter((c) => c.child_recipe_id);

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        category: category as RecipeCategory,
        preparation: preparation.trim(),
        servings,
        prep_time: prepTime ? Number(prepTime) : null,
        extra_time: extraTime.trim() || null,
        extra_time_label: extraTimeLabel.trim() || null,
        image_url: imageUrl.trim() || null,
        tags,
        source: source.trim() || null,
        notes: notes.trim() || null,
        storage: storage.trim() || null,
        is_favorite: isFavorite,
        is_made: isMade,
        star_rating: starRating,
        health_rating: healthRating,
        ingredients: validIngredients,
        equipment: validEquipment,
        components: validComponents,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl animate-sheet-up max-h-[92dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--cb-line)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--cb-line)] shrink-0">
          <h2 className="text-lg font-bold text-[var(--cb-ink)]">
            {initial ? 'Gerecht bewerken' : 'Nieuw gerecht'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--cb-muted)] hover:bg-[var(--cb-bg)] text-xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Naam gerecht *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="bv. Spaghetti bolognese"
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-2">Categorie *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${category === cat.value
                      ? 'bg-[var(--cb-accent)] text-white'
                      : 'bg-[var(--cb-accent-soft)] text-[var(--cb-accent)]'
                    }`}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-2">Ingrediënten</label>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <IngredientRow
                  key={i}
                  value={ing}
                  onChange={(v) => updateIngredient(i, v)}
                  onRemove={() => removeIngredient(i)}
                  canRemove={ingredients.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="mt-2 text-sm text-[var(--cb-accent)] font-medium flex items-center gap-1 hover:opacity-75"
            >
              + Ingrediënt toevoegen
            </button>
          </div>

          {/* Equipment / benodigdheden */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-2">Benodigdheden</label>
            <div className="space-y-2">
              {equipment.map((eq, i) => (
                <EquipmentRow
                  key={i}
                  value={eq}
                  onChange={(v) => updateEquipment(i, v)}
                  onRemove={() => removeEquipment(i)}
                  canRemove={equipment.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addEquipment}
              className="mt-2 text-sm text-[var(--cb-accent)] font-medium flex items-center gap-1 hover:opacity-75"
            >
              + Benodigdheid toevoegen
            </button>
          </div>

          {/* Sub-recipes / subrecepten */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1">Subrecepten</label>
            <p className="text-xs text-[var(--cb-muted)] mb-2">
              Verwijs naar een ander recept, bv. soezen of banketbakkersroom.
            </p>
            {components.length > 0 && (
              <div className="space-y-2">
                {components.map((comp, i) => (
                  <SubRecipeRow
                    key={i}
                    value={comp}
                    options={allRecipes.filter((r) => r.id !== initial?.id)}
                    onChange={(v) => updateComponent(i, v)}
                    onRemove={() => removeComponent(i)}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={addComponent}
              className="mt-2 text-sm text-[var(--cb-accent)] font-medium flex items-center gap-1 hover:opacity-75"
            >
              + Subrecept toevoegen
            </button>
          </div>

          {/* Preparation */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Bereiding</label>
            <textarea
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              placeholder={'Elke stap op een nieuwe regel.\nbv.\nVerwarm de oven op 200°C.\nSnij de ui fijn.'}
              rows={5}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)] resize-none"
            />
            <p className="text-xs text-[var(--cb-muted)] mt-1">Elke nieuwe regel wordt een aparte stap.</p>
          </div>

          {/* Servings + prep time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Porties</label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
                className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Bereidingstijd (min)</label>
              <input
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="optioneel"
                className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
              />
            </div>
          </div>

          {/* Extra time */}
          <div className="flex gap-3">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Extra tijd</label>
              <input
                type="text"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
                placeholder="bv. 4 uur"
                className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Waarvoor</label>
              <input
                type="text"
                value={extraTimeLabel}
                onChange={(e) => setExtraTimeLabel(e.target.value)}
                placeholder="bv. opstijven, marineren"
                className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Tags</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="bv. vegetarisch, snel (enter of komma)"
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-[var(--cb-accent-soft)] text-[var(--cb-accent)] rounded-full">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="opacity-60 hover:opacity-100 text-base leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Foto (URL)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Bron</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="bv. naam kookboek of website URL"
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Notities</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'Persoonlijke opmerkingen…\n\nTip: begin een regel met "- " voor een bullet of "1. " voor een genummerde lijst. Lege regels maken aparte alinea\u2019s.'}
              rows={5}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)] resize-y"
            />
          </div>

          {/* Storage / bewaaradvies */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-1.5">Bewaren</label>
            <textarea
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
              placeholder={'Hoe bewaar je dit gerecht?\n\nbv. “Tot 3 dagen afgedekt in de koelkast” of “Invriezen kan tot 2 maanden”.'}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-[var(--cb-line)] text-[var(--cb-ink)] text-sm bg-white outline-none focus:border-[var(--cb-accent)] resize-y"
            />
          </div>

          {/* Favorite toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsFavorite((v) => !v)}
              className={`w-12 h-7 rounded-full transition-colors flex items-center px-1
                ${isFavorite ? 'bg-[var(--cb-accent)]' : 'bg-[var(--cb-line)]'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isFavorite ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-[var(--cb-ink)]">Favoriet ♥</span>
          </label>

          {/* Made toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsMade((v) => !v)}
              className={`w-12 h-7 rounded-full transition-colors flex items-center px-1
                ${isMade ? 'bg-[var(--cb-accent)]' : 'bg-[var(--cb-line)]'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isMade ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-[var(--cb-ink)]">Al gemaakt 🍳</span>
          </label>

          {/* Star rating (1-5) */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-2">Sterren</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarRating((prev) => (prev === star ? null : star))}
                  className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} ${star === 1 ? 'ster' : 'sterren'}`}
                >
                  <span className={starRating !== null && star <= starRating ? 'text-amber-400' : 'text-gray-300'}>
                    ★
                  </span>
                </button>
              ))}
              {starRating !== null && (
                <button
                  type="button"
                  onClick={() => setStarRating(null)}
                  className="ml-2 text-xs text-[var(--cb-muted)] hover:text-[var(--cb-ink)] underline"
                >
                  Wissen
                </button>
              )}
            </div>
          </div>

          {/* Health rating (1-5 broccoli) */}
          <div>
            <label className="block text-sm font-medium text-[var(--cb-ink)] mb-2">Gezond</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setHealthRating((prev) => (prev === level ? null : level))}
                  className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${level} van 5 gezond`}
                >
                  <span className={healthRating !== null && level <= healthRating ? '' : 'opacity-25 grayscale'}>
                    🥦
                  </span>
                </button>
              ))}
              {healthRating !== null && (
                <button
                  type="button"
                  onClick={() => setHealthRating(null)}
                  className="ml-2 text-xs text-[var(--cb-muted)] hover:text-[var(--cb-ink)] underline"
                >
                  Wissen
                </button>
              )}
            </div>
          </div>

          {/* Spacer for submit button */}
          <div className="h-2" />
        </form>

        {/* Submit */}
        <div className="px-5 py-4 border-t border-[var(--cb-line)] shrink-0">
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-[var(--cb-accent)] text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 transition-opacity"
          >
            {saving ? 'Opslaan…' : initial ? 'Wijzigingen opslaan' : 'Gerecht toevoegen'}
          </button>
        </div>
      </div>
    </>
  );
}
