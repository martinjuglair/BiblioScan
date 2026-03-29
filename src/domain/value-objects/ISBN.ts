import { Result } from "../shared/Result";

/** ISBN-10 or ISBN-13 value object */
export class ISBN {
  private constructor(public readonly value: string) {}

  static create(raw: string): Result<ISBN> {
    const cleaned = raw.replace(/[-\s]/g, "");

    // Accept internal IDs for books without real ISBN (old/manual entries)
    if (cleaned.startsWith("NOISBN") || cleaned.startsWith("MANUAL")) {
      return Result.ok(new ISBN(cleaned));
    }

    if (ISBN.isValidISBN13(cleaned)) {
      return Result.ok(new ISBN(cleaned));
    }
    if (ISBN.isValidISBN10(cleaned)) {
      return Result.ok(new ISBN(cleaned));
    }

    return Result.fail(`ISBN invalide : "${raw}"`);
  }

  get isReal(): boolean {
    return !this.value.startsWith("NOISBN") && !this.value.startsWith("MANUAL");
  }

  private static isValidISBN13(isbn: string): boolean {
    if (isbn.length !== 13 || !/^\d{13}$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = Number(isbn[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === Number(isbn[12]);
  }

  private static isValidISBN10(isbn: string): boolean {
    if (isbn.length !== 10 || !/^\d{9}[\dXx]$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += Number(isbn[i]) * (10 - i);
    }
    const last = isbn[9]!.toUpperCase();
    sum += last === "X" ? 10 : Number(last);
    return sum % 11 === 0;
  }

  equals(other: ISBN): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
