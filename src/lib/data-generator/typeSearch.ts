export interface SearchableType {
  name: string;
  description?: string;
  category: string;
}

export interface RankedType extends SearchableType {
  score: number;
  matchPosition: number;
}

interface RankOptions {
  types: SearchableType[];
  searchTerm: string;
  category?: string;
}

const computeScore = (type: SearchableType, term: string): { score: number; matchPosition: number } => {
  if (!term) {
    return { score: 0, matchPosition: Number.POSITIVE_INFINITY };
  }

  const lowerName = type.name.toLowerCase();
  const lowerDescription = type.description?.toLowerCase() ?? '';
  const lowerCategory = type.category.toLowerCase();

  let score = 0;
  let matchPosition = Number.POSITIVE_INFINITY;

  if (lowerName === term) {
    score += 120;
    matchPosition = 0;
  }

  const nameIndex = lowerName.indexOf(term);
  if (nameIndex >= 0) {
    score += 80;
    matchPosition = Math.min(matchPosition, nameIndex);
  }

  if (lowerName.startsWith(term)) {
    score += 40;
  }

  const spacedNameIndex = lowerName.indexOf(` ${term}`);
  if (spacedNameIndex >= 0) {
    score += 30;
    matchPosition = Math.min(matchPosition, spacedNameIndex + 1);
  }

  const descriptionIndex = lowerDescription.indexOf(term);
  if (descriptionIndex >= 0) {
    score += 20;
    matchPosition = Math.min(matchPosition, descriptionIndex + 1000);
  }

  if (lowerCategory.includes(term)) {
    score += 10;
  }

  if (score === 0) {
    return { score: 0, matchPosition: Number.POSITIVE_INFINITY };
  }

  const lengthPenalty = Math.min(10, Math.floor(type.name.length / 3));
  score -= lengthPenalty;

  return { score, matchPosition };
};

export const rankTypes = ({ types, searchTerm, category }: RankOptions): RankedType[] => {
  const trimmed = searchTerm.trim().toLowerCase();
  const filteredByCategory = category && category !== 'All'
    ? types.filter((type) => type.category === category)
    : types;

  if (!trimmed) {
    return filteredByCategory
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((type) => ({ ...type, score: 0, matchPosition: Number.POSITIVE_INFINITY }));
  }

  const ranked = filteredByCategory
    .map((type) => {
      const { score, matchPosition } = computeScore(type, trimmed);
      return { ...type, score, matchPosition };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.matchPosition !== b.matchPosition) {
        return a.matchPosition - b.matchPosition;
      }
      return a.name.localeCompare(b.name);
    });

  if (ranked.length === 0) {
    return filteredByCategory
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((type) => ({ ...type, score: 0, matchPosition: Number.POSITIVE_INFINITY }));
  }

  return ranked;
};

export const splitHighlight = (value: string, query: string): Array<{ text: string; highlighted: boolean }> => {
  if (!query.trim()) {
    return [{ text: value, highlighted: false }];
  }
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index === -1) {
    return [{ text: value, highlighted: false }];
  }
  return [
    { text: value.slice(0, index), highlighted: false },
    { text: value.slice(index, index + query.length), highlighted: true },
    { text: value.slice(index + query.length), highlighted: false },
  ].filter((segment) => segment.text.length > 0);
};
