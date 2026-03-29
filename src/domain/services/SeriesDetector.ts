export interface SeriesInfo {
  seriesName: string;
  volumeNumber: number | null;
}

const PATTERNS: RegExp[] = [
  // "Astérix - Tome 5" / "Astérix - tome 05"
  /^(.+?)\s*[-–—]\s*[Tt]ome\s+(\d+)/,
  // "Astérix, Tome 5"
  /^(.+?)\s*,\s*[Tt]ome\s+(\d+)/,
  // "Astérix T.5" / "Astérix T5"
  /^(.+?)\s+[Tt]\.?\s*(\d+)/,
  // "Astérix (5)" / "Astérix (05)"
  /^(.+?)\s*\((\d+)\)/,
  // "Astérix Vol. 5"
  /^(.+?)\s+[Vv]ol\.?\s*(\d+)/,
  // "Astérix #5"
  /^(.+?)\s*#(\d+)/,
];

export const SeriesDetector = {
  detect(title: string): SeriesInfo {
    for (const pattern of PATTERNS) {
      const match = title.match(pattern);
      if (match?.[1] && match[2]) {
        return {
          seriesName: match[1].trim(),
          volumeNumber: parseInt(match[2], 10),
        };
      }
    }

    return {
      seriesName: "Sans série",
      volumeNumber: null,
    };
  },
};
