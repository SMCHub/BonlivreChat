import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  console.log("WordPress API route called");
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("Unauthorized request");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;
    console.log("User authenticated:", userId);

    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search');
    const category = url.searchParams.get('category');

    console.log("Search parameters:", { searchTerm, category });

    let wpUrl = 'https://bonlivre.ch/wp-json/wc/v3/products?';

    if (searchTerm) {
      wpUrl += `search=${encodeURIComponent(searchTerm)}&`;
    }
    if (category) {
      const categoryId = await getCategoryId(category);
      if (categoryId) {
        wpUrl += `category=${categoryId}&`;
      } else {
        console.log(`Category not found: ${category}`);
        return NextResponse.json({ products: [] });
      }
    }

    console.log("Fetching products from WordPress:", wpUrl);
    const wpResponse = await fetch(wpUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WP_CONSUMER_KEY}:${process.env.WP_CONSUMER_SECRET}`).toString('base64')}`
      }
    });

    if (!wpResponse.ok) {
      console.error("WordPress API response not OK:", await wpResponse.text());
      throw new Error('Failed to fetch products from WordPress');
    }

    const products = await wpResponse.json();
    console.log(`Products fetched: ${products.length}`);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred', details: (error as Error).message }, { status: 500 });
  }
}

async function getCategoryId(categoryName: string): Promise<number | null> {
  console.log(`Searching for category: ${categoryName}`);
  const categoriesUrl = 'https://bonlivre.ch/wp-json/wc/v3/products/categories?per_page=100';
  const response = await fetch(categoriesUrl, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.WP_CONSUMER_KEY}:${process.env.WP_CONSUMER_SECRET}`).toString('base64')}`
    }
  });
  if (!response.ok) {
    console.error("Failed to fetch categories:", await response.text());
    return null;
  }
  const categories = await response.json();
  console.log(`Found ${categories.length} categories`);
  
  const normalizedSearchTerm = categoryName.toLowerCase().trim();
  const category = categories.find((cat: any) => 
    cat.name.toLowerCase().includes(normalizedSearchTerm) ||
    normalizedSearchTerm.includes(cat.name.toLowerCase())
  );
  
  if (category) {
    console.log(`Found category: ${category.name} (ID: ${category.id})`);
    return category.id;
  } else {
    console.log(`Category not found: ${categoryName}`);
    return null;
  }
}
