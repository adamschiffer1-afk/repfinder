// src/app/tutorials/page.js
import { Suspense } from 'react';
import Qc from '@/components/Qc';

export const metadata = {
  title: 'Quality Check | RepFinder',
  description: 'Paste a product link from Weidian, Taobao, or 1688 to instantly view real quality check (QC) photos.',
};

export default function Home() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>Ładowanie...</div>}>
      <Qc />
    </Suspense>
  );
}