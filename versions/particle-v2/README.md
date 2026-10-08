# Neon Face

A standalone audio-reactive cyan particle face derived from [Hector Santos's Neon-Orb](https://github.com/hsantos92/Neon-Orb).

## Run

Run `./launch.sh` in this folder. This local build shares the existing Neon-Orb dependency installation through a `node_modules` symlink. For an independent installation, remove that symlink and run `npm ci`.

Choose a SYSTEM monitor matching your sound output and click Listen to react to playing music. A microphone can also be selected. Capture starts off. Stop ends capture. “Preview music response” drives the real FFT pipeline with simulated bass pulses without capturing audio; live capture automatically disables the preview. H hides controls, Escape restores them, and Space pauses animation.

## Visual

Restored second version: a human face made entirely of cyan particles, with drifting dispersion toward the rear. Bass and beats expand the particle face and cloud. No solid shell or orbital rings. The later mask version is preserved under `versions/mask/` as source snapshots.

## Attribution

The active face uses the head scan, sampled into particles.

Head geometry: **Infinite, 3D Head Scan by Lee Perry-Smith**, CC BY 3.0, based on www.triplegangers.com, distributed through the [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith). Original license is in `assets/HEAD-LICENSE.md`. Changes: cropped above shoulders, centered, rescaled, sampled into particles, and animated. The original GLB is retained; `src/head-data.js` contains its extracted geometry.

## Verification

`npm run check` and `npm test` pass. `npm run smoke -- --ozone-platform=wayland` checks shaders, renders idle and simulated-audio previews, and verifies particle expansion above 10%. It saves `smoke.png` and `smoke-music.png`.

Desktop verification is performed using the smoke check, including simulated audio.
