import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_000000000000', {
  apiVersion: '2023-08-16',
});

export async function createPaymentSession(booking: any) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `${booking.duration}min Consultation` },
          unit_amount: booking.duration === 30 ? 5000 : 8000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking-confirmed`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book-consultation`,
    metadata: { bookingId: booking.id },
  });
  return session.url;
}
