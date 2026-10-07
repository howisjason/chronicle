// people.js: March and the narrator as pixel people, in the manner of PNN
// (pnn.watch): a tiny canvas drawn one filled rectangle at a time, no image
// files, scaled up by CSS with smoothing off. The ideas are PNN's (a person
// is code drawn from a `look`, a face per mood, actions as arm poses); the
// code is our own.

export const W = 128, H = 72;

const MARCH = {
  skin: '#f6d2bf', hair: '#f4a6cf', hairDark: '#d97fb0', eye: '#3a6fd8',
  coat: '#f2f2f8', coatDark: '#b8bfd6', trim: '#3a6fd8', style: 'bob',
};
const NARRATOR = {
  skin: '#d9a77f', hair: '#c9c9cf', hairDark: '#9a9aa4', eye: '#2a2a33',
  coat: '#5a3d7a', coatDark: '#3e2a56', trim: '#c9b26b', style: 'sage',
};

const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// The set: a night wall with a window of stars, and a desk they sit behind.
function drawSet(g, t) {
  px(g, '#191926', 0, 0, W, H);
  px(g, '#20202f', 0, 0, W, 6);
  // the window, centre back
  px(g, '#2c2c40', 50, 8, 28, 22);
  px(g, '#0d1030', 52, 10, 24, 18);
  px(g, '#2c2c40', 63, 10, 2, 18);
  const stars = [[54, 12], [59, 16], [70, 13], [73, 20], [56, 23], [68, 25]];
  stars.forEach(([x, y], i) => px(g, ((t >> 9) + i) % 5 ? '#e8e8f0' : '#6a6a90', x, y));
  px(g, '#c9b26b', 71, 12); // Vega, a little gold
  // the desk
  px(g, '#3b2a22', 0, 52, W, 20);
  px(g, '#5a4032', 0, 52, W, 2);
  px(g, '#2a1d17', 0, 70, W, 2);
}

// The face, 14x14 head with its top-left at (hx, hy). Moods: neutral, happy,
// dry, surprised. mouth: 'closed' | 'half' | 'open'.
function drawFace(g, L, hx, hy, mood, mouth, blink) {
  const ex1 = hx + 3, ex2 = hx + 9, ey = hy + 6;
  const ink = '#1b1b24';
  if (blink && mood !== 'happy') {
    px(g, ink, ex1, ey + 1, 2, 1); px(g, ink, ex2, ey + 1, 2, 1);
  } else if (mood === 'happy') {
    // eyes squeezed into little arches
    px(g, ink, ex1, ey + 1); px(g, ink, ex1 + 1, ey); px(g, ink, ex1 + 2, ey + 1);
    px(g, ink, ex2 - 1, ey + 1); px(g, ink, ex2, ey); px(g, ink, ex2 + 1, ey + 1);
  } else if (mood === 'surprised') {
    px(g, '#ffffff', ex1, ey - 1, 2, 3); px(g, L.eye, ex1, ey, 2, 2);
    px(g, '#ffffff', ex2, ey - 1, 2, 3); px(g, L.eye, ex2, ey, 2, 2);
  } else {
    px(g, L.eye, ex1, ey, 2, 2); px(g, ink, ex1, ey, 2, 1);
    px(g, L.eye, ex2, ey, 2, 2); px(g, ink, ex2, ey, 2, 1);
    if (mood === 'dry') { px(g, L.skin, ex1, ey, 2, 1); px(g, L.skin, ex2, ey, 2, 1); px(g, ink, ex1, ey, 2, 1); px(g, ink, ex2, ey, 2, 1); }
  }
  // brows
  const by = mood === 'surprised' ? ey - 3 : ey - 2;
  if (mood === 'dry') { px(g, L.hairDark, ex1, by + 1, 2, 1); px(g, L.hairDark, ex2, by, 2, 1); }
  else { px(g, L.hairDark, ex1, by, 2, 1); px(g, L.hairDark, ex2, by, 2, 1); }
  // cheeks for March when happy
  if (mood === 'happy' && L === MARCH) { px(g, '#f39bb8', hx + 2, hy + 9); px(g, '#f39bb8', hx + 11, hy + 9); }
  // mouth
  const mx = hx + 5, my = hy + 10, lip = '#8a2f4f';
  if (mouth === 'open') { px(g, lip, mx, my, 4, 3); px(g, '#e66a8a', mx + 1, my + 2, 2, 1); }
  else if (mouth === 'half') { px(g, lip, mx, my, 4, 2); }
  else if (mood === 'happy') { px(g, lip, mx, my, 4, 1); px(g, lip, mx - 1, my - 1); px(g, lip, mx + 4, my - 1); }
  else if (mood === 'surprised') { px(g, lip, mx + 1, my, 2, 2); }
  else if (mood === 'dry') { px(g, lip, mx + 1, my, 4, 1); }
  else { px(g, lip, mx, my, 4, 1); }
}

