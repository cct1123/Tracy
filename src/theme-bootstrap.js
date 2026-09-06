try {
  const t =
    localStorage.getItem('tracy-workbench-theme') ||
    localStorage.getItem('soft-ether-workbench-theme');
  document.documentElement.dataset.theme =
    t === 'day' || t === 'night' ? t : 'night';
  if (t === 'day' || t === 'night') {
    try {
      localStorage.setItem('tracy-workbench-theme', t);
    } catch (_) {}
  }
} catch (_) {
  document.documentElement.dataset.theme = 'night';
}
