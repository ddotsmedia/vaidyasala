import Link from 'next/link';

export default function BookingConfirmedPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="bg-green-50 p-12 rounded-lg">
        <h1 className="text-4xl font-bold text-green-600 mb-4">✓ Booking Confirmed!</h1>
        <p className="text-lg text-gray-600 mb-8">Your consultation has been successfully booked. Check your email for details.</p>
        <p className="text-gray-600 mb-8">You will receive a Zoom link before your consultation.</p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
