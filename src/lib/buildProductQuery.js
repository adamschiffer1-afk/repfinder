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

  const tokens = normalized.split(' ').filter(token => token.length >= 2 || /^\d+$/.test(token));
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
  const pinned = searchParams.get('pinned');

  if (category && category !== 'all') {
    filters.push({ category });
  } else if (categories) {
    const list = categories.split(',').map(item => item.trim()).filter(Boolean);
    if (list.length) {
      filters.push({ category: { $in: list } });
    }
  }

  if (batch && batch !== 'all' && batch !== 'random') {
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

  if (pinned === 'true') {
    filters.push({ isPinned: true });
  } else if (pinned === 'false') {
    filters.push({ isPinned: { $ne: true } });
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
    || searchParams.get('pinned')
  );
}

export function buildProductSort(sortParam, { pinnedFirst = false } = {}) {
  let baseSort = {};
  switch (sortParam) {
    case 'pinned_order':
      baseSort = { isPinned: -1, pinnedOrder: 1, createdAt: -1 };
      break;
    case 'price_asc':
      baseSort = { price: 1, createdAt: -1 };
      break;
    case 'price_desc':
      baseSort = { price: -1, createdAt: -1 };
      break;
    case 'name_asc':
      baseSort = { name: 1, createdAt: -1 };
      break;
    case 'name_desc':
      baseSort = { name: -1, createdAt: -1 };
      break;
    case 'clicks_desc':
      baseSort = { clicks: -1, createdAt: -1 };
      break;
    case 'oldest':
      baseSort = { createdAt: 1 };
      break;
    case 'newest':
    default:
      baseSort = { createdAt: -1 };
      break;
  }

  if (pinnedFirst) {
    return { isPinned: -1, pinnedOrder: 1, ...baseSort };
  }
  return baseSort;
}
