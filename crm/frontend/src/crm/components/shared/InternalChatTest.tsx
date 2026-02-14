import { CheckCircle2 } from 'lucide-react';

// Simple test component
export default function InternalChatTest() {
  console.log('InternalChatTest rendering!');

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f0f0f0' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckCircle2 style={{ color: '#22c55e' }} /> TEST SUCCESSFUL - Component is rendering!
      </h1>
      <p style={{ marginTop: '1rem', color: '#333', fontSize: '1.1rem' }}>
        If you see this text, React Router and Suspense are working correctly.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff', borderRadius: '8px' }}>
        <p><strong>URL:</strong> {window.location.href}</p>
        <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
