/**
 * 核心推薦演算法模組 (Recommendation Engine)
 * 職責：純粹的資料處理與分數運算，不涉及任何 DOM 操作，易於單元測試。
 */

export const SCENARIO_LABELS = {
  silent_dim: '室友都睡了，需要極致靜音與微光',
  warm_energy: '寒夜苦讀，需要熱呼呼的能量補給',
  refresh_mind: '眼睛乾澀、頭腦昏沉，急需清醒回血'
};

export const BUDGET_TIER_LABELS = {
  budget: '月底吃土級 (NT$ 300 以下)',
  practical: '高 CP 值實用級 (NT$ 300～600)',
  premium: '期末犒賞投資級 (NT$ 600～1000)'
};

export const TAG_LABELS = {
  low_watt: '超低瓦數防跳電',
  silent: '極致靜音運轉',
  compact: '小巧好收納'
};

const BUDGET_TIER_ORDER = {
  budget: 1,
  practical: 2,
  premium: 3
};

/**
 * 依價格判斷商品所屬預算級距
 */
export function getPriceTier(price) {
  if (price <= 300) return 'budget';
  if (price <= 600) return 'practical';
  return 'premium';
}

/**
 * 計算單一商品的推薦分數
 * @param {Object} product - 商品物件
 * @param {Object} criteria - 使用者輸入條件 { scenario, budgetTier, tags }
 * @returns {Object} { totalScore, scenarioScore, budgetScore, tagScore, matchedTags }
 */
export function scoreProduct(product, criteria) {
  const { scenario, budgetTier, tags = [] } = criteria;

  // 1. 情境權重 (40 分)
  let scenarioScore = 0;
  if (product.scenario === scenario) {
    scenarioScore = 40;
  }

  // 2. 預算權重 (35 分)
  let budgetScore = 0;
  const productTier = getPriceTier(product.price);
  const selectedTierOrder = BUDGET_TIER_ORDER[budgetTier] || 2;
  const productTierOrder = BUDGET_TIER_ORDER[productTier] || 2;

  if (productTier === budgetTier) {
    budgetScore = 35; // 命中該級距
  } else if (productTierOrder < selectedTierOrder) {
    budgetScore = 25; // 低於預算（替使用者省錢）
  } else {
    budgetScore = 0;  // 高於預算
  }

  // 3. 偏好標籤權重 (25 分)
  let tagScore = 0;
  const matchedTags = (product.tags || []).filter((tag) => tags.includes(tag));
  if (tags.length > 0) {
    tagScore = Math.min(25, matchedTags.length * 10);
  }

  const totalScore = scenarioScore + budgetScore + tagScore;

  return {
    totalScore,
    scenarioScore,
    budgetScore,
    tagScore,
    matchedTags
  };
}

/**
 * 產生推薦理由結構文字
 */
export function generateReasonText(product, scoreDetails, criteria) {
  const points = [];

  // 情境匹配說明
  if (scoreDetails.scenarioScore > 0) {
    points.push(`精準符合「${SCENARIO_LABELS[criteria.scenario]}」之需求`);
  }

  // 預算匹配說明
  if (scoreDetails.budgetScore === 35) {
    points.push(`價格 NT$ ${product.price}，落於您選取的「${BUDGET_TIER_LABELS[criteria.budgetTier]}」預算範圍`);
  } else if (scoreDetails.budgetScore === 25) {
    points.push(`價格 NT$ ${product.price}，低於您的預算上限，超值省荷包`);
  } else {
    points.push(`價格 NT$ ${product.price}，雖略高於預算但規格與功能極為契合`);
  }

  // 標籤匹配說明
  if (scoreDetails.matchedTags.length > 0) {
    const matchedNames = scoreDetails.matchedTags.map((t) => TAG_LABELS[t] || t).join('、');
    points.push(`具備您在意的特性：${matchedNames}`);
  }

  // 附上商品專屬特色
  if (product.reasonSnippet) {
    points.push(product.reasonSnippet);
  }

  return points;
}

/**
 * 執行推薦計算
 * @param {Array} products - 所有商品清單
 * @param {Object} criteria - { scenario, budgetTier, tags }
 * @returns {Object} { primary, alternative, hasMatch }
 */
export function calculateRecommendation(products, criteria) {
  if (!products || products.length === 0) {
    return { primary: null, alternative: null, hasMatch: false };
  }

  // 為每件商品計算分數
  const scoredProducts = products.map((prod) => {
    const scoreDetails = scoreProduct(prod, criteria);
    const reasons = generateReasonText(prod, scoreDetails, criteria);
    return {
      product: prod,
      score: scoreDetails.totalScore,
      scoreDetails,
      reasons,
      isOutOfStock: prod.stock <= 0
    };
  });

  // 由高分到低分排序；同分時庫存 > 0 者優先排前
  scoredProducts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 同分時，有庫存者排在前面
    if (a.product.stock > 0 && b.product.stock <= 0) return -1;
    if (a.product.stock <= 0 && b.product.stock > 0) return 1;
    return a.product.price - b.product.price; // 價格低者優先
  });

  const bestMatch = scoredProducts[0];

  // 檢查最佳匹配是否缺貨
  if (bestMatch && bestMatch.isOutOfStock) {
    // 尋找第二順位且有庫存的商品
    const alternativeMatch = scoredProducts.find(
      (item) => item.product.id !== bestMatch.product.id && item.product.stock > 0
    ) || null;

    return {
      primary: bestMatch,
      alternative: alternativeMatch,
      hasMatch: true
    };
  }

  return {
    primary: bestMatch,
    alternative: null,
    hasMatch: Boolean(bestMatch)
  };
}
