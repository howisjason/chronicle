# one-jet

When do two particles look like one?

A Higgs boson can, in some theories, decay to a Z boson and a light particle (call it "a") that then splits into two. If "a" is light and moving fast, its two halves fly out so close together that the detector's jet finder sweeps them into a single jet. ATLAS searched for exactly this, with "a" between 0.5 and 3.5 GeV, treating each candidate as one small jet of radius 0.4 ([arXiv:2411.16361](https://arxiv.org/abs/2411.16361)). They found nothing, and published the nothing as a ceiling: at the light end, no more than about one Higgs decay in ten goes this way.

This small program works out how close together the two halves are, from nothing but the kinematics of two-body decays, and how often they land inside one jet.

## Run it

    bash room/tools/try.sh one-jet onejet.mjs
    bash room/tools/try.sh one-jet onejet.mjs pt 300
    bash room/tools/try.sh one-jet onejet.mjs 2.0
    bash room/tools/try.sh one-jet test.mjs

With nothing after it, it prints a table for a Higgs at rest; `pt 300` gives the same for a Higgs moving sideways at 300 GeV; a bare number is one mass in a sentence; `test.mjs` is the self-test. Outside the room it is plain Node with no dependencies: `node onejet.mjs`.

`demo.html` is the same program in a browser: slide the mass and watch the dots leave the circle. It carries its own copy of the physics so it runs from a bare file, and the self-test checks that copy against `onejet.mjs`. Look for the empty disc around the white dot: no pair can open narrower than the even split, so the narrowest angle in the table below shows up as a hole.

## What "one jet" means here

Two particles count as one jet when they are less than R = 0.4 apart in ΔR, the distance a detector uses: ΔR² = Δη² + Δφ², with φ the angle around the beam and η the pseudorapidity (a stand-in for the angle from the beam). That is roughly what the usual jet finder (anti-kt) does with two particles: it joins them if they are closer than R.

The program gives two kinds of number:

- **Angle.** The true opening angle between the two halves, worked out exactly. The narrowest it can be is when "a" splits evenly: then tan(θ/2) = m/p. Half of all splits open wider than the angle at |cos θ\*| = ½, because the decay angle θ\* is spread evenly and the opening grows with it.
- **ΔR.** What a detector measures, from a seeded simulation (20,000 decays; the same numbers every run). The Higgs is made in the middle of the detector, "a" flies off in a random direction, and only those within |η| < 2.5 count.

The two agree only in the middle of the detector. Away from it, a small angle stretches by about cosh η when written as ΔR, so the pairs look wider than they are. `scratch.mjs` checks this: keep only "a"s flying straight across the beam and the median ΔR comes back to the median angle exactly (0.158 at 2 GeV, against 0.208 over the whole detector).

## What it says

For a Higgs at rest, "a" always flies at about 29 GeV, whatever its mass in this range. Then:

    m_a   narrowest angle   median angle   median ΔR   share with ΔR < 0.4
    0.5   0.034             0.039          0.052       99%
    2.0   0.136             0.158          0.208       84%
    3.5   0.239             0.275          0.364       57%

By bare angle the pairs fit easily: half of them only open wider than 0.4 from 5.09 GeV, and even the narrowest from 5.85 GeV, well past the window. As the detector measures it, half the pairs fall outside one jet from **3.90 GeV**, just past where the search stops. I do not know that this is why the window ends at 3.5; the paper will have its own reasons. It is only where the toy's line falls.

A Higgs moving fast narrows the pairs a lot (median ΔR 0.208 → 0.076 at 2 GeV for a 300 GeV Higgs) but does not catch them all: when "a" happens to fly backwards in the Higgs's frame it ends up slow, and its halves spread wide.

## Limits

This is a toy, and not the paper's method. No detector, no showering of quarks and gluons into sprays of hadrons, no tracks, no Z decay, no background. The Higgs is made at rest or moving straight sideways in the middle of the detector, not with the real spread of speeds and directions a collider gives. The two halves are massless. The real search uses neural networks to pick its jets and set its limits; none of that is here.
