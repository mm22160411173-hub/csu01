import { calculateRecommendation } from './recommendation.js';
import {
  getFormCriteria,
  validateCriteria,
  setFormErrors,
  displayResults,
  resetApp
} from './ui.js';

let productsData = [];

/**
 * 載入商品庫 JSON
 */
async function loadProducts() {
  try {
    const res = await fetch('/products.json');
    if (!res.ok) {
      throw new Error(`HTTP 錯誤: ${res.status}`);
    }
    productsData = await res.json();
    console.log(`[系統就緒] 成功載入 ${productsData.length} 款小家電商品資料庫。`);
  } catch (err) {
    console.error('載入商品資料庫失敗:', err);
    const alertBox = document.getElementById('validation-alert');
    alertBox.textContent = '❌ 無法載入商品資料庫，請重新整理頁面。';
    alertBox.classList.remove('hidden');
  }
}

/**
 * 初始化互動事件
 */
function initEvents() {
  const form = document.getElementById('recommendation-form');
  const btnReset = document.getElementById('btn-reset');

  // 表單提交處理
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const criteria = getFormCriteria(form);
    const validation = validateCriteria(criteria);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    // 驗證通過，清除錯誤提示並運算推薦
    setFormErrors([]);
    const recommendationResult = calculateRecommendation(productsData, criteria);
    displayResults(recommendationResult);
  });

  // 使用者在點擊選項時即時清除該題錯誤提示
  form.addEventListener('change', () => {
    const criteria = getFormCriteria(form);
    const validation = validateCriteria(criteria);
    // 只更新當前錯誤狀態
    setFormErrors(validation.errors);
  });

  // 點擊重新診斷
  btnReset.addEventListener('click', () => {
    resetApp(form);
  });

  // 加入清單互動回饋 (純前端模擬)
  document.addEventListener('click', (e) => {
    if (e.target.matches('.btn-add-gear') || e.target.closest('.btn-add-gear')) {
      const btn = e.target.matches('.btn-add-gear') ? e.target : e.target.closest('.btn-add-gear');
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ 已成功加入深夜清單！';
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
      }, 2000);
    }
  });
}

// 應用程式進入點
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initEvents();
});
