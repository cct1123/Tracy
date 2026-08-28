try {
  const t = localStorage.getItem('soft-ether-workbench-theme');
  document.documentElement.dataset.theme =
    t === 'day' || t === 'night' ? t : 'night';
} catch (_) {
  document.documentElement.dataset.theme = 'night';
}
