/** Unit aliases document the boundary; field suffixes prevent ambiguous units. */
export type Millimetres = number;
export type Micrometres = number;
export type Nanometres = number;
export type Degrees = number;
export type Radians = number;
export type InverseMillimetres = number;
export type RefractiveIndex = number;
export type RelativePower = number;
export type Vector3 = [number, number, number];
export type PupilCoordinate = [number, number];
export type ComponentId = string;
export interface Surface {
  z: Millimetres;
  curvature: InverseMillimetres;
  sd: Millimetres;
  conic?: number;
  type?: 'STANDARD' | 'EVENASPH';
  parm?: Record<string, number>;
  glass: string | null;
  isStop?: boolean;
  componentId?: ComponentId;
  componentKind?: string;
  thickness?: Millimetres;
}
export interface SpectralSample {
  key: string;
  wavelengthUm: Micrometres;
  sourceWeight: number;
  color: number;
  enabled: boolean;
}
export interface SimulationSettings {
  source: {
    type: 'point' | 'collimated';
    fieldXDeg: Degrees;
    fieldYDeg: Degrees;
    xMm: Millimetres;
    yMm: Millimetres;
    /** Point origin or collimated ray launch plane; the collimated object stays at infinity. */
    zMm: Millimetres;
    aimXDeg: Degrees;
    aimYDeg: Degrees;
    na: number;
    distribution: 'uniform-angular' | 'uniform-solid-angle' | 'uniform-pupil';
    illumination: 'entrance-pupil' | 'fixed-disk';
    diameterMm: Millimetres;
    pupilZMm: Millimetres;
    gaussianSigma: number;
  };
  spectrum: SpectralSample[];
  sampling: {
    pattern: 'pupil3d' | 'meridional' | 'sagittal' | 'ring';
    count: number;
    customWeights: number[] | null;
  };
  engine: {
    type: 'sequential' | 'fresnel';
    materialMode: 'strict' | 'exploratory';
    ghosts: boolean;
    maxBounces: number;
    minPower: number;
  };
  display: {
    count: number;
    showChief: boolean;
    showVignetted: boolean;
    showGhosts: boolean;
    showPupil: boolean;
  };
  analysis: {
    pupilMetric: 'wavefront' | 'relative-opl';
    wavefrontWavelengthKey: string;
    wavefrontUnits: 'nm' | 'waves';
    wavefrontRemoveTilt: boolean;
    wavefrontSpanNm: Nanometres;
    scaleMode: 'auto' | 'locked' | 'shared';
    spotSpanMm: Millimetres;
    oplSpanUm: Micrometres;
    overlay: boolean;
    focusFromMm: Millimetres | null;
    focusToMm: Millimetres | null;
    focusSteps: number;
  };
}
export interface SimulationState extends SimulationSettings {
  schemaVersion: 1;
  surfaces: Surface[];
  components: Record<string, unknown>[];
  epdMm: Millimetres;
  importMeta: Record<string, unknown>;
  customGlasses: Record<
    string,
    | number[]
    | {
        coefficients: number[];
        provenance?: Record<string, unknown>;
        wavelengthRangeUm?: [number, number] | null;
      }
  >;
}
export interface DetectorSample {
  p: Vector3;
  wl: Micrometres;
  col: number;
  sampleWeight: number;
  spectralWeight: number;
  power: RelativePower;
  weight: RelativePower;
  chief: boolean;
  uv: PupilCoordinate;
  rho: number;
  opl: Millimetres;
  direction: Vector3;
  incidentPhaseMm: Millimetres;
}
export interface WavefrontResult {
  status: 'ok' | 'unavailable';
  reason: string | null;
  wavelengthKey: string;
  wavelengthUm: Micrometres | null;
  units: 'nm' | 'waves';
  points: (DetectorSample & {
    rawWfeNm: Nanometres;
    wfeNm: Nanometres;
    wfeWaves: number;
  })[];
  rmsNm: Nanometres | null;
  pvNm: Nanometres | null;
  rmsWaves: number | null;
  pvWaves: number | null;
  maxAbsNm: Nanometres;
  pistonRemoved: true;
  tiltRemoved: boolean;
  defocusRemoved: false;
  weighting: string;
  reference: {
    kind: 'exit-pupil sphere';
    centerMm: Vector3;
    pointMm: Vector3;
    radiusMm: Millimetres;
    exitPupilZMm: Millimetres;
    imageIndex: RefractiveIndex;
    pupilSource?: string;
    sign: 'chief minus sample optical phase';
  } | null;
  pistonNm?: Nanometres;
  tiltUNm?: Nanometres;
  tiltVNm?: Nanometres;
}
export interface SimulationResult {
  status: 'ok' | 'blocked';
  errors: string[];
  warnings: string[];
  assumptions: string[];
  traced: number;
  detectorHits: number;
  vignetted: number;
  bundleSurvival: number | null;
  throughput: RelativePower | null;
  conditionalFresnelTransmission: RelativePower | null;
  sourceCollection: RelativePower | null;
  rms: Millimetres | null;
  rmsText: string;
  throughputText: string;
  centroid: [Millimetres, Millimetres] | null;
  hits: DetectorSample[];
  referenceHits: DetectorSample[];
  wavefront: WavefrontResult;
}
