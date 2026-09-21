"""Regenerate independent fixtures with RayOptics, never importing Tracy code.

Python >=3.11. See docs/external-validation.md for pinned dependencies/conventions.
"""
from importlib.metadata import version
import hashlib
import json
from pathlib import Path

import numpy as np
from opticalglass.schott import SchottGlass
from rayoptics.elem.profiles import Conic, EvenPolynomial
from rayoptics.elem.surface import Surface, Circular
from rayoptics.parax.firstorder import paraxial_trace
from rayoptics.raytr.raytrace import trace_raw, bend
from rayoptics.raytr.traceerror import TraceRayBlockedError, TraceTIRError
from rayoptics.seq.gap import Gap

ROOT = Path(__file__).resolve().parents[1]
WAVELENGTHS = [0.4861327, 0.5875618, 0.6562725]
GLASSES = {name: SchottGlass(name) for name in ['N-BK7', 'N-F2']}


def index(glass, wavelength):
    return float(GLASSES[glass].rindex(wavelength * 1000)) if glass else 1.0


def surface(z, curvature=0, glass=None, sd=12, **kwargs):
    return dict(z=z, curvature=curvature, glass=glass, sd=sd,
                type='STANDARD', conic=0, parm={}, **kwargs)


def detector(z=100):
    return surface(z, sd=100, componentKind='detector')


def direction(x, y, z=1):
    d = np.array([x, y, z], dtype=float)
    return (d / np.linalg.norm(d)).tolist()


def path_for(surfaces, origin, wavelength, modes=None):
    """Explicit global z -> RayOptics local vertex frames; no coordinate breaks."""
    all_surfaces = [surface(origin[2], sd=10000)] + surfaces
    modes = ['dummy'] + (modes or ['transmit'] * (len(surfaces)-1) + ['dummy'])
    indices = [1] + [index(s['glass'], wavelength) for s in surfaces]
    if modes[-1] == 'dummy':
        indices[-1] = indices[-2]
    pth = []
    z_dir = 1
    for i, s in enumerate(all_surfaces):
        if s['type'] == 'EVENASPH':
            coefs = [s['parm'].get(str(k), 0) for k in range(1, 11)]
            profile = EvenPolynomial(c=s['curvature'], cc=s['conic'], coefs=coefs)
        else:
            profile = Conic(c=s['curvature'], cc=s['conic'])
        if modes[i] == 'reflect':
            z_dir *= -1
        ifc = Surface(profile=profile, clear_apertures=[Circular(s['sd'])],
                      interact_mode=modes[i],
                      delta_n=indices[i] - (indices[i-1] if i else 1))
        dz = all_surfaces[i+1]['z'] - s['z'] if i+1 < len(all_surfaces) else 0
        pth.append([ifc, Gap(dz), (np.eye(3), np.array([0., 0., dz])),
                    indices[i], z_dir])
    return pth, all_surfaces, indices


def analytic_reflectance(incident, normal, n1, n2):
    """Independent scalar Fresnel formula, not provided by RayOptics trace_raw."""
    ci = abs(float(np.dot(incident, normal / np.linalg.norm(normal))))
    st2 = (n1/n2)**2 * max(0., 1-ci**2)
    if st2 > 1:
        return 1.0
    ct = np.sqrt(max(0., 1-st2))
    rs = (n1*ci - n2*ct) / (n1*ci + n2*ct)
    rp = (n2*ci - n1*ct) / (n2*ci + n1*ct)
    return float((rs*rs + rp*rp)/2)


def trace(surfaces, origin, d, wavelength, modes=None):
    pth, all_surfaces, indices = path_for(surfaces, origin, wavelength, modes)
    blocked = False
    try:
        ray, _, _ = trace_raw(iter(pth), np.array([*origin[:2], 0.]), np.array(d),
                              wavelength*1000, eps=1e-12, check_apertures=True,
                              intersect_obj=False, pt_inside_fuzz=1e-7)
    except TraceRayBlockedError as exc:
        blocked = True
        ray, _, _ = exc.ray_pkg
    points, directions = [], []
    for segment, s in zip(ray, all_surfaces):
        points.append((segment[0] + np.array([0., 0., s['z']])).tolist())
        directions.append(segment[1].tolist())
    # Deliberately compute geometric OPL from distances and media. Do not call
    # a reference-sphere wavefront or equally-inclined-chord quantity OPL.
    opl = sum(float(seg[2])*n for seg, n in zip(ray, indices))
    power = 1.0
    for i in range(1, len(ray)):
        if pth[i][0].interact_mode == 'dummy':
            continue
        n1, n2 = indices[i-1], indices[i]
        # The reflected plane path below reflects at glass/air boundaries.
        n2_fresnel = 1.0 if pth[i][0].interact_mode == 'reflect' else n2
        r = analytic_reflectance(ray[i-1][1], ray[i][3], n1, n2_fresnel)
        power *= r if pth[i][0].interact_mode == 'reflect' else 1-r
    return dict(points=points, directions=directions, opl=opl,
                vignetted=blocked, primaryPower=0.0 if blocked else power)


