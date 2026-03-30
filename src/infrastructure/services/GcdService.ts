import { Result } from "@domain/shared/Result";

const GCD_API = "https://www.comics.org/api";

/**
 * Local index of popular French BD periodical series mapped to GCD series IDs.
 * The GCD API doesn't support search — this index allows fuzzy matching by name.
 * Extend this list as needed.
 */
const SERIES_INDEX: GcdSeriesEntry[] = [
  { id: 40922, name: "Le Journal de Mickey", aliases: ["journal de mickey", "mickey"], yearBegan: 1952 },
  { id: 14584, name: "Le Journal de Spirou", aliases: ["journal de spirou", "spirou magazine"], yearBegan: 1938 },
  { id: 78755, name: "Pif Gadget", aliases: ["pif gadget", "pif"], yearBegan: 1969 },
  { id: 64714, name: "Picsou Magazine", aliases: ["picsou magazine", "picsou"], yearBegan: 1972 },
  { id: 25515, name: "Super Picsou Géant", aliases: ["super picsou géant", "super picsou geant", "super picsou"], yearBegan: 1982 },
];

interface GcdSeriesEntry {
  id: number;
  name: string;
  aliases: string[];
  yearBegan: number;
}

export interface GcdSearchResult {
  seriesName: string;
  issueNumber: string;
  title: string;
  publicationDate: string;
  coverUrl: string | null;
  price: string;
  publisher: string;
  gcdIssueUrl: string;
}

interface GcdSeriesResponse {
  name: string;
  active_issues: string[];
  issue_descriptors: string[];
  publisher: string;
}

interface GcdIssueResponse {
  number: string;
  publication_date: string;
  price: string;
  cover: string | null;
  series_name: string;
  indicia_publisher: string;
  api_url: string;
}

export class GcdService {
  /**
   * Search for a periodical issue by parsing the query into series name + issue number.
   * Returns matching issues from the GCD.
   */
  async searchByTitle(rawQuery: string): Promise<Result<GcdSearchResult[]>> {
    const normalized = rawQuery.toLowerCase().trim();

    // Try to extract an issue number from the query
    const { seriesQuery, issueNumber } = this.parseQuery(normalized);

    // Find matching series in our local index
    const matchedSeries = this.findMatchingSeries(seriesQuery);
    if (matchedSeries.length === 0) {
      return Result.ok([]);
    }

    const results: GcdSearchResult[] = [];

    for (const series of matchedSeries) {
      try {
        if (issueNumber) {
          // Fetch a specific issue
          const issue = await this.fetchIssueByNumber(series.id, issueNumber);
          if (issue) results.push(issue);
        } else {
          // No issue number specified — return the first few issues as preview
          const issues = await this.fetchFirstIssues(series.id, 5);
          results.push(...issues);
        }
      } catch {
        // Skip series on error, continue with next
      }
    }

    return Result.ok(results);
  }

  private parseQuery(query: string): { seriesQuery: string; issueNumber: string | null } {
    // Try patterns like "journal de mickey 1", "picsou 42", "spirou n°150", "pif gadget numero 3"
    const patterns = [
      /^(.+?)\s+n[°o]?\s*(\d+)\s*$/,
      /^(.+?)\s+num[ée]ro\s*(\d+)\s*$/,
      /^(.+?)\s+#(\d+)\s*$/,
      /^(.+?)\s+(\d+)\s*$/,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match?.[1] && match[2]) {
        return { seriesQuery: match[1].trim(), issueNumber: match[2] };
      }
    }

    return { seriesQuery: query, issueNumber: null };
  }

  private findMatchingSeries(query: string): GcdSeriesEntry[] {
    const q = query.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, "").trim();

    return SERIES_INDEX.filter((series) => {
      // Check if query matches the series name or any alias
      const nameMatch = series.name.toLowerCase().includes(q) || q.includes(series.name.toLowerCase());
      const aliasMatch = series.aliases.some(
        (alias) => alias.includes(q) || q.includes(alias),
      );
      return nameMatch || aliasMatch;
    });
  }

  private async fetchIssueByNumber(
    seriesId: number,
    issueNumber: string,
  ): Promise<GcdSearchResult | null> {
    // First, get the series to find the issue URL by descriptor
    const seriesResp = await fetch(`${GCD_API}/series/${seriesId}/?format=json`);
    if (!seriesResp.ok) return null;

    const series: GcdSeriesResponse = await seriesResp.json();
    const idx = series.issue_descriptors.indexOf(issueNumber);
    if (idx === -1) return null;

    const issueUrl = series.active_issues[idx];
    if (!issueUrl) return null;

    return this.fetchIssueDetail(issueUrl, series.name);
  }

  private async fetchFirstIssues(
    seriesId: number,
    count: number,
  ): Promise<GcdSearchResult[]> {
    const seriesResp = await fetch(`${GCD_API}/series/${seriesId}/?format=json`);
    if (!seriesResp.ok) return [];

    const series: GcdSeriesResponse = await seriesResp.json();
    const results: GcdSearchResult[] = [];

    const urls = series.active_issues.slice(0, count);
    // Fetch issues in parallel
    const promises = urls.map((url) => this.fetchIssueDetail(url, series.name));
    const issues = await Promise.all(promises);

    for (const issue of issues) {
      if (issue) results.push(issue);
    }

    return results;
  }

  private async fetchIssueDetail(
    issueApiUrl: string,
    seriesName: string,
  ): Promise<GcdSearchResult | null> {
    try {
      // Ensure URL has format=json
      const url = issueApiUrl.includes("format=json")
        ? issueApiUrl
        : `${issueApiUrl}?format=json`;

      const resp = await fetch(url);
      if (!resp.ok) return null;

      const issue: GcdIssueResponse = await resp.json();

      return {
        seriesName,
        issueNumber: issue.number,
        title: `${seriesName} n°${issue.number}`,
        publicationDate: issue.publication_date || "",
        coverUrl: issue.cover || null,
        price: issue.price || "",
        publisher: issue.indicia_publisher || "",
        gcdIssueUrl: issue.api_url || issueApiUrl,
      };
    } catch {
      return null;
    }
  }
}
