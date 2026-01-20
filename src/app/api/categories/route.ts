import { NextRequest, NextResponse } from 'next/server';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

// In-memory cache for categories (works for serverless, resets on cold start)
let cachedCategories: CategoryConfig | null = null;

// Try to use Vercel KV if available
async function getKV() {
  try {
    // Dynamic import to avoid build errors when KV is not configured
    const { kv } = await import('@vercel/kv');
    // Test if KV is properly configured by checking if env vars exist
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return kv;
    }
  } catch {
    // KV not available
  }
  return null;
}

async function readCategories(): Promise<CategoryConfig> {
  // Try Vercel KV first
  const kv = await getKV();
  if (kv) {
    try {
      const data = await kv.get<CategoryConfig>(CATEGORIES_KEY);
      if (data) {
        cachedCategories = data;
        return data;
      }
    } catch (error) {
      console.log('Vercel KV read error:', error);
    }
  }
  
  // Fall back to in-memory cache
  if (cachedCategories) {
    return cachedCategories;
  }
  
  // Return default config
  return {
    categories: DEFAULT_CATEGORIES,
    lastUpdated: new Date().toISOString()
  };
}

async function writeCategories(config: CategoryConfig): Promise<void> {
  // Always update in-memory cache
  cachedCategories = config;
  
  // Try to persist to Vercel KV if available
  const kv = await getKV();
  if (kv) {
    try {
      await kv.set(CATEGORIES_KEY, config);
    } catch (error) {
      console.error('Failed to write to Vercel KV:', error);
      // Don't throw - we still have in-memory cache
    }
  }
}

export async function GET() {
  try {
    const config = await readCategories();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading categories:', error);
    // Return defaults on error
    return NextResponse.json({
      categories: DEFAULT_CATEGORIES,
      lastUpdated: new Date().toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: CategoryConfig = {
      categories: body.categories,
      lastUpdated: new Date().toISOString()
    };
    await writeCategories(config);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving categories:', error);
    return NextResponse.json(
      { error: 'Failed to save categories' },
      { status: 500 }
    );
  }
}
