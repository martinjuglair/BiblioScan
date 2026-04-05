import { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import { Result } from "@domain/shared/Result";

export class DeleteCategory {
  constructor(private readonly repository: ICategoryRepository) {}

  async execute(id: string): Promise<Result<void>> {
    return this.repository.delete(id);
  }
}
