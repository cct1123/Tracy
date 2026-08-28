import {
  DEFAULT_SURFACES,
  DEFAULT_EPD,
  DEFAULT_NAME,
  DEFAULT_COMPONENT_LIBRARY,
} from '../data/defaults.js';

/** Mutable state belongs to one workbench; all geometry uses millimetres. */
export function createBenchState() {
  return {
    surfaces: structuredClone(DEFAULT_SURFACES),
    epd: DEFAULT_EPD,
    lensName: DEFAULT_NAME,
    components: [],
    componentLibrary: structuredClone(DEFAULT_COMPONENT_LIBRARY),
    componentSequence: 1,
    importedSequence: 1,
    benchEpd: DEFAULT_EPD,
    importMeta: {
      objectDistance: null,
      pupilType: 0,
      pupilValue: DEFAULT_EPD,
      rayAimRaw: null,
      unitName: 'MM',
      unitScale: 1,
      enpdSource: 'built-in EPD',
      apertureApprox: false,
    },
    selectedComponentId: null,
    snapMm: 0.1,
  };
}
