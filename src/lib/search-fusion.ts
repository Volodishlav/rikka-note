import { logger } from "@/utils/logger";

/**
 * Reciprocal Rank Fusion (RRF) 算法
 * 用于合并来自不同检索源（如模糊搜索与语义检索）的排名结果
 */
export interface FusionItem {
  id: string; // 唯一标识符，用于去重和排名合并
  score: number; // 原始得分（用于各源内部排序）
  data: any; // 原始对象数据
}

export interface FusionSource {
  name: string;
  items: FusionItem[];
  weight?: number; // 源权重（可选）
}

/**
 * 执行 RRF 融合
 * @param sources 不同的检索源及其结果列表
 * @param k RRF 常数，默认为 60
 * @param limit 返回结果的最大数量
 */
export function reciprocalRankFusion(
  sources: FusionSource[],
  k: number = 60,
  limit: number = 20
): any[] {
  const rrfScores = new Map<string, { data: any; rrfScore: number }>();

  logger.search.debug(`Starting RRF fusion with ${sources.length} sources`, 
    sources.map(s => `${s.name}(${s.items.length} items)`).join(', '));

  sources.forEach((source) => {
    // 确保源内部先按得分降序排列
    const sortedItems = [...source.items].sort((a, b) => b.score - a.score);
    const weight = source.weight || 1.0;

    sortedItems.forEach((item, index) => {
      const rank = index + 1;
      const scoreToAdd = weight * (1 / (k + rank));

      if (rrfScores.has(item.id)) {
        const existing = rrfScores.get(item.id)!;
        existing.rrfScore += scoreToAdd;
        // 如果是后来者（语义匹配），保留语义标识，避免被去重覆盖
        if (item.data && item.data.isSemantic === true) {
          existing.data.isSemantic = true;
        }
      } else {
        rrfScores.set(item.id, {
          // 对 data 进行浅拷贝，防止直接修改原始对象影响到其他源
          data: { ...item.data }, 
          rrfScore: scoreToAdd,
        });
      }
    });
  });

  // 按融合后的 RRF 分数降序排列
  const results = Array.from(rrfScores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((item) => {
      const data = item.data;
      if (typeof data === 'object' && data !== null) {
        data._rrfScore = item.rrfScore;
      }
      return data;
    });

  const slicedResults = results.slice(0, limit);
  logger.search.info(`RRF fusion complete. Merged ${rrfScores.size} unique items into ${slicedResults.length} top results.`);
  
  return slicedResults;
}

/**
 * 针对 Rikka-Note 特化的 RRF 实现
 */
export function fuseSearchResults(
    fuzzyResults: any[],
    vectorResults: any[],
    limit: number = 20
): any[] {
    const sources: FusionSource[] = [
        {
            name: 'fuzzy',
            items: fuzzyResults.map((r) => ({
                id: r.item?.id || r.item?.path || r.filename, // 优先使用标准化 ID 或路径
                score: r.score,
                data: { ...r, _source: 'fuzzy' }
            }))
        },
        {
            name: 'vector',
            items: vectorResults.map((r) => ({
                id: r.path || r.filename, // 语义结果现在带有 path 字段变量
                score: r.score,
                data: { ...r, _source: 'vector' }
            }))
        }
    ];

    return reciprocalRankFusion(sources, 60, limit);
}
