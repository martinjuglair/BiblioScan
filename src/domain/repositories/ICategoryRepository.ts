import { Category } from "@domain/entities/Category";
import { Result } from "@domain/shared/Result";

export interface ICategoryRepository {
  findAllByUser(): Promise<Result<Category[]>>;
  create(name: string): Promise<Result<Category>>;
  delete(id: string): Promise<Result<void>>;
  rename(id: string, newName: string): Promise<Result<void>>;
}
