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
}
