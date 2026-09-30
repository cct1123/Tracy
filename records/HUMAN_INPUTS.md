# Human input records

## H001

Recorded: 2026-09-21 UTC (exact message time unavailable).
Type: objective, scope, constraints, priority.
Source: current user message and attached Pasted text.txt, preserved verbatim in [engineering brief](../docs/engineering-brief.md).
Human wording: “use the agentic-engineering-template to advance the Tracy optical simulator following the md attached”. Brief: “Correctness before feature count.” and “Refactor incrementally rather than rewriting the project.”
Interpretation: adopt the template's durable workflow and execute the complete P0/P1 program with P2 gated; retain explicit validation gaps. Software implementation/testing/deployment are in scope; physical devices are not.
Affected: REQ-001–014; [PROJECT](../PROJECT.md), [STATE](../STATE.md).

## H002

Recorded: 2026-09-21 UTC. Type: review, cleanup, validation and publication to Git.
Source: current user message: “Review the current changes, prune unnecessary or obsolete code/files, make only minimal justified fixes, run relevant checks, inspect the final diff, then commit and push. Preserve intentional work”.
Interpretation: review the complete branch against a5c9451; retain intended optics/workflows/reference evidence, remove only demonstrably redundant material, reproduce and minimally fix defects, validate and push codex/tracy-engineering-validation to origin. No history rewrite or merge is requested.
Affected: current implementation review, relevant requirement evidence, final source-control handoff.

## H003

Recorded: 2026-09-21 UTC. Type: documentation and browser tutorial illustrations.
Source: current user message: “update the readme and the doc. browse. screenshot the target function for tutorial. update the illustration pictures. prefer to have both day and night mode illustration”.
Interpretation: inspect the current app in the browser, capture authentic focused screenshots of tutorial workflows in both themes, update README/user documentation and image provenance. Use a separate local tutorial session so existing hosted projects remain intact. No optical feature changes are requested.
Affected: REQ-009–012 documentation/illustration evidence; README, user guide, current tutorial image set.

## H004

Recorded: 2026-09-21 UTC. Type: branch review and integration to main.
Source: current user message: “review merge all branch to main. push”.
Interpretation: refresh local/remote branch inventory, review all work not yet in main, validate the integrated candidate, merge the work into main and push main to origin. Preserve history and source branches; no force push, branch deletion or hosted Site redeployment is requested.
Affected: final repository integration and source-control handoff. Refreshed inventory has one feature branch, codex/tracy-engineering-validation at 9217fd9, descending from main at a5c9451.

## H005

Recorded: 2026-09-30 UTC. Type: detector clearance and precise component positioning.
Source: current user message: “the detector position is too restrictive. it should be able to move close to lens. especially when we work with small focal length lens. and the lens positions should allow further fine tuning, for example users press shift to move the lens fine”.
Interpretation: remove the arbitrary 5 mm detector clearance while retaining forward surface ordering; support Shift precision movement and exact typed axial positions. Validate close-detector placement through focus, import/recovery and normal component controls. Preserve the lens-to-lens overlap rule and optical solver semantics.
Affected: REQ-009–012; PROJECT acceptance extension; STATE current validation.

## H006

Recorded: 2026-09-30 UTC. Type: unrestricted bench rearrangement.
Source: current user message: “the lens, source and detector should be allowed to move across other objects for convenient”.
Interpretation: remove neighbor barriers, overlap avoidance and automatic detector/source relocation. Preserve requested coordinates through dragging, typing, keyboard movement, undo and project recovery. Reorder optical assemblies by axial position. Keep unsupported/overlapping arrangements editable while explicitly withholding invalid trace results. A collimated source position denotes its ray launch plane, not a finite object distance. This supersedes H005's retained placement clearances and new-optic detector relocation.
Affected: REQ-004,007,009–012; bench/source controls, trace-layout validation, persistence and documentation.
