const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function buildSearchFilter(search) {
  const normalized = normalizeSearchText(search);
  if (!normalized) return null;

  const tokens = normalized.split(' ').filter(token => token.length >= 2);
  if (!tokens.length) {
    return { name: { $regex: escapeRegex(search.trim()), $options: 'i' } };
  }

  return {
    $and: tokens.map(token => ({
      name: { $regex: escapeRegex(token), $options: 'i' }
    }))
  };
}

export function buildProductFilter(searchParams) {
  const filters = [];
  const category = searchParams.get('category');
  const categories = searchParams.get('categories');
  const batch = searchParams.get('batch');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const search = searchParams.get('search')?.trim();

  if (category) {
    filters.push({ category });
  } else if (categories) {
    const list = categories.split(',').map(item => item.trim()).filter(Boolean);
    if (list.length) {
      filters.push({ category: { $in: list } });
    }
  }

  if (batch && batch !== 'random') {
    filters.push({ batch });
  }

  if (minPrice) {
    const min = parseFloat(minPrice);
    if (!Number.isNaN(min)) filters.push({ price: { $gte: min } });
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice);
    if (!Number.isNaN(max)) filters.push({ price: { $lte: max } });
  }

  const searchFilter = buildSearchFilter(search);
  if (searchFilter) filters.push(searchFilter);

  if (!filters.length) return {};
  if (filters.length === 1) return filters[0];
  return { $and: filters };
}

export function hasActiveStorefrontFilters(searchParams) {
  return Boolean(
    searchParams.get('search')?.trim()
    || searchParams.get('category')
    || searchParams.get('categories')
    || (searchParams.get('batch') && searchParams.get('batch') !== 'random')
    || searchParams.get('minPrice')
    || searchParams.get('maxPrice')
  );
}

export function buildProductSort(sortParam, { pinnedFirst = false } = {}) {
  if (pinnedFirst && (!sortParam || sortParam === 'newest')) {
    return { isPinned: -1, pinnedOrder: 1, createdAt: -1 };
  }

  switch (sortParam) {
    case 'price_asc':
      return { price: 1, createdAt: -1 };
    case 'price_desc':
      return { price: -1, createdAt: -1 };
    case 'name_asc':
      return { name: 1, createdAt: -1 };
    case 'name_desc':
      return { name: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}
