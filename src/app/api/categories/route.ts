import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { CategoryConfig, DEFAULT_CATEGORIES } from '@/lib/categoryStorage';

const DATA_FILE = path.join(process.cwd(), 'data', 'categories.json');

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function readCategories(): Promise<CategoryConfig> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return default config if file doesn't exist
    return {
      categories: DEFAULT_CATEGORIES,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function writeCategories(config: CategoryConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const config = await readCategories();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading categories:', error);
    return NextResponse.json(
      { error: 'Failed to read categories' },
      { status: 500 }
    );
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
