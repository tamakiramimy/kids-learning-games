# Third-Party Notices

## OpenMoji Learning Images

The local SVG learning images under `public/assets/openmoji/` are unchanged
OpenMoji assets from HfG Schwabisch Gmund and contributors.

- Source: https://openmoji.org/
- License: CC BY-SA 4.0
- License URL: https://creativecommons.org/licenses/by-sa/4.0/
- Local attribution: `public/assets/openmoji/ATTRIBUTION.md`

Any distributed adaptation of those image assets must retain attribution and
follow the ShareAlike requirement.

## tetris-engine

`tetris-engine` version 1.2.18 provides the rule and board-state engine for the
child-friendly “彩虹方块” game. Phaser renders the interface and controls.

- Source: https://github.com/petelinmn/tetris-engine
- License: ISC

## Capacitor

Capacitor provides the native iOS/iPadOS and Android application shells while
the existing React and Phaser game bundle remains the shared application code.

- Source: https://github.com/ionic-team/capacitor
- License: MIT

## Three.js

Three.js renders the original low-poly 3D world used by the “星芽拉力赛”
game. Phaser continues to provide the game navigation, HUD, touch controls, and
input integration.

- Source: https://github.com/mrdoob/three.js
- License: MIT

## Design References

The implementation uses original project code. The following public projects
were reviewed for game-design and interaction patterns only; no source code or
artwork was copied into this repository.

- JavaScript Tetris by Jake Gordon, MIT: https://github.com/jakesgordon/javascript-tetris
- JavaScript Racer by Jake Gordon, MIT: https://github.com/jakesgordon/javascript-racer
- 3D racing avoidance design article: https://www.cnblogs.com/jzssuanfa/p/19975594
- Kenney Racing Pack, CC0: https://kenney.nl/assets/racing-pack