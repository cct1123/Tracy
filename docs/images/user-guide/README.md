# User-guide screenshots

The original JPEGs were captured from the running Tracy development WebUI on 2026-09-05. They are actual browser screenshots, not mockups. The application currently displays **Soft Ether** branding. Most captures use the initial 1280 × 720 browser viewport; the import detail and collapsed-panel view use the later browser layout.

On 2026-09-06, the guide was updated to use **22 focused PNG crops** alongside the unchanged overview. Each detail retains the original pixels, labels, and values: no rescaling, annotations, or generated UI content. The original JPEGs remain available below. PNG preserves the cropped pixels without another JPEG compression pass.

[`crops.json`](crops.json) records each source, output, and crop box as `[left, top, right, bottom]` in source pixels, with the right and bottom edges excluded. It can be used to reproduce or adjust the crops. The guide separates source type, sampling, engine options, and numerical results into their own details.

The [user guide](../../user-guide.md) explains the controls and the settings used in each example. The [verification log](../../verification.md#user-guide-browser-walkthrough) records which interactions were checked and the remaining save/download/reload limitation.

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

## Original captures

| Screenshot                                               | Subject                                           |
| -------------------------------------------------------- | ------------------------------------------------- |
| [01-workbench-overview.jpg](01-workbench-overview.jpg)   | Default d-line Fresnel bench in Layout view.      |
| [02-collimated-source.jpg](02-collimated-source.jpg)     | Collimated source, sampling, and tracing options. |
| [03-point-source.jpg](03-point-source.jpg)               | Point-source position, direction, and NA.         |
| [04-wavelengths.jpg](04-wavelengths.jpg)                 | F+d+C selection and custom wavelength.            |
| [05-sequential-analysis.jpg](05-sequential-analysis.jpg) | Sequential F+d+C trace and analysis.              |
| [06-imported-properties.jpg](06-imported-properties.jpg) | Imported assembly properties.                     |
| [07-detector-focus.jpg](07-detector-focus.jpg)           | Detector moved to z = 32.80 mm.                   |
| [08-singlet-properties.jpg](08-singlet-properties.jpg)   | A placed built-in singlet and its shape fields.   |
| [09-aperture-stop.jpg](09-aperture-stop.jpg)             | A 10 mm stop placed before the default assembly.  |
| [10-camera-3d.jpg](10-camera-3d.jpg)                     | Oblique 3D camera.                                |
| [11-camera-front.jpg](11-camera-front.jpg)               | Front camera.                                     |
| [12-view-controls.jpg](12-view-controls.jpg)             | Geometry display controls.                        |
| [13-night-mode.jpg](13-night-mode.jpg)                   | Night theme.                                      |
| [14-catalog-search.jpg](14-catalog-search.jpg)           | Edmund Optics filter and 49-849 search.           |
| [15-import-lens.jpg](15-import-lens.jpg)                 | Successful example import and library card.       |
| [16-workspace-panels.jpg](16-workspace-panels.jpg)       | Side panels and Analysis collapsed.               |

When replacing a screenshot, reproduce the section's settings in the browser, wait for the visible state to settle, and capture the relevant interface. Check the image at its displayed documentation size, update its caption if the result changed, and retain the filename when the subject is unchanged. Avoid including private projects, unrelated browser content, or native file-picker paths.
