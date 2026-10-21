import fs from 'fs';
import path from 'path';
import { calculateRecommendation, scoreProduct } from '../src/recommendation.js';
import { validateCriteria } from '../src/ui.js';

const products = JSON.parse(
  fs.readFileSync(path.resolve('./public/products.json'), 'utf-8')
);

console.log('========== 開始執行 ACCEPTANCE.md 驗收測試 ==========');

let passedCount = 0;
let totalCount = 0;

function assert(description, condition) {
  totalCount++;
  if (condition) {
    console.log(`✅ [PASS] 測試 ${totalCount}：${description}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] 測試 ${totalCount}：${description}`);
  }
}

// 測試案例一：標準正常推薦流程（現貨在庫）
{
  const criteria = {
    scenario: 'silent_dim',
    budgetTier: 'practical',
    tags: ['silent', 'compact']
  };
  const result = calculateRecommendation(products, criteria);
  assert(
    '案例一：首選商品應為 prod-001 (夾床頭無聲檯燈)，且庫存 > 0，不觸發替代方案',
    result.primary.product.id === 'prod-001' &&
      result.primary.isOutOfStock === false &&
      result.alternative === null &&
      result.primary.score === 95 // 40 (情境) + 35 (預算) + 20 (2標籤) = 95
  );
}

// 測試案例二：邊界情況——首選商品庫存為 0（缺貨自動替補）
{
  const criteria = {
    scenario: 'warm_energy',
    budgetTier: 'budget',
    tags: ['low_watt']
  };
  const result = calculateRecommendation(products, criteria);
  assert(
    '案例二：首選商品應為 prod-004 (恆溫杯墊且 isOutOfStock === true)',
    result.primary.product.id === 'prod-004' && result.primary.isOutOfStock === true
  );
  assert(
    '案例二：應自動遞補第二順位有庫存商品 prod-005 (300W 快煮杯，庫存 > 0)',
    result.alternative !== null &&
      result.alternative.product.id === 'prod-005' &&
      result.alternative.product.stock > 0
  );
}

// 測試案例三：防呆驗證——必填欄位空白
{
  const blankCriteria = { scenario: null, budgetTier: null, tags: [] };
  const validation = validateCriteria(blankCriteria);
  assert(
    '案例三：未選情境與預算時，isValid 必須為 false，且 errors 包含 scenario 與 budgetTier',
    validation.isValid === false &&
      validation.errors.includes('scenario') &&
      validation.errors.includes('budgetTier')
  );
}

// 測試案例四：偏好多選與無偏好輸入
{
  const fullTagsCriteria = {
    scenario: 'refresh_mind',
    budgetTier: 'premium',
    tags: ['low_watt', 'silent', 'compact']
  };
  const res1 = calculateRecommendation(products, fullTagsCriteria);
  assert(
    '案例四（全選標籤）：prod-007 獲得最高推薦分數',
    res1.primary.product.id === 'prod-007' && res1.primary.score >= 95
  );

  const noTagsCriteria = {
    scenario: 'refresh_mind',
    budgetTier: 'premium',
    tags: []
  };
  const res2 = calculateRecommendation(products, noTagsCriteria);
  assert(
    '案例四（無標籤）：依然正常排序，不報錯且推薦 prod-007',
    res2.primary.product.id === 'prod-007' && res2.hasMatch === true
  );
}

// 測試案例五：邊界情況——吃土級預算要求提神小家電
{
  const lowBudgetCaughtCriteria = {
    scenario: 'refresh_mind',
    budgetTier: 'budget',
    tags: []
  };
  const result = calculateRecommendation(products, lowBudgetCaughtCriteria);
  assert(
    '案例五：低預算提神需求精準命中 NT$ 250 之 prod-008 (靜音夾式小風扇)',
    result.primary.product.id === 'prod-008' &&
      result.primary.product.price <= 300 &&
      result.primary.isOutOfStock === false
  );
}

console.log(`\n測試總結：${passedCount} / ${totalCount} 測試通過！`);
if (passedCount === totalCount) {
  console.log('🎉 所有 ACCEPTANCE.md 測試案例全數通過！');
} else {
  process.exit(1);
}
