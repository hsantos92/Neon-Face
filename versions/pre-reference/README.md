# Neon Face

A standalone audio-reactive cyan particle face derived from [Hector Santos's Neon-Orb](https://github.com/hsantos92/Neon-Orb).

## Run

Run `./launch.sh` in this folder. This local build shares the existing Neon-Orb dependency installation through a `node_modules` symlink. For an independent installation, remove that symlink and run `npm ci`.

Choose a SYSTEM monitor matching your sound output and click Listen to react to playing music. A microphone can also be selected. Capture starts off. Stop ends capture. “Preview music response” drives the real FFT pipeline with simulated bass pulses without capturing audio; live capture automatically disables the preview. H hides controls, Escape restores them, and Space pauses animation.

## Blender design

Both Face design options use the new feminine face study: **Feminine · soft** and **Feminine · defined**. The forms have a shorter, tapered lower face, gentler brow, reduced nose projection, softer cheeks and lifted mouth corners. The soft option applies stronger smoothing; both preserve the stable particle layer and surrounding audio response. Editable models are saved in `assets/neon-face-feminine.blend`. The original models remain on disk for rollback.

## Visual

A cyan particle face with two layers. A fixed layer of surface dots preserves the face shape. The animated dots have 97.5% less motion across the center of the face, with progressively more movement around the temples, sides and rear. Bass and beats move the outer cloud; the head no longer scales as a whole, and particles no longer extrude along surface normals around the nose or eyes. The viewing angle stays fixed so the underlying dots remain stationary.

The original second particle version is preserved in `versions/particle-v2/`; the later mask experiment is preserved in `versions/mask/`.

## Attribution

The active face uses the head scan, sampled into particles.

Head geometry: **Infinite, 3D Head Scan by Lee Perry-Smith**, CC BY 3.0, based on www.triplegangers.com, distributed through the [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith). Original license is in `assets/HEAD-LICENSE.md`. Changes: cropped above shoulders, centered, rescaled, sampled into particles, and animated. The original GLB is retained; `src/head-data.js` contains its extracted geometry.

## Verification

`npm run check` and `npm test` pass. `npm run smoke -- --ozone-platform=wayland` checks shaders, renders idle and simulated-audio previews, and verifies a nonzero music-driven outer-cloud response. It saves `smoke.png` and `smoke-music.png`.

Desktop verification is performed using the smoke check, including simulated audio.
