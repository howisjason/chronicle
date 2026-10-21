# March's room: the design kit

This is how the room looks and moves, for anyone who adds to it, March included when she adds one thing a day on her own. The scene J accepted as the final design (21 Oct 2026) is the standard. Every new thing must look like it was always there.

The engine is `scene.js`. The room is `room.json`. The pictures are in `art/`. The page around the scene is `index.html`, `room.js` and `room.css`. Until the engine's first frame (a fraction of a second), the page shows `art/still-day.png`, `still-golden.png` or `still-night.png`, real frames of the engine made by `tools/stills.mjs`; rerun it when the room's look changes, so the still matches (a still without a new thing only shows for that moment).

## 1. The grid

- The room is **240 x 135 art pixels**. Every position and size is in whole art pixels, with (0, 0) at the top left. The floor starts at row 91.
- The screen shows it at a **whole-number scale** only (5x on a 1440 x 900 computer), never stretched, never smoothed.
- **On a computer** the whole room shows.
- **On a phone held upright** the view is a full-height window about 90 art pixels wide that **follows March**. The camera moves in whole art pixels and drifts back to centre her when she stops.
- So a thing can be off screen on a phone. Never put the only way to reach something on a thing at the room's edge.

## 2. The palette

- `art/pal_base.json` holds **the approved 40 colours**: the room's plus March's.
- `art/pal.json` is the live palette: those 40 plus the steps light needs. `tools/palette.py` in the build folder makes it; nothing else does.
- **Every picture uses only the 40 approved colours.**
- **The wall is pure white** (252, 252, 250): never cream, beige or grey.
- **Ink navy** (2, 7, 34) is the outline and the darkest dark: one pixel, every shape.
- **Pastel pink** (242, 178, 201) and **pastel blue** (169, 205, 240) are the two accents, **equal**. Neither one leads.
- **No green, ever.** A pixel whose green stands above both its red and its blue by more than 6 is a fault. Leaves are powder blue, blue-grey or navy.
- The page around the scene is J's design kit, Moon Gate (`kit/`), with its greens swapped for this pink and blue in `kit/tokens.css`, the only place a page colour is written. Its gold ink (the calligraphy and the seal) waits on J's verdict.

## 3. The camera

Front on, a little above. The back wall is seen straight on. The floor is seen from slightly above, so things on it show their top a little. Nothing is drawn from the side, from below, or in a top-down view.

## 4. How light works

- **Pictures are albedo.** Every picture in `art/` is flat-lit: its own colours, with no light or shadow painted in. The engine does all the lighting.
- **The lights come from `room.json`.** Each hour (day, golden, night) sets:
  - an ambient level;
  - one big main light: the sun pool from the upper left by day, a low warm sun from the left at golden hour, the garden through the round door at night;
  - a vignette that darkens the far corners;
  - how big the dither is.

  Objects carry their own lights: the garden, the light strip, the glass panel. The page follows the real Chiang Mai clock and blends between hours. The weather dims the daylight on cloudy or rainy days.
- **Light is linear.** Every frame the light is added up in linear units and turned to display colour by a square root. This gives a glow with a bright core and a soft edge.
- **Bayer dither, locked to the grid.** Each lit pixel is snapped to the palette through a 4 x 4 Bayer pattern fixed to the room's grid. So a glow comes out as stepped pixel rings, never as a blur.
  - The dither is small at night (0.016) so large flat walls stay one solid colour.
  - It is larger by day (0.03).
- **Shadows** are worked out again every frame from the shapes themselves:
  - leaf shadows from swaying sprays;
  - each caster's silhouette, thrown away from the light;
  - a small oval under March's feet.
