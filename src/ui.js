/**
 * 畫面渲染與互動模組 (UI Renderer & Interaction)
 * 職責：負責 DOM 事件監聽、表單防呆高亮、卡片元件渲染與滾動回饋。
 */

/**
 * 取得使用者選取的表單值
 */
export function getFormCriteria(formElement) {
  const formData = new FormData(formElement);
  const scenario = formData.get('scenario');
  const budgetTier = formData.get('budgetTier');
  const tags = formData.getAll('tags');

  return {
    scenario,
    budgetTier,
    tags
  };
}

/**
 * 驗證表單必填項
 */
export function validateCriteria(criteria) {
  const errors = [];
  if (!criteria.scenario) {
    errors.push('scenario');
  }
  if (!criteria.budgetTier) {
    errors.push('budgetTier');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 顯示或清除欄位錯誤樣式
 */
export function setFormErrors(errors = []) {
  const scenarioGroup = document.getElementById('group-scenario');
  const budgetGroup = document.getElementById('group-budget');
  const alertBox = document.getElementById('validation-alert');

  if (errors.includes('scenario')) {
    scenarioGroup.classList.add('has-error');
  } else {
    scenarioGroup.classList.remove('has-error');
  }

  if (errors.includes('budgetTier')) {
    budgetGroup.classList.add('has-error');
  } else {
    budgetGroup.classList.remove('has-error');
  }

  if (errors.length > 0) {
    alertBox.classList.remove('hidden');
  } else {
    alertBox.classList.add('hidden');
  }
}

/**
 * 渲染單一商品卡片 HTML
 * @param {Object} item - { product, score, reasons, isOutOfStock }
 * @param {Object} options - { isAlternative: boolean }
 */
export function renderProductCard(item, options = {}) {
  const { product, score, reasons, isOutOfStock } = item;
  const isAlt = options.isAlternative || false;
  const themeColor = product.themeColor || '#6366f1';

  // 規格清單標籤
  const specItems = [];
  if (product.specs) {
    if (product.specs.power) specItems.push(`⚡ ${product.specs.power}`);
    if (product.specs.noiseLevel) specItems.push(`🤫 ${product.specs.noiseLevel}`);
    if (product.specs.capacity) specItems.push(`🥛 ${product.specs.capacity}`);
    if (product.specs.weight) specItems.push(`⚖️ ${product.specs.weight}`);
    if (product.specs.dimensions) specItems.push(`📏 ${product.specs.dimensions}`);
  }

  // 庫存標籤與按鈕
  let stockBadgeHtml = '';
  let buttonHtml = '';
  if (isOutOfStock) {
    stockBadgeHtml = `<span class="stock-tag stock-out">【已售完・補貨中】</span>`;
    buttonHtml = `
      <button type="button" class="btn btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
        🚫 補貨中・暫無法加入
      </button>
    `;
  } else {
    stockBadgeHtml = `<span class="stock-tag stock-in">現貨在庫：${product.stock} 台</span>`;
    buttonHtml = `
      <button type="button" class="btn btn-primary btn-add-gear" data-id="${product.id}">
        🛒 加入我的深夜裝備清單
      </button>
    `;
  }

  // 推薦理由列表
  const reasonsHtml = reasons
    .map((r) => `<li class="reason-item">${r}</li>`)
    .join('');

  const specsHtml = specItems
    .map((s) => `<span class="spec-pill">${s}</span>`)
    .join('');

  return `
    <article class="product-card ${isAlt ? 'alt-card' : ''}" style="--theme-accent: ${themeColor}">
      <!-- 上方光暈圖示區 -->
      <div class="card-hero-visual" style="background: radial-gradient(circle at center, ${themeColor}22 0%, rgba(15, 23, 42, 0.8) 100%);">
        <div class="hero-glow" style="background-color: ${themeColor};"></div>
        <div class="hero-icon">${product.icon || '📦'}</div>
        <span class="hero-badge" style="border-color: ${themeColor}66;">${product.iconLabel || '宿舍推薦好物'}</span>
      </div>

      <!-- 下方主體內容 -->
      <div class="card-body">
        <div class="product-meta-header">
          <h3 class="product-name">${product.name}</h3>
          <div class="match-score-badge">
            <span>✨ 契合度</span>
            <strong>${score}%</strong>
          </div>
        </div>

        <div class="product-pricing-bar">
          <span class="product-price">NT$ ${product.price}</span>
          ${stockBadgeHtml}
        </div>

        <p class="product-desc">${product.description}</p>

        <!-- 規格標籤 -->
        <div class="specs-pills">
          ${specsHtml}
        </div>

        <!-- 推薦理由 -->
        <div class="recommend-reason-box">
          <div class="reason-header">💡 為什麼推薦這款宿舍裝備？</div>
          <ul class="reason-list">
            ${reasonsHtml}
          </ul>
        </div>

        <!-- 動作按鈕 -->
        ${buttonHtml}
      </div>
    </article>
  `;
}

/**
 * 渲染完整推薦結果區塊
 */
export function displayResults(recommendationResult) {
  const resultsSection = document.getElementById('results-section');
  const primaryContainer = document.getElementById('primary-recommendation-container');
  const altContainer = document.getElementById('alternative-recommendation-container');

  const { primary, alternative, hasMatch } = recommendationResult;

  if (!hasMatch || !primary) {
    primaryContainer.innerHTML = `
      <div class="alert-box alert-error">
        抱歉，目前商品庫中查無合適項目，請嘗試調整預算或偏好！
      </div>
    `;
    altContainer.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    return;
  }

  // 1. 渲染首選商品
  primaryContainer.innerHTML = renderProductCard(primary, { isAlternative: false });

  // 2. 若首選缺貨，渲染第二順位替代推薦
  if (primary.isOutOfStock && alternative) {
    altContainer.innerHTML = `
      <div class="alternative-section">
        <div class="alt-notice-banner">
          <span>⚠️</span>
          <div>
            <strong>首選商品已被熱搜搶空！</strong>
            <div>為您無縫推薦第二順位相近現貨替代方案：</div>
          </div>
        </div>
        ${renderProductCard(alternative, { isAlternative: true })}
      </div>
    `;
    altContainer.classList.remove('hidden');
  } else {
    altContainer.innerHTML = '';
    altContainer.classList.add('hidden');
  }

  // 顯示結果並平滑滾動至結果頂部
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 重設表單與推薦畫面
 */
export function resetApp(formElement) {
  formElement.reset();
  setFormErrors([]);

  // 清除自訂樣式狀態
  document.querySelectorAll('.option-card').forEach((card) => {
    card.classList.remove('selected');
  });

  const resultsSection = document.getElementById('results-section');
  resultsSection.classList.add('hidden');

  const quizSection = document.getElementById('quiz-section');
  quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
