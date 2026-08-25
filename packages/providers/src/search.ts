import type { GarmentCategory } from '@rewear/domain';

export type SearchRegion = 'ca' | 'us';

export interface SearchRequest {
  query: string;
  maxResults?: number;
  strictSecondhand?: boolean;
  region?: SearchRegion;
}

export interface NormalizedSearchCandidate {
  id: string;
  title: string;
  source: string;
  observedAt: string;
  price?: number;
  priceText?: string;
  currency?: string;
  productUrl?: string;
  imageUrl?: string;
  secondHandCondition?: string;
  garmentCategory?: GarmentCategory;
}

export interface SearchResponse {
  provider: 'fixture' | 'serpapi';
  query: string;
  providerQuery: string;
  observedAt: string;
  candidates: NormalizedSearchCandidate[];
}

export interface SearchProvider {
  search(input: SearchRequest): Promise<SearchResponse>;
}

const FIXTURE_CANDIDATES: Omit<NormalizedSearchCandidate, 'observedAt'>[] = [
  {
    id: 'fixture-a',
    title: 'Brown leather moto jacket',
    source: 'fixture-marketplace-a',
    price: 72,
    priceText: '$72',
    currency: 'USD',
    secondHandCondition: 'used',
    garmentCategory: 'outerwear'
  },
  {
    id: 'fixture-b',
    title: 'Distressed brown bomber jacket',
    source: 'fixture-marketplace-b',
    price: 88,
    priceText: '$88',
    currency: 'USD',
    secondHandCondition: 'used',
    garmentCategory: 'outerwear'
  },
  {
    id: 'fixture-c',
    title: 'Black cropped denim jacket',
    source: 'fixture-marketplace-c',
    price: 45,
    priceText: '$45',
    currency: 'USD',
    secondHandCondition: 'used',
    garmentCategory: 'outerwear'
  }
];

export class FixtureSearchProvider implements SearchProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async search(input: SearchRequest): Promise<SearchResponse> {
    const observedAt = this.now().toISOString();
    const maxResults = Math.max(1, Math.min(input.maxResults ?? 12, 30));
    return {
      provider: 'fixture',
      query: input.query,
      providerQuery: input.query,
      observedAt,
      candidates: FIXTURE_CANDIDATES.slice(0, maxResults).map((candidate) => ({...candidate, observedAt}))
    };
  }
}

type FetchLike = typeof fetch;

type SerpShoppingResult = {
  product_id?: unknown;
  title?: unknown;
  source?: unknown;
  price?: unknown;
  extracted_price?: unknown;
  product_link?: unknown;
  thumbnail?: unknown;
  serpapi_thumbnail?: unknown;
  second_hand_condition?: unknown;
};

function text(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const next = value.trim();
  if (!next) return undefined;
  return next.slice(0, max);
}

function finitePrice(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000
    ? value
    : undefined;
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export class SerpApiSearchProvider implements SearchProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => Date = () => new Date()
  ) {}

  async search(input: SearchRequest): Promise<SearchResponse> {
    if (!this.apiKey) throw new Error('SERPAPI_KEY_MISSING');

    const query = input.query.trim();
    if (!query) throw new Error('SEARCH_QUERY_EMPTY');

    const strictSecondhand = input.strictSecondhand ?? true;
    const providerQuery = strictSecondhand ? `${query} second hand used pre-owned` : query;
    const region = input.region ?? 'ca';
    const maxResults = Math.max(1, Math.min(input.maxResults ?? 12, 30));
    const observedAt = this.now().toISOString();

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', providerQuery);
    url.searchParams.set('gl', region);
    url.searchParams.set('hl', 'en');
    url.searchParams.set('api_key', this.apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {signal: controller.signal});
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`SERPAPI_HTTP_${response.status}`);
    const body = await response.json() as {shopping_results?: unknown};
    const rows = Array.isArray(body.shopping_results) ? body.shopping_results as SerpShoppingResult[] : [];

    const candidates: NormalizedSearchCandidate[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (candidates.length >= maxResults) break;

      const productId = text(row.product_id, 180);
      const title = text(row.title);
      const source = text(row.source, 180);
      const condition = text(row.second_hand_condition, 120);

      if (!productId || !title || !source) continue;
      if (strictSecondhand && !condition) continue;

      const id = `serpapi:google_shopping:${productId}`;
      if (seen.has(id)) continue;
      seen.add(id);

      candidates.push({
        id,
        title,
        source,
        observedAt,
        price: finitePrice(row.extracted_price),
        priceText: text(row.price, 120),
        productUrl: safeHttpUrl(row.product_link),
        imageUrl: safeHttpUrl(row.serpapi_thumbnail) ?? safeHttpUrl(row.thumbnail),
        secondHandCondition: condition
      });
    }

    return {
      provider: 'serpapi',
      query,
      providerQuery,
      observedAt,
      candidates
    };
  }
}
