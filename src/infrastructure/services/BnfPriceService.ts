import { Result } from "@domain/shared/Result";

const BNF_SRU_API = "https://catalogue.bnf.fr/api/SRU";

export interface BnfBookData {
  price: { amount: number; currency: string } | null;
  seriesName: string | null;
  volumeNumber: number | null;
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
}

/**
 * Fetches book data from BnF (Bibliothèque nationale de France) SRU API.
 * - Price from UNIMARC field 010 subfield $d (official retail price)
 * - Series name from field 225 subfield $a (collection title)
 * - Volume number from field 225 subfield $v
 * Free, no API key required.
 */
export class BnfService {
  async fetchBookData(isbn: string): Promise<Result<BnfBookData>> {
    try {
      const query = `bib.isbn any "${isbn}"`;
      const url = `${BNF_SRU_API}?version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&recordSchema=unimarcXchange`;

      const response = await fetch(url);
      if (!response.ok) {
        return Result.ok({ price: null, seriesName: null, volumeNumber: null, title: null, authors: [], publisher: null, publishedDate: null });
      }

      const xml = await response.text();
      return Result.ok({
        price: this.extractPrice(xml),
        seriesName: this.extractSeriesName(xml),
        volumeNumber: this.extractVolumeNumber(xml),
        title: this.extractTitle(xml),
        authors: this.extractAuthors(xml),
        publisher: this.extractPublisher(xml),
        publishedDate: this.extractPublishedDate(xml),
      });
    } catch {
      return Result.ok({ price: null, seriesName: null, volumeNumber: null, title: null, authors: [], publisher: null, publishedDate: null });
    }
  }

  private extractPrice(xml: string): BnfBookData["price"] {
    // There can be multiple 010 fields — find the one with a $d subfield
    const allFields = this.extractAllFields(xml, "010");
    for (const field of allFields) {
      const priceRaw = this.extractSubfield(field, "d");
      if (priceRaw) {
        const price = this.parsePrice(priceRaw);
        if (price) return price;
      }
    }
    return null;
  }

  private extractSeriesName(xml: string): string | null {
    // Try field 225 first (collection statement), then 461 (series link)
    const field225 = this.extractField(xml, "225");
    if (field225) {
      const name = this.extractSubfield(field225, "a");
      if (name) return name.trim();
    }

    const field461 = this.extractField(xml, "461");
    if (field461) {
      const name = this.extractSubfield(field461, "t");
      if (name) return name.trim();
    }

    return null;
  }

  private extractVolumeNumber(xml: string): number | null {
    // Try field 225 $v first, then 461 $v
    for (const tag of ["225", "461"]) {
      const field = this.extractField(xml, tag);
      if (field) {
        const vol = this.extractSubfield(field, "v");
        if (vol) {
          const num = parseInt(vol.trim(), 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
    return null;
  }

  private extractTitle(xml: string): string | null {
    const field = this.extractField(xml, "200");
    if (!field) return null;
    return this.extractSubfield(field, "a")?.trim() ?? null;
  }

  private extractAuthors(xml: string): string[] {
    const authors: string[] = [];
    for (const tag of ["700", "701", "702"]) {
      const fields = this.extractAllFields(xml, tag);
      for (const field of fields) {
        const lastName = this.extractSubfield(field, "a");
        const firstName = this.extractSubfield(field, "b");
        if (lastName) {
          authors.push(firstName ? `${firstName.trim()} ${lastName.trim()}` : lastName.trim());
        }
      }
    }
    return authors;
  }

  private extractPublisher(xml: string): string | null {
    const field = this.extractField(xml, "210");
    if (!field) return null;
    return this.extractSubfield(field, "c")?.trim() ?? null;
  }

  private extractPublishedDate(xml: string): string | null {
    const field = this.extractField(xml, "210");
    if (!field) return null;
    return this.extractSubfield(field, "d")?.trim() ?? null;
  }

  private extractField(xml: string, tag: string): string | null {
    const fields = this.extractAllFields(xml, tag);
    return fields[0] ?? null;
  }

  private extractAllFields(xml: string, tag: string): string[] {
    const regex = new RegExp(
      `<mxc:datafield tag="${tag}"[^>]*>([\\s\\S]*?)<\\/mxc:datafield>`,
      "g",
    );
    const results: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1]) results.push(match[1]);
    }
    return results;
  }

  private extractSubfield(fieldContent: string, code: string): string | null {
    const regex = new RegExp(
      `<mxc:subfield code="${code}">(.*?)<\\/mxc:subfield>`,
    );
    const match = fieldContent.match(regex);
    return match?.[1] ?? null;
  }

  private parsePrice(raw: string): BnfBookData["price"] {
    const cleaned = raw.trim();
    // Must match pattern like "7,45 EUR", "39,95 EUR", "18 EUR", "12.50 EUR"
    // Require currency code OR reasonable price range (0.5 - 500)
    const match = cleaned.match(/^([\d]+[,.]?\d*)\s*([A-Z]{3})$/);
    if (match?.[1] && match[2]) {
      const amount = parseFloat(match[1].replace(",", "."));
      if (!isNaN(amount) && amount > 0 && amount < 10000) {
        return {
          amount: Math.round(amount * 100) / 100,
          currency: match[2],
        };
      }
    }

    // Fallback: number without currency, only accept if it looks like a book price
    const fallback = cleaned.match(/^([\d]+[,.]?\d*)$/);
    if (fallback?.[1]) {
      const amount = parseFloat(fallback[1].replace(",", "."));
      if (!isNaN(amount) && amount >= 0.5 && amount <= 500) {
        return {
          amount: Math.round(amount * 100) / 100,
          currency: "EUR",
        };
      }
    }

    return null;
  }
}
