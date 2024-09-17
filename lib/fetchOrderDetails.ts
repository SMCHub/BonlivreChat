export async function fetchOrderDetails(orderNumber: string, postcode: string) {
  const wpUrl = `https://bonlivre.ch/wp-json/wc/v3/orders?number=${orderNumber}`;

  try {
    const response = await fetch(wpUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WP_CONSUMER_KEY}:${process.env.WP_CONSUMER_SECRET}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch order details from WordPress');
    }

    const orders = await response.json();

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Überprüfen Sie, ob die Postleitzahl übereinstimmt
    if (order.billing?.postcode?.trim().toLowerCase() !== postcode.trim().toLowerCase()) {
      return { error: 'Bestellnummer und Postleitzahl stimmen nicht überein' };
    }

    return {
      number: order.number,
      status: order.status,
      shipped: order.status === 'completed',
      date_created: order.date_created,
      total: order.total,
      currency: order.currency,
      line_items: order.line_items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        total: item.total
      }))
    };
  } catch (error) {
    console.error('Error fetching order details:', error);
    return { error: 'Fehler beim Abrufen der Bestelldetails' };
  }
}
