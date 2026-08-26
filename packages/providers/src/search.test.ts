import { describe, expect, it } from 'vitest';
import { FixtureSearchProvider, SerpApiSearchProvider } from './search';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'}
  });
}

describe('FixtureSearchProvider', () => {
  it('returns deterministic secondhand fixtures without credentials', async () => {
    const provider = new FixtureSearchProvider(() => new Date('2026-08-25T21:00:00Z'));
    const result = await provider.search({query: 'brown jacket', maxResults: 2});
    expect(result.provider).toBe('fixture');
    expect(result.candidates).toHaveLength(2);
    expect(result.receivedAt).toBe('2026-08-25T21:00:00.000Z');
    expect(result.candidates.every((item) => item.secondHandCondition === 'used')).toBe(true);
    expect(result.candidates.every((item) => item.observedAt === '2026-08-25T21:00:00.000Z')).toBe(true);
  });
});

describe('SerpApiSearchProvider', () => {
  it('keeps only explicitly secondhand results and preserves provider observation time', async () => {
    const seenUrls: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      seenUrls.push(String(input));
      return jsonResponse({
        search_metadata: {created_at: '2026-08-25 20:35:00 UTC'},
        shopping_results: [
          {
            product_id: 'used-1',
            title: 'Used brown leather jacket',
            source: 'Example Resale',
            price: '$79.00',
            extracted_price: 79,
            second_hand_condition: 'used',
            product_link: 'https://www.google.com/shopping/product/used-1',
            serpapi_thumbnail: 'https://serpapi.com/images/example.webp'
          },
          {
            product_id: 'new-1',
            title: 'New brown leather jacket',
            source: 'Example Retail',
            price: '$89.00',
            extracted_price: 89,
            product_link: 'https://www.google.com/shopping/product/new-1'
          }
        ]
      });
    };

    const provider = new SerpApiSearchProvider(
      'test-key',
      fetchImpl as typeof fetch,
      () => new Date('2026-08-25T21:05:00Z')
    );
    const result = await provider.search({query: 'brown leather jacket', strictSecondhand: true, region: 'ca'});

    expect(result.provider).toBe('serpapi');
    expect(result.observedAt).toBe('2026-08-25T20:35:00.000Z');
    expect(result.receivedAt).toBe('2026-08-25T21:05:00.000Z');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      id: 'serpapi:google_shopping:used-1',
      source: 'Example Resale',
      price: 79,
      priceText: '$79.00',
      secondHandCondition: 'used',
      observedAt: '2026-08-25T20:35:00.000Z',
      imageUrl: 'https://serpapi.com/images/example.webp'
    });
    expect(result.candidates[0].currency).toBeUndefined();
    expect(seenUrls[0]).toContain('engine=google_shopping');
    expect(seenUrls[0]).toContain('gl=ca');
    expect(decodeURIComponent(seenUrls[0])).toContain('second hand used pre-owned');
  });

  it('drops unsafe URLs instead of forwarding them to the browser', async () => {
    const fetchImpl = async () => jsonResponse({
      shopping_results: [{
        product_id: 'used-2',
        title: 'Used jacket',
        source: 'Example Resale',
        extracted_price: 60,
        second_hand_condition: 'used',
        product_link: 'javascript:alert(1)',
        thumbnail: 'data:text/html,bad'
      }]
    });

    const provider = new SerpApiSearchProvider('test-key', fetchImpl as typeof fetch);
    const result = await provider.search({query: 'jacket'});
    expect(result.candidates[0].productUrl).toBeUndefined();
    expect(result.candidates[0].imageUrl).toBeUndefined();
  });

  it('keeps HTTP shopping links but rejects HTTP garment-image evidence', async () => {
    const fetchImpl = async () => jsonResponse({
      shopping_results: [{
        product_id: 'used-3',
        title: 'Used jacket',
        source: 'Example Resale',
        extracted_price: 65,
        second_hand_condition: 'used',
        product_link: 'http://example.com/product/used-3',
        thumbnail: 'http://example.com/image.jpg'
      }]
    });

    const provider = new SerpApiSearchProvider('test-key', fetchImpl as typeof fetch);
    const result = await provider.search({query: 'jacket'});
    expect(result.candidates[0].productUrl).toBe('http://example.com/product/used-3');
    expect(result.candidates[0].imageUrl).toBeUndefined();
  });
});
