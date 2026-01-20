import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const CATEGORIES_KEY = 'qc-ticket-analyzer:categories';

async function readCategories(): Promise<CategoryConfig> {
  try {
    // Try to get from Vercel KV
    const data = await kv.get<CategoryConfig>(CATEGORIES_KEY);
    if (data) {
      return data;
    }
  } catch (error) {
    // KV not available (local development or not configured)
    console.log('Vercel KV not available, using defaults');
  }
  
  // Return default config
  return {
    categories: DEFAULT_CATEGORIES,
    lastUpdated: new Date().toISOString()
  };
}

async function writeCategories(config: CategoryConfig): Promise<void> {
  try {
    await kv.set(CATEGORIES_KEY, config);
  } catch (error) {
    console.error('Failed to write to Vercel KV:', error);
    throw error;
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
      { error: 'Failed to save categories. Make sure Vercel KV is configured.' },
      { status: 500 }
    );
  }
}
