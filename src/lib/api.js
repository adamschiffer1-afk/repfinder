// src/lib/api.js
import { cache } from 'react';

export const fetchCarouselItems = cache(async () => {
  try {
    const response = await fetch('/api/products?batch=best&random=true&limit=6', {
      cache: 'force-cache',
    });
    const data = await response.json();
    return data.success && data.products ? data.products : [];
  } catch (error) {
    console.error('Error fetching carousel:', error);
    return [];
  }
});