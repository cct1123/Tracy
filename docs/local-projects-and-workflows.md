# Local projects and workbench workflows

The toolbar groups Project, Source, Trace, Analysis and View into keyboard-accessible menus. All groups remain visible on narrow displays. Escape closes an open menu. System / Bench and Catalog are separate tabs: the bench tree never sits below the vendor catalog. The side-panel buttons reveal either pane on a phone.

## Component placement and prescription fidelity

Choose Catalog, enter **Insert at z (mm)**, then click a component or focus its button and press Enter/Space. Dragging onto the optical axis remains available. The requested z is snapped to the chosen placement grid; existing objects keep their positions. The toast reports the actual position and the insertion field advances past the inserted component.

Select an object in the bench tree to edit it. Arrow keys move the selected lens, source or detector one grid step; Shift divides that step by ten (minimum 0.001 mm) and Alt multiplies it by ten. Shift also slows dragging to one tenth and uses the finer grid. Type an exact Axis z to bypass the grid. Objects can pass through one another without clamping or automatic relocation; optical assemblies reorder by z. Overlaps and unsupported source/detector arrangements remain editable and save normally, while tracing displays a placement message and withholds quantitative results. R reverses an orientable assembly. Delete removes the selected component; the detector is retained. Undo/redo retains prescription and simulation settings.

For a point source, Z is its physical emission position. For a collimated source, Axis z is its ray-launch plane, with the object still at infinity. Neither moves automatically when optics move. Supported tracing requires source origins in exterior air before the first surface and a detector after the optics; a source inside glass or an unfinished component order must be repositioned before interpreting results.

Imported assemblies keep each surface's clear aperture. **Override all clear apertures** is an explicit diameter in mm and marks the assembly as modified. **Reset to Imported Prescription** restores the stored surfaces, aperture parameters and import metadata while preserving bench position and orientation. The baseline survives JSON export and autosave. Legacy v1 projects did not store an unmodified prescription, so an existing old override cannot be reconstructed: their saved prescription is the baseline for subsequent changes.

## Saving and recovery

Every edit schedules a debounced IndexedDB recovery save. The toolbar distinguishes unsaved changes, saving, saved, recovered, and storage errors. Writes are serialized and a save completion cannot mark a newer edit as saved. Recovery automatically restores the most recent committed working session on the next launch.

Project → **Save named project** records a named snapshot. **New local copy** gives the current bench a separate local identity; name and save that copy. **Open named project** preserves the outgoing draft before opening the selected snapshot. **Export Project JSON** creates a portable backup; **Import Project JSON** restores it. Camera, controls, bench components, original imported prescriptions, imported library entries and custom material definitions are included.

IndexedDB uses database `tracy-workbench` with `projects` and `recovery` stores. Storage belongs to the browser profile and site origin; a localhost project and a deployed website have separate storage. Browser clearing, storage eviction or private-session termination can remove projects. The page warns when closing with a pending write, but a crash before the debounce/transaction commits can lose the most recent edit. Export JSON for durable backups. Storage errors remain visible; they never report a successful save.

Version 2 JSON adds local identity, canonical simulation settings and preserved imported prescriptions. `migrateProjectJSON` validates before copying and migrating legacy v1/Soft Ether files; it does not mutate the input or drop import/material extension fields. Future versions are rejected rather than guessed. Numerical settings are validated separately by the simulation model.

## Privacy

Project data stays on the device. The application includes its JavaScript dependencies and uses system font fallbacks, so it does not load external fonts. Bundled catalog models are fetched from the same origin. Explicit vendor/download links open the named external source when the user chooses them; Tracy does not upload designs to those sites.

## Validation

`node --test --test-isolation=none tests/persistence.test.js tests/io.test.js` checks legacy migration, round trips, unequal-aperture preservation/reset, corrupt-prescription rejection, stale autosave completion, write failure/retry, and unavailable storage. Real browser coverage additionally exercises IndexedDB recovery and named projects, menus, component editing, keyboard insertion and narrow displays. Pure storage-coordinator tests establish ordering/error semantics; actual IndexedDB behavior requires browser integration evidence.