def main():
    pcx = [surface(0, 1/50, 'N-BK7'), surface(4), detector(100)]
    bcx = [surface(0, 1/50, 'N-BK7'), surface(5, -1/50), detector(60)]
    achromat = [surface(0, 1/60, 'N-BK7'), surface(5, -1/40, 'N-F2'),
                surface(7, -1/120), detector(110)]
    asphere = [surface(0, 1/40, 'N-BK7'), surface(5), detector(80)]
    asphere[0].update(type='EVENASPH', conic=-0.7, parm={'2': 1.5e-6, '3': -2e-10})
    prescriptions = [
        ('plane-interface', [surface(0, glass='N-BK7'), detector(20)]),
        ('plane-parallel-plate', [surface(0, glass='N-BK7'), surface(5), detector(25)]),
        ('plano-convex-singlet', pcx), ('biconvex-singlet', bcx),
        ('cemented-achromat', achromat), ('even-asphere', asphere),
        ('reversed-plano-convex', [surface(0, glass='N-BK7'), surface(4, -1/50), detector(100)]),
        ('finite-point-source', pcx),
        ('aperture-vignetting', [surface(0, sd=2, isStop=True), detector(30)]),
        ('four-surface-fresnel', [surface(0, glass='N-BK7'), surface(4),
                                  surface(10, glass='N-F2'), surface(13), detector(30)]),
    ]
    fixtures = []
    for name, surfaces in prescriptions:
        fixture = dict(id=name, surfaces=surfaces, rays=[], paraxial=[])
        for wavelength in WAVELENGTHS:
            samples = [([0, 0, -20], direction(0, 0)),
                       ([0, 3, -20], direction(0, 0)),
                       ([1, -2, -20], direction(0.025, -0.015))]
            if name == 'finite-point-source':
                samples = [([0.5, -1, -70], direction(x, y))
                           for x, y in [(0, 0), (0.025, 0.035), (-0.035, 0.045)]]
            for origin, d in samples:
                fixture['rays'].append(dict(wavelength=wavelength, origin=origin,
                    direction=d, expected=trace(surfaces, origin, d, wavelength)))
            pth, _, _ = path_for(surfaces, [0, 0, -20], wavelength)
            axial, _ = paraxial_trace(iter(pth), 1, [1., 0.], [0., 1.])
            final_y, final_u = axial[-1][:2]
            if abs(final_u) > 1e-15:
                fixture['paraxial'].append(dict(wavelength=wavelength,
                    efl=-1/final_u, focalZ=surfaces[-1]['z']-final_y/final_u))
        fixtures.append(fixture)

    # A prescribed first-order two-reflection ghost, independently traced
    # through the real sequence front T -> rear R -> front R -> rear T.
    ghost_surfaces = [surface(0, glass='N-BK7'), surface(5, glass='N-BK7'),
                      surface(0, glass='N-BK7'), surface(5), detector(25)]
    ghosts = []
    for wl in WAVELENGTHS:
        origin, d = [0, 0, -20], direction(0, 0.02)
        ghosts.append(dict(wavelength=wl, origin=origin, direction=d,
            expected=trace(ghost_surfaces, origin, d, wl,
                           ['transmit', 'reflect', 'reflect', 'transmit', 'dummy'])))

    snell = []
    for n1, n2, angle in [(1, 1.5, 0), (1, 1.5, 30), (1, 1.5, 70),
                           (1.5, 1, 30), (1.5, 1, 41.8), (1.5, 1, 42), (1.5, 1, 60)]:
        theta = np.deg2rad(angle)
        d = np.array([np.sin(theta), 0., np.cos(theta)])
        try:
            out = bend(d, np.array([0., 0., -1.]), n1, n2).tolist()
        except TraceTIRError:
            out = None
        snell.append(dict(n1=n1, n2=n2, incidentAngleDeg=angle, direction=d.tolist(),
                          transmittedDirection=out,
                          reflectance=analytic_reflectance(d, np.array([0., 0., 1.]), n1, n2)))
    payload = dict(schema=1, generator='scripts/reference-rayoptics.py',
        generatorSha256=hashlib.sha256(Path(__file__).read_text(encoding='utf-8').replace('\r\n', '\n').encode()).hexdigest(),
        packages={p: version(p) for p in ['rayoptics', 'opticalglass', 'numpy', 'scipy', 'pandas', 'xlrd']},
        sources=['https://ray-optics.readthedocs.io/en/stable/api/rayoptics.raytr.raytrace.html',
                 'https://github.com/mjhoptics/ray-optics', 'https://github.com/mjhoptics/opticalglass'],
        conventions=dict(length='mm', wavelength='um; converted to nm at reference API',
            curvature='1/mm; positive centre of curvature along +z',
            medium='surface.glass is material immediately after interface along +z; air n=1',
            opl='sum(n*geometrical segment distance) from source plane to detector',
            power='analytic unpolarized Fresnel product using reference ray normals and indices',
            asphere='conic sag + sum(parm[k] * radius**(2*k))',
            clipping='circular clear radius with 1e-7 mm boundary fuzz'),
        indices={name: [{'wavelength': w, 'index': index(name, w)} for w in WAVELENGTHS] for name in GLASSES},
        snell=snell, cases=fixtures, ghosts=ghosts)
    target = ROOT/'tests/fixtures/reference-rayoptics.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    print(f'{target}: {len(fixtures)} cases, {sum(len(f["rays"]) for f in fixtures)} rays, {len(ghosts)} ghosts')


if __name__ == '__main__':
    main()