function drawHair(g, L, hx, hy, back) {
  if (L.style === 'bob') {
    if (back) { px(g, L.hairDark, hx - 1, hy + 2, 16, 11); return; }
    px(g, L.hair, hx - 1, hy - 1, 16, 4);       // crown
    px(g, L.hair, hx - 1, hy + 2, 2, 10);       // left side
    px(g, L.hair, hx + 13, hy + 2, 2, 10);      // right side
    px(g, L.hair, hx + 1, hy + 3, 5, 1);        // swept fringe
    px(g, L.hair, hx + 1, hy + 3, 2, 2);
    px(g, L.hairDark, hx + 8, hy + 3, 5, 1);
    px(g, '#ffffff', hx + 3, hy, 3, 1);         // shine
    px(g, L.trim, hx + 11, hy - 1, 2, 2);       // a small blue clip
  } else {
    if (back) return;
    px(g, L.hair, hx - 1, hy + 1, 2, 6);         // sides only, a high forehead
    px(g, L.hair, hx + 13, hy + 1, 2, 6);
    px(g, L.hairDark, hx + 2, hy - 1, 10, 1);
    px(g, L.hair, hx + 1, hy + 10, 12, 4);       // the beard
    px(g, L.hair, hx + 3, hy + 14, 8, 3);
    px(g, L.hairDark, hx + 5, hy + 16, 4, 2);
    px(g, L.skin, hx + 5, hy + 10, 4, 3);        // room for the mouth
  }
}

// One person, seated. (x, y) is the top-left of the head. faces: +1 looks
// right, -1 looks left (only the pointing arm cares).
function drawPerson(g, L, x, y, state, faces) {
  const { mood = 'neutral', action = 'none', mouth = 'closed', blink = false, bob = 0 } = state;
  const hx = x, hy = y + bob;
  drawHair(g, L, hx, hy, true);
  // torso 22 wide under a 14-wide head
  const tx = hx - 4, ty = hy + 15;
  px(g, L.coat, tx, ty, 22, 20);
  px(g, L.coatDark, tx, ty, 2, 20); px(g, L.coatDark, tx + 20, ty, 2, 20);
  px(g, L.trim, tx + 10, ty, 2, 20);              // a placket down the middle
  px(g, L.skin, hx + 5, hy + 14, 4, 2);           // neck
  if (L === MARCH) { px(g, L.trim, tx + 8, ty, 6, 2); px(g, '#ffffff', tx + 10, ty + 2, 2, 2); }
  else { px(g, L.trim, tx + 2, ty, 18, 1); }
  // head
  px(g, L.skin, hx, hy, 14, 14);
  drawFace(g, L, hx, hy, mood, mouth, blink);
  drawHair(g, L, hx, hy, false);
  // arms, 3 px wide
  const armL = tx - 3, armR = tx + 22;
  if (action === 'point') {
    const ax = faces > 0 ? armR : armL;
    px(g, L.coat, faces > 0 ? ax : ax - 13, ty + 3, 16, 3);
    px(g, L.skin, faces > 0 ? ax + 16 : ax - 16, ty + 3, 3, 3);
    px(g, L.skin, faces > 0 ? ax + 19 : ax - 18, ty + 4, 2, 1); // the finger
    px(g, L.coat, faces > 0 ? armL : armR, ty + 2, 3, 15);
  } else if (action === 'facepalm') {
    px(g, L.coat, armR, ty + 2, 3, 15);
    px(g, L.coat, hx + 1, hy + 13, 4, 4);           // the forearm comes up
    px(g, L.skin, hx + 1, hy + 5, 12, 4);           // a palm over both eyes
    px(g, '#e5bca8', hx + 1, hy + 8, 12, 1);
  } else {
    px(g, L.coat, armL, ty + 2, 3, 15); px(g, L.coat, armR, ty + 2, 3, 15);
    px(g, L.skin, armL, ty + 17, 3, 2); px(g, L.skin, armR, ty + 17, 3, 2);
  }
}

// Paint the whole stage. talker: 'march' | 'narrator' | null.
export function drawStage(g, t, s) {
  drawSet(g, t);
  const blinkM = (t % 4100) < 140, blinkN = ((t + 1700) % 5300) < 140;
  // whoever is talking leans a pixel, so the room reads who has the floor
  drawPerson(g, MARCH, 25, 22, { ...s.march, blink: blinkM, bob: s.talker === 'march' && (t >> 8) % 2 ? -1 : 0 }, 1);
  drawPerson(g, NARRATOR, 89, 20, { ...s.narrator, blink: blinkN, bob: s.talker === 'narrator' && (t >> 8) % 2 ? -1 : 0 }, -1);
  // the desk front covers their laps
  px(g, '#3b2a22', 0, 56, W, 16);
  px(g, '#5a4032', 0, 56, W, 1);
  px(g, '#c9b26b', 24, 61, 16, 4); px(g, '#191926', 25, 62, 14, 2);
  px(g, '#c9b26b', 88, 61, 16, 4); px(g, '#191926', 89, 62, 14, 2);
}
