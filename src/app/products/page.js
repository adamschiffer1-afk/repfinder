// src/app/tutorials/page.js
import Products from '@/components/Products';
import PopupModal from '@/components/PopupModal';

export const metadata = {
  title: 'Products | RepFinder',
  description: 'Explore our curated list of premium replica products. The best finds from Weidian, Taobao, and 1688 all in one place.',
};

export default function Home() {
  return (
    <>
      <Products />
      <PopupModal />
  
    </>
  );
}