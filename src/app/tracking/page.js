// src/app/tutorials/page.js
import Tracking from '@/components/Tracking';

export const metadata = {
  title: 'Global Package Tracking | RepFinder',
  description: 'Track your packages globally from China. Support for 17TRACK, Cainiao, DHL, DPD, and more.',
};

export default function Home() {
  return (
    <>
      <Tracking />
  
    </>
  );
}