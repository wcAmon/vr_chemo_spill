# Public release

- GitHub: https://github.com/wcAmon/vr_chemo_spill
- MiniMentor: https://pages.minimentor.coach/p/OTtCxXF9N7nOVAXk
- tmuh.ai: https://tmuh.ai/u/greenamon/vr-chemo-spill/

Both hosted pages contain the same published-player-only HTML build. MiniMentor source readback matches after removing only its observed injected CSP meta line (including its preceding newline/indentation). tmuh.ai public source matches the build byte-for-byte. The source repository was initialized fresh and excludes private history and credentials.

Live Chromium checks passed on both public URLs: world loads, entry and pause/resume work, no editor controls, and no page errors. Independent code review completed; simulation timestep and kit-description findings fixed and retested.

## Controls update — 2026-09-26

The same two public URLs were updated in place with dual touch sticks, direct scene taps, desktop hover prompts with a left-button icon, and right-button drag camera controls. Owner/public readback matches the new artifact (MiniMentor's injected CSP excluded). Local five-station desktop/touch interaction checks passed; both public pages passed desktop and touch startup/pause smoke checks. Original authored world and task sequence remain unchanged.
