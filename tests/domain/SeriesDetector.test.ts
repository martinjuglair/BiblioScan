import { describe, it, expect } from "vitest";
import { SeriesDetector } from "@domain/services/SeriesDetector";

describe("SeriesDetector", () => {
  it('should detect "Série - Tome N" pattern', () => {
    const result = SeriesDetector.detect("Astérix - Tome 5");
    expect(result.seriesName).toBe("Astérix");
    expect(result.volumeNumber).toBe(5);
  });

  it('should detect "Série, Tome N" pattern', () => {
    const result = SeriesDetector.detect("Tintin, Tome 12");
    expect(result.seriesName).toBe("Tintin");
    expect(result.volumeNumber).toBe(12);
  });

  it('should detect "Série T.N" pattern', () => {
    const result = SeriesDetector.detect("One Piece T.98");
    expect(result.seriesName).toBe("One Piece");
    expect(result.volumeNumber).toBe(98);
  });

  it('should detect "Série TN" without dot', () => {
    const result = SeriesDetector.detect("Naruto T72");
    expect(result.seriesName).toBe("Naruto");
    expect(result.volumeNumber).toBe(72);
  });

  it('should detect "Série (N)" pattern', () => {
    const result = SeriesDetector.detect("Lucky Luke (42)");
    expect(result.seriesName).toBe("Lucky Luke");
    expect(result.volumeNumber).toBe(42);
  });

  it('should detect "Série Vol. N" pattern', () => {
    const result = SeriesDetector.detect("Dragon Ball Vol. 3");
    expect(result.seriesName).toBe("Dragon Ball");
    expect(result.volumeNumber).toBe(3);
  });

  it('should detect "Série #N" pattern', () => {
    const result = SeriesDetector.detect("Blacksad #2");
    expect(result.seriesName).toBe("Blacksad");
    expect(result.volumeNumber).toBe(2);
  });

  it("should handle em-dash separator", () => {
    const result = SeriesDetector.detect("Astérix — Tome 15");
    expect(result.seriesName).toBe("Astérix");
    expect(result.volumeNumber).toBe(15);
  });

  it('should return "Sans série" when no pattern matches', () => {
    const result = SeriesDetector.detect("L'Arabe du futur");
    expect(result.seriesName).toBe("Sans série");
    expect(result.volumeNumber).toBeNull();
  });

  it("should handle leading zeros in volume number", () => {
    const result = SeriesDetector.detect("Spirou - Tome 01");
    expect(result.seriesName).toBe("Spirou");
    expect(result.volumeNumber).toBe(1);
  });
});
