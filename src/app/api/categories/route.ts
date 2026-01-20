import { NextRequest, NextResponse } from 'next/server';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

// In-memory cache for categories (works for serverless, resets on cold start)
let cachedCategories: CategoryConfig | null = null;

async function readCategories(): Promise<CategoryConfig> {
  // Return from cache if available
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
  // Update in-memory cache
  cachedCategories = config;
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
