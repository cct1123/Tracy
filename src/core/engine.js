import { createPupil } from './pupil.js';
import { createSequential } from './sequential.js';
import { createFresnel } from './fresnel.js';
import { createSources } from './sources.js';

/** DOM-free optics API. Wavelengths are in micrometres; lengths in millimetres. */
export function createOpticalEngine(state) {
  const optics = {};
  Object.assign(
    optics,
    createPupil(state),
    createSequential(state),
    createFresnel(state),
  );
  Object.assign(optics, createSources(state, optics));
  return optics;
}
