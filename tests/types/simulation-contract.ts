import {
  defaultSimulationSettings,
  createSimulationState,
} from '../../src/model/simulation-state.js';
import type {
  SimulationSettings,
  SimulationState,
} from '../../src/model/simulation-types.js';

const settings: SimulationSettings = defaultSimulationSettings();
const state: SimulationState = createSimulationState(
  { surfaces: [], components: [] },
  settings,
);
state.source.fieldXDeg = 1;
// @ts-expect-error Source distance is numeric millimetres, never a CSS value.
state.source.zMm = '12mm';
// @ts-expect-error Wavelength values are numeric micrometres.
state.spectrum[0].wavelengthUm = '532nm';
// @ts-expect-error Unsupported propagation cannot be selected accidentally.
state.engine.type = 'physical-wave';