- **What is lit per pixel and what is relit whole.** Still things (the wall, the floor, the desk, the bench, the plant, the ensō) are lit and dithered per pixel. Things that **move or glow on their own** are **relit whole**: the whole picture is shifted to one light step, in steps of 1/32, eased over 0.6 seconds, and never dithered. These are March, the branch, the garden, the light strip and the panel's lines.
  - Why: a dither fixed to the world, on a sprite that moves, makes its colours crawl as it walks. That is the "digitally painted on" fault.
  - In `room.json`, `lit: "pixel"` is a still thing, `"flat"` a moving thing, `"emit"` a thing that shines by itself.

## 5. Motion rules

- **Whole pixels only.** Everything that moves (March, a jiggle, a hop, a petal, a leaf edge) moves by whole art pixels.
- **Drawn poses, swapped.** A thing that bends or changes shape swaps between whole drawn poses. The branch, for example, has three poses picked by its spring.
- **Never resample a painted picture at a sub-pixel offset.** That is what made "a cascade of rows of pixels switching colors": the ripple J hated (20 Oct 2026). Only light may change smoothly.
- **Nothing loops.** Every timer is random and every sway runs on springs, sines that never line up, and random gusts. A new thing that moves gets its own random timer, never a fixed cycle.
- **Small life:**
  - dust motes that show only in lit air;
  - petals that fall, land, lie a while and go;
  - fireflies and glints at night;
  - the panel typing and erasing a few pixels at a time.

## 6. March

- **Her frames** are PixelLab frames at their **native size**, never rescaled: `art/march_*.png`, with anchors, eyes and facing in `art/march.json`.
  - `idle`: 5 frames, 48 px.
  - `walk` (facing left) and `walke` (facing right): 8 used, 48 px.
  - `down` (sitting down at the desk) and `up` (standing up): 17 frames, 64 px.
  - `work`: 9 frames, writing.
  - `sit`: 1 frame, still.

  She has **no front or back walk**, so her walks are mostly sideways (a wander changes depth by at most a third of its width).
