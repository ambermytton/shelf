// Enchanted flying book — SVG path data for 100×100 viewBox.
// Shared by: BookMascot, empty states (Step 11), companion (Step 12).
// Pages arch UP from corners toward the spine, giving the hovering "V" silhouette.

export const BOOK_OUTLINE =
  'M 50,20 C 38,17 20,18 10,24 C 7,40 7,60 10,76 C 20,82 38,83 50,82 C 62,83 80,82 90,76 C 93,60 93,40 90,24 C 80,18 62,17 50,20 Z';

export const BOOK_SPINE = 'M 50,20 L 50,82';

export const BOOK_PAGE_LINES = [
  // Left page
  'M 17,38 C 28,37 38,37 45,37',
  'M 16,48 C 27,47 37,47 44,47',
  'M 17,58 C 28,57 38,57 45,57',
  // Right page
  'M 55,37 C 62,37 72,37 83,38',
  'M 56,47 C 63,47 73,47 84,48',
  'M 55,57 C 62,57 72,57 83,58',
] as const;

// Ribbon bookmark hanging from spine bottom
export const BOOK_RIBBON_L = 'M 47,82 L 44,96';
export const BOOK_RIBBON_R = 'M 53,82 L 56,96';
