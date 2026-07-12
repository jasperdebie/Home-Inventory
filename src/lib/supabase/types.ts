export type Category = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type ProductGroup = {
  id: string;
  name: string;
  min_stock: number;
  extra_needed: number;
  is_bought: boolean;
  is_low_prio: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  category_id: string | null;
  group_id: string | null;
  unit: string;
  barcode: string | null;
  min_stock: number;
  extra_needed: number;
  current_stock: number;
  image_url: string | null;
  notes: string | null;
  expires_at: string | null;
  is_archived: boolean;
  is_bought: boolean;
  is_low_prio: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  product_group?: ProductGroup;
};

export type StockChange = {
  id: string;
  product_id: string;
  quantity_change: number;
  change_type: 'add' | 'consume' | 'adjust' | 'initial';
  note: string | null;
  created_at: string;
};

export type ProductWithCategory = Product & {
  category: Category | null;
  product_group: ProductGroup | null;
};

export type ShoppingItem = {
  id: string;
  name: string;
  is_checked: boolean;
  created_at: string;
};

// ─── Cookbook ────────────────────────────────────────────────

export type CookbookProduct = {
  id: string;
  name: string;
  name_normalized: string;
  created_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  cookbook_product_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  sort_order: number;
  created_at: string;
  cookbook_product?: CookbookProduct | null;
};

export type CookbookEquipment = {
  id: string;
  name: string;
  name_normalized: string;
  created_at: string;
};

export type RecipeEquipment = {
  id: string;
  recipe_id: string;
  cookbook_equipment_id: string | null;
  name: string;
  quantity: number | null;
  sort_order: number;
  created_at: string;
  cookbook_equipment?: CookbookEquipment | null;
};

export type RecipeCategory = 'hapje' | 'voorgerecht' | 'hoofdgerecht' | 'tussendoortje' | 'dessert' | 'drankjes';

export type RecipeRating = 'zeer_goed' | 'goed' | 'matig' | 'minder' | 'slecht';

// Beknopte info van een gekoppeld (sub)recept
export type RecipeComponentChild = {
  id: string;
  title: string;
  category: RecipeCategory;
  servings: number;
  prep_time: number | null;
  image_url: string | null;
};

export type RecipeComponent = {
  id: string;
  recipe_id: string;
  child_recipe_id: string;
  label: string | null;
  sort_order: number;
  created_at: string;
  child_recipe?: RecipeComponentChild | null;
};

export type Recipe = {
  id: string;
  title: string;
  category: RecipeCategory;
  preparation: string;
  servings: number;
  prep_time: number | null;
  extra_time: string | null;
  extra_time_label: string | null;
  image_url: string | null;
  tags: string[];
  source: string | null;
  notes: string | null;
  storage: string | null;
  is_favorite: boolean;
  is_made: boolean;
  rating: RecipeRating | null;
  star_rating: number | null;
  health_rating: number | null;
  created_at: string;
  updated_at: string;
  recipe_ingredients?: RecipeIngredient[];
  recipe_equipment?: RecipeEquipment[];
  recipe_components?: RecipeComponent[];
};