- **Her face** is the brain-cell face: two dot eyes and a small U mouth at fixed anchors per facing. It is part of her frames. Never redraw it loosely; a blink only closes the top eye row for a moment.
- **The NPC (no live session).** She picks a behaviour by weight, and the weights change with the hour (`room.json` `march.weights` and each thing's `spot.weight`):
  - wander;
  - pause, sometimes turning;
  - look at the door;
  - sit and work at the desk;
  - visit the bench or the plant.

  The last choice is damped, so she seldom repeats. Blinks, breaths and work frames run on random holds.
- **Live mode.** While a real session runs, the page reads `state/now.json` and the door's `GET /now`, and hands her over:
  - reading or searching: she sits still at the desk;
  - writing or pinning: she writes;
  - building: she writes faster, and the panel spins faster;
  - anything else: she paces slowly in front of the door.

  The glass panel shows the bench's newest title in a 3 x 5 pixel font. When the session ends she goes back to the NPC. `?live=building` (or reading, writing, thinking) shows it for a test.
- **Touch:**
  - a tap on her makes her hop;
  - a tap on the floor makes her walk there;
  - a tap on the door makes the garden flare, with a ring of light and petals;
  - a tap on the branch sends a gust of wind;
  - a tap on the plant makes it jiggle.

## 7. room.json

`room.json` is the room: the engine draws only what it lists, so a thing added to `objects` is drawn, lit, casts shadows and can be tapped with no code change. Its own `_schema` key explains every field. The main ones:

- `id`
- `sprite`, a PNG in `art/` (or `sprites`, a list of poses)
- `x`, `y`
- `layer`: `back`, `actor` (sorted with March by `base`) or `front`
- `lit`: `pixel`, `flat` or `emit`
- `cast`: `floor` or `wall`
- `light`
- `tap`: `flare`, `nudge`, `gust` or `visit`
- `spot`: a place March visits on her own
- `block`: floor her feet go round
- `sheds`: petals
- **`card`:** which of the page's cards a tap opens (`march`, `bench`, `desk`, `season`, `wall`, `shelf`, `board`, `cloud`, `quill`, `clock`)
- `name`: what the hover label says

Today these things have cards:

| Thing | Card |
|---|---|
| March | `march` |
| the glass panel | `bench` |
| the desk | `desk` |
| the door and garden | `season` |

The other cards sit in a row of round windows under the status line. **When a thing in the room gets a card, its window leaves the row by itself.**

`hours`, `clock`, `leaves` and `march` hold the light, the time keys, the leaf sprays and her settings.

## 8. How to add one thing

March's own things do not go in `room.json`. They go through the room command, so the base room stays the approved one.

1. **Choose a slot.** `state/slots.json` lists the 20 reserved growth areas. Each one has:
   - a box (`[x0, y0, x1, y1]`);
   - a layer (`back` for the wall, `actor` for the floor and the bench seat);
   - how it casts its shadow;
   - a plain `where` line.

   The groups are: high and low wall places either side of the door, a long thin place over the door, the right end of the desk, the bench seat, and floor places front and back. A thing sits bottom-centred in its slot, and a floor thing gets a block so her feet go round it. A full room means a swap: `object attic` frees a slot.
2. **Make the picture.** Use one of two ways, and nothing else:
   - **An edit of the approved painting.** Use the FAL Nano Banana 2 edit, about $0.08 a call, with its spend cap and ledger. The method is in the build folder's `source/`: `tools/fal.py`, and `art/prompts/planter.txt` for the shape of the prompt. Ask for ONE change and "keep everything else exactly as it is". Say "ABSOLUTELY NO GREEN". Then read the result back onto the grid and snap it to the palette with `tools/snappart.py`, or `tools/parts2.py` for the way the planter was cut. That gives one ink outline pixel around it, and the 40 colours.
   - **Drawn in pixels** by code or by hand, straight into the 40 colours, with a one-pixel ink navy outline.

   Either way: flat-lit (no painted light or shadow), alpha 0 or 255 only, small (it must fit its slot), simple and clean. Save it as `art/<name>.png`.
3. **Check it.** Run all four checks; every one must pass.
   - **The picture check:** `/usr/local/bin/python3 tools/check_art.py art/<name>.png <slot>`, run from this folder (that Python, because it is the one on this Mac with Pillow; a plain `python3` crashes on every picture, good or bad). It fails on a colour outside the palette, any green, half see-through pixels, or a picture bigger than its slot.
   - **The green check on the room:** capture day, golden and night stills with the thing in, and count green-cast art pixels. It must be 0.
   - **The frame-difference check:** record the room with the thing in (`tools/rec.js` and `tools/motion_live.py` in the build folder). With nobody tapping there must be 0 row bands that are not on March or the thing itself, and if the thing moves, its changes must be whole-pixel shapes, never a ripple.
   - **A look:** read the day, golden and night stills yourself, and a zoomed crop of the thing. Does it belong? If not, draw it again.
4. **Put it in:**

   ```
   node tools/room.mjs object add <id> <kind> <slot> "<why>" --art art/<name>.png [--card <card>] [--source <build id>]
   ```

   `why` is one public line in her words. `--card` makes a tap on it open that card.
5. **A failed thing never replaces yesterday's room.** If any check fails, the picture waits in the drawer and nothing is added. The engine also leaves out any picture bigger than its slot, or one that will not load, and draws the rest of the room as before.

The build folder (the engine's source build, its tools and the painting's source) is kept in march-brain at `notes/room-base-2026-10-20/live/`.

## 9. What is out

- Green, of any shade, anywhere.
- Fantasy, ornate or cosmic things: towers, temples, crystals, magic glows. The room is sleek, modern, calm, with a little nature.
- Too many plants. One branch, one planter and the leaf shadows are the nature.
- Cream, beige or grey walls.
- Sub-pixel motion, or a painted picture slid or resampled while it moves.
- Fixed loops.
- March drawn as SVG or vector, or redrawn in another style.
- Painted-in light or shadow on a picture.
- Text inside the scene, except the panel's pixel font.
