// src/app/tutorials/page.js
import { Suspense } from 'react';
import Qc from '@/components/Qc';

export default function Home() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>Ładowanie...</div>}>
      <Qc />
    </Suspense>
  );
}