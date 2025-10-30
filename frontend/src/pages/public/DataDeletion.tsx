import React from 'react';

export default function DataDeletion() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Data Deletion Request</h1>
      
      <div className="prose prose-pink max-w-none">
        <p className="text-lg mb-4">
          In accordance with Instagram Platform Policy, we provide users the ability to request deletion of their data.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">What Data We Collect</h2>
        <ul className="list-disc pl-6 mb-6">
          <li>Instagram User ID</li>
          <li>Username (if available)</li>
          <li>Message history in our CRM</li>
          <li>Service preferences and booking information</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">How to Request Data Deletion</h2>
        <p className="mb-4">
          To request deletion of your data, please send a direct message to our Instagram account{' '}
          <a href="https://instagram.com/mlediamant" className="text-pink-600 hover:underline">
            @mlediamant
          </a>
          {' '}with the text: <strong>"Delete my data"</strong>
        </p>

        <p className="mb-4">
          Alternatively, you can email us at:{' '}
          <a href="mailto:privacy@mlediamant.com" className="text-pink-600 hover:underline">
            privacy@mlediamant.com
          </a>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Processing Time</h2>
        <p className="mb-4">
          We will process your request within 30 days and confirm deletion via Instagram Direct Message or email.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">What Happens After Deletion</h2>
        <ul className="list-disc pl-6 mb-6">
          <li>All your messages will be permanently deleted</li>
          <li>Your Instagram ID will be removed from our database</li>
          <li>Future bookings will not be linked to your previous history</li>
        </ul>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
          <p>
            Contact us via Instagram{' '}
            <a href="https://instagram.com/mlediamant" className="text-pink-600 hover:underline">
              @mlediamant
            </a>
            {' '}or email{' '}
            <a href="mailto:support@mlediamant.com" className="text-pink-600 hover:underline">
              support@mlediamant.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}