// Extracted from the supplied Tracy prototype; see docs/architecture.md.

export function installTheme({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  const TRACY_THEME_KEY = 'tracy-workbench-theme';

  function activeTheme() {
    return document.documentElement.dataset.theme === 'day' ? 'day' : 'night';
  }

  function storedTheme() {
    try {
      const t = localStorage.getItem(TRACY_THEME_KEY);
      return t === 'day' || t === 'night' ? t : 'night';
    } catch (_) {
      return 'night';
    }
  }

  function syncThemeButton() {
    const b = document.getElementById('uxTheme');
    if (!b) return;
    const day = activeTheme() === 'day';
    b.title = day ? 'Switch to night mode' : 'Switch to day mode';
    b.setAttribute('aria-label', b.title);
    b.innerHTML = `<span class="theme-glyph">${day ? '☀' : '☾'}</span><span class="theme-copy">${day ? 'Day' : 'Night'}</span>`;
  }

  function applySceneTheme() {
    const day = activeTheme() === 'day';
    view.renderer.setClearColor(day ? 0xf3f6fa : 0x08071a, 1);
    view.renderer.toneMappingExposure = day ? 1.02 : 1.18;
    if (view.scene.fog) {
      view.scene.fog.color.setHex(day ? 0xf0f4f8 : 0x0c0a22);
      view.scene.fog.density = day ? 0.0045 : 0.009;
    }
    view.keyLight.color.setHex(day ? 0xffffff : 0xc8b8ff);
    view.keyLight.intensity = day ? 2.7 : 3.4;
    view.fillLight.color.setHex(day ? 0xdce8f5 : 0xffe8c0);
    view.fillLight.intensity = day ? 1.05 : 1.15;
    view.rimLight.color.setHex(day ? 0xb8d6ed : 0x80d8ff);
    view.rimLight.intensity = day ? 0.62 : 0.85;
    const amb = view.scene.children.find((o) => o.isAmbientLight);
    if (amb) {
      amb.color.setHex(day ? 0xdce5f0 : 0x2010a0);
      amb.intensity = day ? 1.25 : 0.9;
    }
    // Materials generated before a theme switch need a small live correction.
    view.glassMaterials.forEach((m) => {
      m.envMapIntensity = day ? 0.8 : 1.4;
      m.roughness = day ? 0.045 : 0.035;
      m.needsUpdate = true;
    });
  }

  function applyWorkbenchTheme(
    theme,
    { persist = true, rebuild = false } = {},
  ) {
    const t = theme === 'day' ? 'day' : 'night';
    document.documentElement.dataset.theme = t;
    if (persist) {
      try {
        localStorage.setItem(TRACY_THEME_KEY, t);
      } catch (_) {}
    }
    syncThemeButton();
    applySceneTheme();
    if (rebuild) {
      ui.rebuildBench();
    } else {
      view.redrawSpot();
      view.redrawAberration();
    }
  }

  function toggleWorkbenchTheme() {
    applyWorkbenchTheme(activeTheme() === 'day' ? 'night' : 'day', {
      persist: true,
      rebuild: true,
    });
    ui.benchToast(`${activeTheme() === 'day' ? 'Day' : 'Night'} mode`);
  }
  Object.assign(ui, {
    activeTheme,
    storedTheme,
    syncThemeButton,
    applySceneTheme,
    applyWorkbenchTheme,
    toggleWorkbenchTheme,
  });
  return function bindEvents() {};
}
