import { describe, it, expect } from "vitest";
import { Price } from "@domain/value-objects/Price";

describe("Price", () => {
  it("should create a valid price", () => {
    const result = Price.create(12.99, "EUR");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(12.99);
      expect(result.value.currency).toBe("EUR");
    }
  });

  it("should round to 2 decimal places", () => {
    const result = Price.create(9.999);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amount).toBe(10);
    }
  });

  it("should reject negative price", () => {
    const result = Price.create(-5);
    expect(result.ok).toBe(false);
  });

  it("should default currency to EUR", () => {
    const result = Price.create(15);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.currency).toBe("EUR");
    }
  });

  it("should format price in french locale", () => {
    const result = Price.create(12.5, "EUR");
    if (result.ok) {
      const formatted = result.value.format();
      expect(formatted).toContain("12,50");
    }
  });

  it("should serialize to JSON", () => {
    const result = Price.create(9.99, "EUR");
    if (result.ok) {
      expect(result.value.toJSON()).toEqual({ amount: 9.99, currency: "EUR" });
    }
  });
});
