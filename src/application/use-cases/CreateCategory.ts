import { Category } from "@domain/entities/Category";
import { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import { Result } from "@domain/shared/Result";

export class CreateCategory {
  constructor(private readonly repository: ICategoryRepository) {}

  async execute(name: string, emoji?: string | null): Promise<Result<Category>> {
    const trimmed = name.trim();
    if (!trimmed) return Result.fail("Le nom de la catégorie ne peut pas être vide");
    return this.repository.create(trimmed, emoji);
  }
}
