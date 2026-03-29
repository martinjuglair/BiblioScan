import { Result } from "../shared/Result";

export class Price {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static create(amount: number, currency = "EUR"): Result<Price> {
    if (amount < 0) {
      return Result.fail("Le prix ne peut pas être négatif");
    }
    return Result.ok(new Price(Math.round(amount * 100) / 100, currency));
  }

  format(): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: this.currency,
    }).format(this.amount);
  }

  toJSON(): { amount: number; currency: string } {
    return { amount: this.amount, currency: this.currency };
  }
}
