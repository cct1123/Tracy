"""Independent RayOptics reference-sphere wavefront fixtures; no Tracy imports.

Uses the pinned dependencies in reference-requirements.txt. The reference sphere
passes through the emergent chief ray at the paraxial exit-pupil plane, rather
than RayOptics' optional real chief-ray axis-crossing pupil convention.
"""
from importlib.metadata import version
import hashlib
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from rayoptics.parax.firstorder import paraxial_trace
from rayoptics.elem.profiles import Conic
from rayoptics.raytr import RayPkg
from rayoptics.raytr.raytrace import trace_raw
from rayoptics.raytr.waveabr import wave_abr_full_calc

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'scripts/reference-rayoptics.py'
spec = importlib.util.spec_from_file_location('reference_rayoptics', BASE)
ref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)


def sha(path):
    return hashlib.sha256(path.read_text(encoding='utf-8').replace('\r\n', '\n').encode()).hexdigest()


def trace(surfaces, origin, direction, wavelength):
    path, all_surfaces, indices = ref.path_for(surfaces, origin, wavelength)
    package = RayPkg(*trace_raw(iter(path), np.array([*origin[:2], 0.]),
        np.array(direction), wavelength * 1000, eps=1e-12,
        check_apertures=True, intersect_obj=False, pt_inside_fuzz=1e-7,
        first_surf=1, last_surf=len(all_surfaces)-2))
    ray = package.ray
    # Full geometric OPL is supplied only as a diagnostic/replay quantity.
    # The accepted wavefront below uses independent Conic sphere intersections;
    # the native Hopkins API is retained separately as a diagnostic.
    total_opl = sum(float(seg[2]) * n for seg, n in zip(ray, indices))
    p = ray[-1][0] + np.array([0., 0., surfaces[-1]['z']])
    return package, path, dict(origin=list(origin), launchDirection=list(direction),
        p=p.tolist(), direction=ray[-1][1].tolist(), opl=total_opl)


def case(name, wavelength, field, detector_z, source_type='collimated',
         launch_z=-40., curvature=1/50, point_xy=(0., 0.), radius=5.):
    lens_radius = min(12., .8/abs(curvature))
    surfaces = [ref.surface(0, sd=radius, isStop=True, componentKind='aperture'),
        ref.surface(5, curvature, 'N-BK7', sd=lens_radius),
        ref.surface(10, -curvature, sd=lens_radius), ref.detector(detector_z)]
    d = np.array(ref.direction(np.tan(np.deg2rad(field[0])),
                               np.tan(np.deg2rad(field[1]))))
    # A fixed equal-area disc, excluding the zero-weight reference ray.
    coords = [(np.sqrt((i + .5)/41) * np.cos(i*np.pi*(3-np.sqrt(5))),
               np.sqrt((i + .5)/41) * np.sin(i*np.pi*(3-np.sqrt(5))))
              for i in range(41)]
    def launch(uv):
        target = np.array([radius*uv[0], radius*uv[1], 0.])
        if source_type == 'point':
            origin = np.array([*point_xy, launch_z])
            direction = target-origin
            direction /= np.linalg.norm(direction)
        else:
            direction = d
            origin = target + (launch_z/d[2])*d
        return origin, direction
    chief_origin, chief_direction = launch((0, 0))
    chief, path, chief_hit = trace(surfaces, chief_origin, chief_direction, wavelength)
    # Independent paraxial stop imaging: a ray starting at stop height zero.
    paraxial, _ = paraxial_trace(iter(path), 1, [0., 1.], [1., 0.])
    height, slope = paraxial[-2][:2]
    exit_z = surfaces[-2]['z'] - height/slope
    b4_p, b4_d = chief.ray[-2][:2]
    pupil_distance = (exit_z-surfaces[-2]['z']-b4_p[2])/b4_d[2]
    pupil_point = b4_p + pupil_distance*b4_d
    image_point = chief.ray[-1][0]
    image_in_last_frame = image_point + np.array([0., 0., detector_z-surfaces[-2]['z']])
    sphere_vector = image_in_last_frame-pupil_point
    sphere_radius = np.linalg.norm(sphere_vector)
    chief_package = (chief, (pupil_point, b4_d, pupil_distance, path[-2][0], b4_p, b4_d))
    sphere = (image_point, sphere_vector/sphere_radius, sphere_radius, None)
    fod = SimpleNamespace(n_obj=1., n_img=1.)
    # Use RayOptics' exact Conic intersection as the accepted sphere reference.
    # Its native Hopkins wave_abr_full_calc is retained as a diagnostic because
    # 0.9.8's native finite-pupil API does not reproduce this sphere intersection
    # for these defocused cases. Its formula/convention discrepancy is unresolved;
    # do not tune Tracy or relax tolerances to reproduce it.
    center = np.array(chief_hit['p'])
    sphere_profile = Conic(c=1/sphere_radius)
    sphere_vertex = center-np.array([0., 0., sphere_radius])
    branch = -1 if exit_z < detector_z else 1
    chief_to_sphere = branch*sphere_radius
    samples, raw = [], []
    for uv in coords:
        origin, direction = launch(uv)
        package, _, hit = trace(surfaces, origin, direction, wavelength)
        hopkins_opd = float(wave_abr_full_calc(fod, None, wavelength*1000, 0.,
                                     package, chief_package, sphere))
        to_sphere, sphere_point = sphere_profile.intersect(
            np.array(hit['p'])-sphere_vertex, np.array(hit['direction']),
            eps=1e-12, z_dir=-branch)
        assert abs(np.linalg.norm(sphere_point+sphere_vertex-center)-sphere_radius) < 1e-10
        phase = float(np.dot(direction, origin-chief_origin)) if source_type == 'collimated' else 0.
        opd = (chief_hit['opl']+chief_to_sphere) - (hit['opl']+phase+to_sphere)
        hit.update(uv=list(uv), sampleWeight=1/len(coords),
            incidentPhaseMm=phase, rawWfeNm=opd*1e6,
            nativeHopkinsWfeNm=hopkins_opd*1e6)
        samples.append(hit)
        raw.append(opd*1e6)
    raw = np.array(raw)
    residual = raw-np.mean(raw)
    design = np.array([[1., *uv] for uv in coords])
    coefficients = np.linalg.lstsq(design, raw, rcond=None)[0]
    tilted = raw-design@coefficients
    for hit, wfe, wfe_tilt in zip(samples, residual, tilted):
        hit.update(wfeNm=float(wfe), wfeTiltRemovedNm=float(wfe_tilt))
    def metrics(values):
        return dict(rmsNm=float(np.sqrt(np.mean(values**2))),
                    pvNm=float(np.max(values)-np.min(values)))
    return dict(id=name, wavelengthUm=wavelength, surfaces=surfaces,
        sourceType=source_type, fieldDeg=list(field), pupilRadiusMm=radius,
        exitPupilZMm=float(exit_z), referencePointMm=(pupil_point+
            np.array([0., 0., surfaces[-2]['z']])).tolist(),
        referenceRadiusMm=float(sphere_radius), chief=chief_hit, samples=samples,
        pistonNm=float(np.mean(raw)), pistonRemoved=metrics(residual),
        pistonTiltRemoved=metrics(tilted), tiltCoefficientsNm=coefficients.tolist())


