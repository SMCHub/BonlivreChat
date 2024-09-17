import { NextResponse } from 'next/server';

async function fetchWordPressAPI(endpoint: string) {
  const wordpressUrl = process.env.WORDPRESS_URL;
  if (!wordpressUrl) {
    throw new Error('WORDPRESS_URL is not set in the environment variables');
  }

  const response = await fetch(`${wordpressUrl}/wp-json/wc/v3/${endpoint}`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.WP_CONSUMER_KEY}:${process.env.WP_CONSUMER_SECRET}`).toString('base64')}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch from WordPress API: ${response.status} ${response.statusText}. Body: ${errorBody}`);
  }

  return response.json();
}

function normalizePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, '').toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('orderNumber');
  const postcode = searchParams.get('postcode');

  console.log(`Received request for order: ${orderNumber}, postcode: ${postcode}`);

  if (!orderNumber || !postcode) {
    console.log('Missing orderNumber or postcode');
    return NextResponse.json({ error: 'Bestellnummer und Postleitzahl sind erforderlich' }, { status: 400 });
  }

  try {
    console.log(`Fetching orders from WordPress API for order number: ${orderNumber}`);
    const orders = await fetchWordPressAPI(`orders?number=${orderNumber}`);
    console.log(`Received ${orders.length} orders from WordPress API`);

    if (orders.length === 0) {
      console.log('No orders found');
      return NextResponse.json({ error: 'Keine Bestellung gefunden' }, { status: 404 });
    }

    console.log('Orders received:', JSON.stringify(orders, null, 2));

    // Suche nach der Bestellung mit der übereinstimmenden Postleitzahl
    const matchingOrder = orders.find((order: any) => 
      normalizePostcode(order.billing?.postcode || '') === normalizePostcode(postcode)
    );

    console.log('Matching order:', matchingOrder ? JSON.stringify(matchingOrder, null, 2) : 'No matching order found');

    if (!matchingOrder) {
      return NextResponse.json({ 
        error: 'Bestellnummer und Postleitzahl stimmen nicht überein',
        orderPostcode: orders[0].billing?.postcode,
        requestPostcode: postcode
      }, { status: 404 });
    }

    console.log('Matching Order:', JSON.stringify(matchingOrder, null, 2));
    console.log('Postcode from order:', matchingOrder.billing?.postcode);
    console.log('Postcode from request:', postcode);

    const orderDetails = {
      number: matchingOrder.number,
      status: matchingOrder.status,
      shipped: matchingOrder.status === 'completed',
      date_created: matchingOrder.date_created,
      total: matchingOrder.total,
      currency: matchingOrder.currency,
      line_items: matchingOrder.line_items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        total: item.total
      }))
    };

    return NextResponse.json(orderDetails);
  } catch (error) {
    console.error('Fehler beim Abrufen der Bestelldetails:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Fehler beim Abrufen der Bestelldetails: ${error.message}` }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Ein unbekannter Fehler ist aufgetreten' }, { status: 500 });
    }
  }
}
