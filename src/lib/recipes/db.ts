import { sql } from '@/lib/db';

export async function loadRecipes(recipeId?: string) {
  const recipes = recipeId
    ? await sql`
        SELECT *
        FROM recipes
        WHERE id = ${recipeId}
      `
    : await sql`
        SELECT *
        FROM recipes
        ORDER BY created_at DESC
      `;

  if (recipes.length === 0) return [];

  const ids = recipes.map((r) => r.id as string);

  const [ingredients, equipment, components] = await Promise.all([
    sql`
      SELECT
        ri.id,
        ri.recipe_id,
        ri.cookbook_product_id,
        ri.name,
        ri.quantity::float8 AS quantity,
        ri.unit,
        ri.sort_order,
        ri.created_at,
        CASE WHEN cp.id IS NULL THEN NULL ELSE json_build_object(
          'id', cp.id,
          'name', cp.name,
          'name_normalized', cp.name_normalized,
          'created_at', cp.created_at
        ) END AS cookbook_product
      FROM recipe_ingredients ri
      LEFT JOIN cookbook_products cp ON cp.id = ri.cookbook_product_id
      WHERE ri.recipe_id = ANY(${ids}::uuid[])
      ORDER BY ri.recipe_id, ri.sort_order ASC, ri.created_at ASC
    `,
    sql`
      SELECT
        re.id,
        re.recipe_id,
        re.cookbook_equipment_id,
        re.name,
        re.quantity::float8 AS quantity,
        re.sort_order,
        re.created_at,
        CASE WHEN ce.id IS NULL THEN NULL ELSE json_build_object(
          'id', ce.id,
          'name', ce.name,
          'name_normalized', ce.name_normalized,
          'created_at', ce.created_at
        ) END AS cookbook_equipment
      FROM recipe_equipment re
      LEFT JOIN cookbook_equipment ce ON ce.id = re.cookbook_equipment_id
      WHERE re.recipe_id = ANY(${ids}::uuid[])
      ORDER BY re.recipe_id, re.sort_order ASC, re.created_at ASC
    `,
    sql`
      SELECT
        rc.id,
        rc.recipe_id,
        rc.child_recipe_id,
        rc.label,
        rc.sort_order,
        rc.created_at,
        json_build_object(
          'id', child.id,
          'title', child.title,
          'category', child.category,
          'servings', child.servings,
          'prep_time', child.prep_time,
          'image_url', child.image_url
        ) AS child_recipe
      FROM recipe_components rc
      JOIN recipes child ON child.id = rc.child_recipe_id
      WHERE rc.recipe_id = ANY(${ids}::uuid[])
      ORDER BY rc.recipe_id, rc.sort_order ASC, rc.created_at ASC
    `,
  ]);

  const ingredientsByRecipe = new Map<string, Array<(typeof ingredients)[number]>>();
  for (const row of ingredients) {
    const key = row.recipe_id as string;
    const list = ingredientsByRecipe.get(key) ?? [];
    list.push(row);
    ingredientsByRecipe.set(key, list);
  }

  const equipmentByRecipe = new Map<string, Array<(typeof equipment)[number]>>();
  for (const row of equipment) {
    const key = row.recipe_id as string;
    const list = equipmentByRecipe.get(key) ?? [];
    list.push(row);
    equipmentByRecipe.set(key, list);
  }

  const componentsByRecipe = new Map<string, Array<(typeof components)[number]>>();
  for (const row of components) {
    const key = row.recipe_id as string;
    const list = componentsByRecipe.get(key) ?? [];
    list.push(row);
    componentsByRecipe.set(key, list);
  }

  return recipes.map((recipe) => ({
    ...recipe,
    recipe_ingredients: ingredientsByRecipe.get(recipe.id as string) ?? [],
    recipe_equipment: equipmentByRecipe.get(recipe.id as string) ?? [],
    recipe_components: componentsByRecipe.get(recipe.id as string) ?? [],
  }));
}
