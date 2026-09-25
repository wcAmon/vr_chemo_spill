# Standalone published game release

Goal: deliver the accepted five-station game as one self-contained HTML file and a public source repository, with an agent-readable world/object design guide.

Architecture: bundle procedural meshes, authored world layout, animations, CSS, JavaScript and physics WebAssembly into index.html. Keep gameplay state in memory. No authoring interface, persistence API, account logic or private routing is included.

- [x] Extract only game geometry, movement, hands, interactions and mission state. Preserve the approved world arrangement and five-stage progression.
- [x] Build a player-only entry, pause, description, completion and restart interface. Test full desktop/touch routes, drops, microphone return, pad placement and frozen final time.
- [x] Inline all required resources; verify no external requests when platform infrastructure is blocked. Test strict hosted-page CSP.
- [x] Document object requirements, coordinates, original/active forms, controls, scene annotations, restart behavior and design workflow. No private authoring system or history.
- [x] Audit tracked sources and artifact for credentials, personal paths, private hosts, editor endpoints and unexpected runtime networking. Include required third-party licenses.
- [ ] Create a new public GitHub repository and new public pages on both teaching platforms. Verify source readback and browser startup on both published URLs.

Review focus: missing WASM or asset paths, platform CSP, menu pointer capture, order/target checks, reset cleanup and accidental inclusion of private infrastructure.
