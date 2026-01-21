import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

export async function GET() {
  const result: {
    kvAvailable: boolean;
    kvError?: string;
    storedData: CategoryConfig | null;
    isUsingDefaults: boolean;
    categoryCount: number;
    lastUpdated: string | null;
    categories?: string[];
  } = {
    kvAvailable: false,
    storedData: null,
    isUsingDefaults: true,
    categoryCount: 0,
    lastUpdated: null,
  };

  try {
    // Try to read from Vercel KV
    const data = await kv.get<CategoryConfig>(CATEGORIES_KEY);
    result.kvAvailable = true;
    
    if (data) {
      result.storedData = data;
      result.isUsingDefaults = false;
      result.categoryCount = data.categories.length;
      result.lastUpdated = data.lastUpdated;
      result.categories = data.categories.map(c => c.name);
    } else {
      result.storedData = null;
      result.isUsingDefaults = true;
      result.categoryCount = DEFAULT_CATEGORIES.length;
      result.categories = DEFAULT_CATEGORIES.map(c => c.name);
    }
  } catch (error) {
    result.kvAvailable = false;
    result.kvError = error instanceof Error ? error.message : 'Unknown error';
    result.isUsingDefaults = true;
    result.categoryCount = DEFAULT_CATEGORIES.length;
    result.categories = DEFAULT_CATEGORIES.map(c => c.name);
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
