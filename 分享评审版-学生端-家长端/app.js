(function () {
  var key = 'yunling-qingxin-review-feedback';

  function readFeedback() {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }

  function renderFeedback() {
    var list = document.querySelector('[data-feedback-list]');
    var count = document.querySelector('[data-feedback-count]');
    if (!list || !count) return;
    var items = readFeedback();
    count.textContent = items.length + ' 条';
    list.innerHTML = items.length ? items.map(function (item) {
      return '<div class="feedback-entry"><b>' + escapeHtml(item.area) + '</b>　' + escapeHtml(item.message) + '<time>' + escapeHtml(item.time) + '</time></div>';
    }).join('') : '<div class="feedback-entry">还没有意见。请同事看到具体页面后，直接写下建议。</div>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[ch]; });
  }

  function activateTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-tab') === tab); });
    document.querySelectorAll('[data-panel]').forEach(function (panel) { panel.classList.toggle('active', panel.getAttribute('data-panel') === tab); });
    if (history.replaceState) history.replaceState(null, '', '#' + tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-tab]').forEach(function (button) { button.addEventListener('click', function () { activateTab(button.getAttribute('data-tab')); }); });
  document.querySelectorAll('[data-tab-link]').forEach(function (button) { button.addEventListener('click', function () { activateTab(button.getAttribute('data-tab-link')); }); });
  document.querySelectorAll('[data-focus]').forEach(function (button) { button.addEventListener('click', function () { var target = document.getElementById(button.getAttribute('data-focus')); if (target) target.scrollIntoView({ behavior: 'smooth' }); }); });

  document.querySelectorAll('.filter').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('.filter').forEach(function (item) { item.classList.remove('active'); }); button.classList.add('active'); }); });
  document.querySelectorAll('.weather-picks button').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('.weather-picks button').forEach(function (item) { item.classList.remove('active'); }); button.classList.add('active'); }); });

  document.querySelectorAll('.feedback-form').forEach(function (form) { form.addEventListener('submit', function (event) { event.preventDefault(); var data = new FormData(form); var items = readFeedback(); items.unshift({ area: data.get('area'), message: data.get('message'), time: new Date().toLocaleString('zh-CN', { hour12: false }) }); localStorage.setItem(key, JSON.stringify(items)); form.reset(); renderFeedback(); }); });
  renderFeedback();

  var initial = location.hash.slice(1);
  if (initial && document.querySelector('[data-panel="' + initial + '"]')) activateTab(initial);
}());
