import { createBenchState } from './model/state.js';
import { createBench } from './model/bench.js';
import { createOpticalEngine } from './core/engine.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from './data/defaults.js';
import { installScene } from './rendering/scene.js';
import { installGeometry } from './rendering/geometry.js';
import { installPlots } from './rendering/plots.js';
import { installRays } from './rendering/rays.js';
import { installAnimation } from './rendering/animation.js';
import { installCameraViews } from './rendering/camera.js';
import { installControls } from './ui/controls.js';
import { installBench } from './ui/bench.js';
import { installImports } from './ui/imports.js';
import { installCatalog } from './ui/catalog.js';
import { installTheme } from './ui/theme.js';
import { installHistory } from './ui/history.js';
import { installProjects } from './ui/projects.js';
import { installShell } from './ui/shell.js';
import { installInteractions } from './ui/interactions.js';
import { installStatus } from './ui/status.js';
import { installSelfTests } from './diagnostics/self-tests.js';

function startWorkbench() {
  const state = createBenchState();
  const bench = createBench(state);
  bench.initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
    state.importMeta,
  );
  const app = {
    state,
    bench,
    optics: createOpticalEngine(state),
    view: {},
    ui: {},
    session: {
      suspendTrace: true,
      traceDirty: false,
      lastAnalysis: null,
      onAnalysis: null,
    },
  };
  // Register functions first; bind DOM events only after all collaborators exist.
  const bindings = [
    installScene,
    installGeometry,
    installPlots,
    installRays,
    installAnimation,
    installCameraViews,
    installControls,
    installBench,
    installImports,
    installCatalog,
    installTheme,
    installHistory,
    installProjects,
    installShell,
    installInteractions,
    installStatus,
    installSelfTests,
  ].map((install) => install(app));
  app.ui.buildShell();
  for (const bind of bindings) bind?.();
  app.ui.wireShell();
  document
    .querySelectorAll(
      '[data-action="snapSrcAxis"], [data-action="snapSrcFront"], [data-action="resetCam"]',
    )
    .forEach((button) => {
      button.addEventListener('click', () =>
        (app.ui[button.dataset.action] || app.view[button.dataset.action])(),
      );
    });
  app.session.suspendTrace = false;
  app.ui.applyWorkbenchTheme(app.ui.storedTheme(), {
    persist: false,
    rebuild: true,
  });
  app.ui.renderLibrary();
  app.ui.renderBenchList();
  app.ui.updateUndoButtons();
  app.ui.showDockEmpty();
  app.ui.runOpticsSelfTests();
  app.view.resize();
  app.view.fitBench();
  app.view.startAnimation();
  document.documentElement.dataset.appReady = 'true';
}

try {
  startWorkbench();
} catch (error) {
  console.error('Unable to start Tracy:', error);
  const message = document.createElement('div');
  message.setAttribute('role', 'alert');
  message.style.cssText =
    'position:fixed;inset:20%;padding:32px;background:#151329;color:#eee;z-index:9999;border:1px solid #b69dde;border-radius:12px;';
  message.textContent = `The optical workbench could not start. Use npm run dev and a browser with WebGL enabled. ${error.message}`;
  document.body.appendChild(message);
}