def main():
    cases = []
    for wavelength in ref.WAVELENGTHS:
        for field in [(0., 0.), (1.5, 2.)]:
            for detector_z in [53., 58., 63.]:
                cases.append(case(f'bcx/{wavelength}/{field}/{detector_z}',
                                  wavelength, field, detector_z))
    cases.append(case('finite-point/on-axis', .5875618, (0., 0.), 105.,
                      'point', -100.))
    cases.append(case('finite-point/off-axis', .5875618, (0., 0.), 105.,
                      'point', -100., point_xy=(1., -2.)))
    # Translating a plane-wave launch plane must not change phase differences.
    cases.append(case('bcx/shifted-launch', .5875618, (1.5, 2.), 58., launch_z=-80.))
    # Strong positive power with a stop before its front focal plane images the
    # exit pupil beyond the detector; this exercises the opposite sphere root.
    cases.append(case('bcx/pupil-beyond-detector', .5875618, (0., 0.), 20.,
                      curvature=1/5, radius=.5))
    payload = dict(schema=1, generator='scripts/reference-wavefront.py',
        generatorSha256=sha(Path(__file__)), geometryGeneratorSha256=sha(BASE),
        packages={p: version(p) for p in ['rayoptics', 'opticalglass', 'numpy', 'scipy']},
        sources=['https://github.com/mjhoptics/ray-optics/blob/v0.9.8/src/rayoptics/raytr/waveabr.py',
                 'https://ray-optics.readthedocs.io/en/stable/api/rayoptics.raytr.waveabr.html'],
        conventions=dict(length='mm', wavefront='nm',
            sign='chief minus sample optical phase at the reference sphere',
            sphere='center at chief detector intercept; passes through chief at paraxial exit-pupil plane',
            source='plane wave at infinity or spherical wave from a common finite point',
            piston='arithmetic mean removed over 41 equal-area source samples',
            tilt='optional least-squares constant + u + v; no defocus removal',
            wavelength='each case is monochromatic; no spectral averaging',
            weights='uniform source-disc quadrature; not Fresnel power or exit-pupil area',
            referenceApi='RayOptics trace_raw, paraxial_trace and Conic.intersect; native Hopkins API retained as diagnostic only',
            scope='explicit stop, coaxial isotropic spherical singlet, homogeneous output air; sampled geometric phase'),
        cases=cases)
    target = ROOT/'tests/fixtures/reference-wavefront.json'
    target.write_text(json.dumps(payload, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    print(f'{target}: {len(cases)} cases, {sum(len(c["samples"]) for c in cases)} samples')


if __name__ == '__main__':
    main()
