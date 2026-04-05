import { supabase } from "@infrastructure/supabase/client";
import { Category } from "@domain/entities/Category";
import { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import { Result } from "@domain/shared/Result";

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

function rowToEntity(row: CategoryRow): Category {
  return new Category({
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at),
  });
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Utilisateur non connecté");
  return data.user.id;
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  async findAllByUser(): Promise<Result<Category[]>> {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) return Result.fail(`Erreur de lecture: ${error.message}`);
      return Result.ok((data as CategoryRow[]).map(rowToEntity));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de lecture");
    }
  }

  async create(name: string): Promise<Result<Category>> {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: userId, name: name.trim() })
        .select()
        .single();

      if (error) return Result.fail(`Erreur de création: ${error.message}`);
      return Result.ok(rowToEntity(data as CategoryRow));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de création");
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const userId = await getUserId();
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) return Result.fail(`Erreur de suppression: ${error.message}`);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de suppression");
    }
  }

  async rename(id: string, newName: string): Promise<Result<void>> {
    try {
      const userId = await getUserId();
      const { error } = await supabase
        .from("categories")
        .update({ name: newName.trim() })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) return Result.fail(`Erreur de mise à jour: ${error.message}`);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de mise à jour");
    }
  }
}
