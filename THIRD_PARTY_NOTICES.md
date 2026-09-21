# Third-party notices

Tracy's original code and documentation are licensed under the [MIT License](LICENSE). Third-party materials retain their own terms. The build includes this notice, Tracy's `LICENSE`, and the Three.js license.

- **Three.js 0.128.0**: MIT licensed. Its upstream `LICENSE` is installed with the package and copied into `dist/vendor/three/LICENSE` by the build.
- **Google Fonts**: the historical prototype requests Cormorant Garamond, DM Mono, and Jost. The current application uses local system fallbacks and makes no font requests; font files are not redistributed.
- **Source prototype**: supplied by the user and retained in `references/tracy-prototype.html`, with branding and identifiers updated to Tracy. The supplied file has no stated license. Tracy's MIT grant covers original Tracy contributions only; it does not establish permission to redistribute or relicense the prototype or its pre-existing code. Confirm ownership or permission before publishing those materials.
- **Vendor catalog metadata**: Thorlabs and Edmund Optics names, stock numbers, product links, and public optical specifications identify third-party products. Vendor-hosted prescription files are linked rather than redistributed. Locally stored Edmund Optics seed ZMX files are minimal representations of public product specifications and do not imply vendor endorsement.

ESLint and Prettier are development tools and are not included in the browser build.

# Engineering workflow and validation tooling

The persistent engineering workflow is adapted from [cct1123/agentic-engineering-template](https://github.com/cct1123/agentic-engineering-template), MIT; its notice is retained at `records/TEMPLATE-LICENSE`.

Independent fixtures are generated with [RayOptics](https://github.com/mjhoptics/ray-optics) 0.9.8 and [opticalglass](https://github.com/mjhoptics/opticalglass) 1.1.1 (BSD-3-Clause). They are development/reference tools, not shipped browser dependencies. The fixture provenance and conventions are in `docs/external-validation.md`; pinned regeneration requirements are in `scripts/reference-requirements.txt`.

Browser validation uses Playwright 1.55.1 (Apache-2.0) and type validation uses TypeScript 5.9.2 (Apache-2.0), as development dependencies. Package license files remain in their installed distributions.
