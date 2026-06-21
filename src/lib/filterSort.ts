import type { Item } from '../store/types';
import type { Filters } from '../components/FiltersBar';

const STATUS_ORDER = { want: 0, in_progress: 1, finished: 2 };
const FIT_ORDER = { good: 0, partial: 1, poor: 2, undefined: 3 };

export function filterAndSort(items: Item[], filters: Filters): Item[] {
  let result = items;

  if (filters.status !== 'all') {
    result = result.filter(i => i.status === filters.status);
  }
  if (filters.type !== 'all') {
    result = result.filter(i => i.type === filters.type);
  }
  if (filters.fit !== 'all') {
    result = result.filter(i => i.fit?.verdict === filters.fit);
  }

  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'status':
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case 'added':
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'rating':
        return (b.userRating ?? b.sourceRating ?? 0) - (a.userRating ?? a.sourceRating ?? 0);
      case 'fit':
        return (FIT_ORDER[a.fit?.verdict ?? 'undefined'] ?? 3) -
               (FIT_ORDER[b.fit?.verdict ?? 'undefined'] ?? 3);
      default:
        return 0;
    }
  });

  return result;
}
