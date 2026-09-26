# Release verification

## Automated checks

- TypeScript strict typecheck and reproducible Vite/inline build.
- Mission tests: ordered five-stage progression, out-of-order/proximity rejection, explicit microphone return after speech, aimed pad placement, furniture read-only behavior, pause/reset and source layout immutability.
- Real Havok headless movement comparison at 30, 60 and 120 rendered frames per second. Fixed 60 Hz substeps give matching two-second displacement across all three cases.
- Chromium desktop and touch emulation: free exploration, kit descriptions, console bubble/start, hanging rupture, all five stations with actual F/left-click or touch buttons, final time freeze, reset and notice reading. Only the DEV test bridge teleports the player to aim; actual interaction handlers are used.
- Production HTML loads under a no-network CSP allowing inline scripts and WebAssembly compilation but no JavaScript eval. All external requests are blocked; the game still boots and opens its pause menu. Production QA bridge absent.
- Final privacy scan covers source, documentation, test/build scripts and HTML: no credentials, personal filesystem paths, private hostnames, authoring service routes or original project history.

## Distribution

The root index.html is below both platforms' 10 MB upload limit. It embeds one deduplicated Havok WASM payload, runtime JS/CSS, procedural models, world data and motion data. No separate runtime files or CDN downloads are needed. Runtime license texts are embedded as HTML comments and also included under LICENSES.

Havok 1.3.14 uses a CSP-compatible loader. Previous 1.3.10 used a dynamic Function constructor and was rejected by the strict CSP test, so it is not the shipped version.

## Limits

Voice-end events are simulated in the full-route automation; actual audible output depends on browser/OS speech voices. Real phones, gyroscope permission prompts, headset WebXR and accessibility with a screen reader have not been device-tested. Published platform pages may load their own platform scripts independently of the self-contained game.

## 2026-09-26: direct interaction and camera controls

- Desktop and Chromium touch emulation completed all five stations by directly clicking/tapping scene objects and placement targets.
- Desktop hover does not rotate the camera; right-button drag rotates it without pointer lock; contextual left-button icon is rendered. F remains a center-ray fallback.
- Two simultaneous touch pointers drive movement and the camera stick; knob position changes visibly; release stops camera rotation. Canvas drag and cancelled touch do not start the console.
- TypeScript, mission rules, 30/60/120 Hz physics tests, single-file build and offline CSP startup passed.
- Portrait 430x932 and landscape 844x390 controls inspected; landscape buttons/sticks stay within viewport and do not overlap.
- No physical iOS/Android device or sensor validation is claimed.
