import { describe, it, expect } from 'vitest';
import { parseFiltersFromText } from '@/lib/ai/marketplace-search';

describe('parseFiltersFromText', () => {
  it('falls back to keyword when parsing fails', () => {
    const result = parseFiltersFromText('not-json', 'iphone 15');
    expect(result.keywords).toEqual(['iphone 15']);
    expect(result.categorySlug).toBeNull();
    expect(result.minPrice).toBeNull();
    expect(result.maxPrice).toBeNull();
    expect(result.sort).toBe('newest');
  });

  it('parses valid JSON blob inside text', () => {
    const text = 'Here you go: {"keywords":["car","suv"],"categorySlug":"vehicles","minPrice":1000,"maxPrice":5000,"condition":"good","regionId":2,"sort":"price_desc"} Thanks';
    const result = parseFiltersFromText(text, 'fallback');
    expect(result.keywords).toEqual(['car', 'suv']);
    expect(result.categorySlug).toBe('vehicles');
    expect(result.minPrice).toBe(1000);
    expect(result.maxPrice).toBe(5000);
    expect(result.condition).toBe('good');
    expect(result.regionId).toBe(2);
    expect(result.sort).toBe('price_desc');
  });

  it('defaults keywords to fallback when list empty', () => {
    const text = '{"keywords":[],"categorySlug":null}';
    const result = parseFiltersFromText(text, 'camera');
    expect(result.keywords).toEqual(['camera']);
  });
});
