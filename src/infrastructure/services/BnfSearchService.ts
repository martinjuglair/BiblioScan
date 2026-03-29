import { Result } from "@domain/shared/Result";

const BNF_SRU_API = "https://catalogue.bnf.fr/api/SRU";

export interface BnfSearchResult {
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn: string | null;
  seriesName: string | null;
  volumeNumber: number | null;
  price: { amount: number; currency: string } | null;
}

// Words that don't help narrow BnF search results
const STOP_WORDS = new Set([
  "tome", "vol", "volume", "t", "n", "le", "la", "les", "l", "de", "du",
  "des", "un", "une", "et", "en", "au", "aux", "d", "bd", "bande", "dessinée",
]);

/**
 * Search BnF catalogue by keywords — works for old books without ISBN.
 * Splits query into AND clauses across all fields for better matching.
 */
export class BnfSearchService {
  async searchByTitle(rawQuery: string): Promise<Result<BnfSearchResult[]>> {
    try {
      const sruQuery = this.buildQuery(rawQuery);
      const url =
        `${BNF_SRU_API}?version=1.2&operation=searchRetrieve` +
        `&query=${encodeURIComponent(sruQuery)}` +
        `&recordSchema=unimarcXchange&maximumRecords=10`;

      const response = await fetch(url);
      if (!response.ok) {
        return Result.fail(`BnF API erreur HTTP ${response.status}`);
      }

      const xml = await response.text();
      const results = this.parseResults(xml);
      return Result.ok(results);
    } catch {
      return Result.fail("Impossible de contacter la BnF");
    }
  }

  /**
   * Build SRU query: each meaningful word becomes its own
   * `bib.anywhere all "word"` clause, joined with AND.
   * Numbers are kept (they're volume/tome numbers).
   * "album spirou tome 291" → bib.anywhere all "album" and bib.anywhere all "spirou" and bib.anywhere all "291"
   */
  private buildQuery(rawQuery: string): string {
    const words = rawQuery
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zà-ÿ0-9]/g, ""))
      .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

    if (words.length === 0) {
      return `bib.anywhere all "${rawQuery}"`;
    }

    return words
      .map((w) => `bib.anywhere all "${w}"`)
      .join(" and ");
  }

  private parseResults(xml: string): BnfSearchResult[] {
    const recordRegex = /<mxc:record.*?<\/mxc:record>/gs;
    const records: BnfSearchResult[] = [];

    let match: RegExpExecArray | null;
    while ((match = recordRegex.exec(xml)) !== null) {
      const rec = match[0];
      const result = this.parseRecord(rec);
      if (result) records.push(result);
    }

    return records;
  }

  private parseRecord(rec: string): BnfSearchResult | null {
    const title = this.extractFieldSubfield(rec, "200", "a");
    if (!title) return null;

    // Authors: field 700 $a (last name) + $b (first name), and 701 for co-authors
    const authors: string[] = [];
    for (const tag of ["700", "701", "702"]) {
      const authorFields = this.extractAllFields(rec, tag);
      for (const field of authorFields) {
        const lastName = this.extractSubfield(field, "a");
        const firstName = this.extractSubfield(field, "b");
        if (lastName) {
          authors.push(firstName ? `${firstName} ${lastName}` : lastName);
        }
      }
    }

    const publisher = this.extractFieldSubfield(rec, "210", "c") ?? "Inconnu";
    const publishedDate = this.extractFieldSubfield(rec, "210", "d") ?? "";
    const isbn = this.extractFieldSubfield(rec, "010", "a") ?? null;

    const seriesName = this.extractFieldSubfield(rec, "225", "a") ??
      this.extractFieldSubfield(rec, "461", "t") ?? null;

    let volumeNumber: number | null = null;
    const volStr = this.extractFieldSubfield(rec, "225", "v") ??
      this.extractFieldSubfield(rec, "461", "v");
    if (volStr) {
      const num = parseInt(volStr.trim(), 10);
      if (!isNaN(num) && num > 0) volumeNumber = num;
    }

    // Search all 010 fields for a $d with a valid price
    let price: BnfSearchResult["price"] = null;
    const all010 = this.extractAllFields(rec, "010");
    for (const field of all010) {
      const priceRaw = this.extractSubfield(field, "d");
      if (!priceRaw) continue;
      // Must have currency code (e.g. "7,45 EUR") or be a reasonable price
      const withCurrency = priceRaw.trim().match(/^([\d]+[,.]?\d*)\s*([A-Z]{3})$/);
      if (withCurrency?.[1] && withCurrency[2]) {
        const amount = parseFloat(withCurrency[1].replace(",", "."));
        if (!isNaN(amount) && amount > 0 && amount < 10000) {
          price = { amount: Math.round(amount * 100) / 100, currency: withCurrency[2] };
          break;
        }
      }
      // Fallback: number only, must look like a book price (0.50 - 500€)
      const numberOnly = priceRaw.trim().match(/^([\d]+[,.]?\d*)$/);
      if (numberOnly?.[1]) {
        const amount = parseFloat(numberOnly[1].replace(",", "."));
        if (!isNaN(amount) && amount >= 0.5 && amount <= 500) {
          price = { amount: Math.round(amount * 100) / 100, currency: "EUR" };
          break;
        }
      }
    }

    return { title, authors, publisher, publishedDate, isbn, seriesName, volumeNumber, price };
  }

  private extractFieldSubfield(xml: string, tag: string, code: string): string | null {
    const fieldRegex = new RegExp(
      `<mxc:datafield tag="${tag}"[^>]*>([\\s\\S]*?)</mxc:datafield>`,
    );
    const fieldMatch = xml.match(fieldRegex);
    if (!fieldMatch?.[1]) return null;
    return this.extractSubfield(fieldMatch[1], code);
  }

  private extractSubfield(fieldContent: string, code: string): string | null {
    const regex = new RegExp(`<mxc:subfield code="${code}">(.*?)</mxc:subfield>`);
    const match = fieldContent.match(regex);
    return match?.[1] ?? null;
  }

  private extractAllFields(xml: string, tag: string): string[] {
    const regex = new RegExp(
      `<mxc:datafield tag="${tag}"[^>]*>([\\s\\S]*?)</mxc:datafield>`,
      "g",
    );
    const results: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1]) results.push(match[1]);
    }
    return results;
  }
}
