export type Category = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  category_id: string | null;
  unit: string;
  barcode: string | null;
  min_stock: number;
  current_stock: number;
  image_url: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
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
};
