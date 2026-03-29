import { describe, it, expect } from "vitest";
import { ISBN } from "@domain/value-objects/ISBN";

describe("ISBN", () => {
  it("should accept a valid ISBN-13", () => {
    const result = ISBN.create("9782205250015");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("9782205250015");
    }
  });

  it("should accept ISBN-13 with dashes", () => {
    const result = ISBN.create("978-2-205-25001-5");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("9782205250015");
    }
  });

  it("should accept a valid ISBN-10", () => {
    const result = ISBN.create("2205250019");
    expect(result.ok).toBe(true);
  });

  it("should accept ISBN-10 with X check digit", () => {
    const result = ISBN.create("080442957X");
    expect(result.ok).toBe(true);
  });

  it("should reject an invalid ISBN", () => {
    const result = ISBN.create("1234567890123");
    expect(result.ok).toBe(false);
  });

  it("should reject empty string", () => {
    const result = ISBN.create("");
    expect(result.ok).toBe(false);
  });

  it("should reject non-numeric string", () => {
    const result = ISBN.create("abcdefghijklm");
    expect(result.ok).toBe(false);
  });

  it("should compare equality correctly", () => {
    const a = ISBN.create("9782205250015");
    const b = ISBN.create("978-2-205-25001-5");
    if (a.ok && b.ok) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});
