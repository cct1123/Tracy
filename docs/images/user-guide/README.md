# Archived prototype screenshots

These images document the prototype-era Tracy WebUI. The overview and import example were captured on 2026-09-06 after the naming update. The 22 focused PNG crops are retained as historical assets; they do not describe the current interface or validated numerical results.

The earlier full captures are archived in Git at commit `4aa1c6e`. The overview, import capture and user-supplied showcase are preserved here; historical before/after evidence lives in [outputs/screenshots](../../../outputs/screenshots). Current automated browser runs write isolated artifacts under `test-results/`; see [verification](../../verification.md#browser-validation).

[`crops.json`](crops.json) records each source, output, and crop box as `[left, top, right, bottom]`, with the right and bottom edges excluded. Its default `sourceRevision` identifies the archived captures; an entry with `sourceRevision: null` uses the current local file. PNG preserves the cropped pixels without another JPEG compression pass.

Use the current [user guide](../../user-guide.md) and [verification report](../../verification.md) for supported workflows, persistence and validation limits.

## Cropped function details

| Function           | Detail                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| Collimated source  | [Field angles](details/02-collimated-source.png)                            |
| Pupil sampling     | [Pattern and ray count](details/02-pupil-sampling.png)                      |
| Tracing options    | [Engine and ray display](details/02-engine-options.png)                     |
| Point source       | [Position, aim, and NA](details/03-point-source.png)                        |
| Wavelengths        | [Standard and custom wavelengths](details/04-wavelengths.png)               |
| Analysis plots     | [Spot and relative optical paths](details/05-sequential-analysis.png)       |
| Analysis metrics   | [RMS, throughput, and ray counts](details/05-analysis-metrics.png)          |
| Imported lens      | [Assembly properties](details/06-imported-properties.png)                   |
| Detector position  | [Axis z and diameter](details/07-detector-focus.png)                        |
| Focus result       | [Metrics after the detector move](details/07-detector-metrics.png)          |
| Built-in singlet   | [Shape, glass, orientation, and actions](details/08-singlet-properties.png) |
| Aperture stop      | [Position and clear diameter](details/09-aperture-stop.png)                 |
| 3D camera          | [Oblique viewport](details/10-camera-3d.png)                                |
| Front camera       | [Axial viewport](details/11-camera-front.png)                               |
| View settings      | [Geometry controls](details/12-view-controls.png)                           |
| Night appearance   | [Dark viewport](details/13-night-mode.png)                                  |
| Theme switch       | [Night button](details/13-theme-switch.png)                                 |
| Catalog            | [Search, vendor filter, and Use ZMX](details/14-catalog-search.png)         |
| Lens import        | [Success message and Imported card](details/15-import-lens.png)             |
| Collapsed analysis | [Ruler and summary header](details/16-workspace-panels.png)                 |
| Project files      | [Import, load, and save buttons](details/17-project-controls.png)           |
| Side panels        | [Library and Properties toggles](details/18-panel-toggles.png)              |

## Archived full captures

- [Workbench overview](01-workbench-overview.jpg): the default d-line Fresnel bench in Layout view.
- [Import example](15-import-lens.jpg): a successful example import and its library card.

When replacing a screenshot, reproduce the section's settings in the browser, capture the relevant interface, and check it at its displayed documentation size. Update the caption and crop metadata when needed. Avoid including private projects, unrelated browser content, or native file-picker paths.
