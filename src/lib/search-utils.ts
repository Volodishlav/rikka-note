import { FuzzySearchResult, SearchItem, MatchInfo } from './fuzzy-search';

export interface AdvancedSearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  isRegexp: boolean;
}

/**
 * 高级搜索函数，支持正则、全字匹配和大小写敏感
 */
export function advancedSearch(
  items: SearchItem[],
  query: string,
  options: AdvancedSearchOptions,
  keys: string[] = ['title', 'article', 'path']
): FuzzySearchResult[] {
  if (!query) return [];

  const results: FuzzySearchResult[] = [];
  let regex: RegExp;

  try {
    let pattern = query;
    if (!options.isRegexp) {
      // 转义正则特殊字符
      pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? 'g' : 'gi';
    regex = new RegExp(pattern, flags);
  } catch (e) {
    // 如果正则非法，返回空
    return [];
  }

  items.forEach((item, index) => {
    const itemMatches: MatchInfo[] = [];
    let hasMatch = false;

    keys.forEach((key) => {
      const value = (item as any)[key] as string;
      if (!value) return;

      const matches: [number, number][] = [];
      let match;
      
      // 重置正则状态
      regex.lastIndex = 0;
      
      while ((match = regex.exec(value)) !== null) {
        matches.push([match.index, match.index + match[0].length - 1]);
        if (!regex.global) break; // 防止死循环，理论上 flags 包含 'g'
      }

      if (matches.length > 0) {
        hasMatch = true;
        itemMatches.push({
          key,
          indices: matches,
          value
        });
      }
    });

    if (hasMatch) {
      results.push({
        item,
        refIndex: index,
        matches: itemMatches,
        score: 0 // 精确匹配分数设为 0（最高）
      });
    }
  });

  return results;
}
