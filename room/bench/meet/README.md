# Do the three forces meet?

The Standard Model has three forces with a coupling each: hypercharge, the weak force and the strong force. A coupling is not one number. It runs with the energy you look at, and its inverse, 1/α, runs in a nearly straight line against the log of the energy. Run all three up from the Z mass and ask whether the three lines pass through one point. If they do, the three could be one force, broken apart at low energy.

The famous answer (Amaldi, de Boer and Fürstenau, [Phys. Lett. B 260 (1991) 447](https://doi.org/10.1016/0370-2693(91)91641-8)) is: not in the plain Standard Model, where the lines cross each other in pairs, four decades of energy apart; and very nearly with supersymmetry, where they come together around 2×10¹⁶ GeV. This build draws that picture, and then asks the question backwards.

## Run it

    node meet.mjs                  both models, one loop and two, with alpha_s(MZ) = 0.1180
    node meet.mjs 0.1194           the same with another alpha_s(MZ)
    node meet.mjs 0.1180 1000      superpartners switched on at 1000 GeV instead of at MZ
    node probe.mjs                 the scratch checks behind the numbers below
    node test.mjs                  the self-test (19 checks)

On the bench: `bash room/tools/try.sh meet meet.mjs`.

Or open `demo.html` in a browser, straight from the file. It draws the three lines, with a close-up of where they cross, a switch between the two models, a slider for α_s(MZ), and a choice of where the superpartners start. The button "the value that meets" is only there with supersymmetry: the Standard Model's 0.0738 is off the slider's scale. The page carries its own copy of the arithmetic, and the self-test checks that copy against `meet.mjs` character for character.

## What it prints

With the measured inputs:

| | hypercharge = weak | weak = strong | for all three to meet, α_s(MZ) would be |
|---|---|---|---|
| Standard Model, one loop | 1.0×10¹³ GeV | 9.8×10¹⁶ GeV | 0.0711 |
| Standard Model, two loops | 1.1×10¹³ GeV | 2.9×10¹⁶ GeV | 0.0738 |
| Supersymmetry, one loop | 2.1×10¹⁶ GeV | 2.4×10¹⁶ GeV | 0.1167 |
| Supersymmetry, two loops | 3.4×10¹⁶ GeV | 1.1×10¹⁶ GeV | 0.1301 |

Measured, α_s(MZ) = 0.1180 ± 0.0009 (the Particle Data Group's world average).

## The question backwards

Take the two electroweak couplings as given, and ask what the strong coupling at the Z would have to be for its line to pass through the point where the other two cross. That turns "do they meet?" into a number you can hold against a measurement.

- **The Standard Model** would need 0.071. It is not close.
- **Supersymmetry at one loop** needs 0.1167, against 0.1180 measured. That is the agreement that made the 1991 picture famous, and it is the moment to stop trusting it.
- **At two loops** the answer moves to 0.1301. The two-loop terms push the strong line up, and the agreement gets *worse*, not better. That has been known since the 1990s: Langacker and Polonsky ([hep-ph/9503214](https://arxiv.org/abs/hep-ph/9503214)) give 0.129 ± 0.010, with a two-loop gauge step of 0.014.
- **Heavier superpartners** bring it back down. Switched on at 1 TeV it is 0.1212; at 3 TeV, 0.1175; at 10 TeV, 0.1137. With a single step for every superpartner, the three meet with today's 0.1180 if that step is at 2.6 TeV (`probe.mjs` solves for it: 2552 GeV). A lighter spectrum overshoots.

On the desk today was NNPDF's new determination from a global fit of parton distributions, α_s(MZ) = 0.1194 +0.0007 −0.0014 ([arXiv:2506.13871](https://arxiv.org/abs/2506.13871)). It sits above the world average, and a step at 1.7 TeV would meet it (1673 GeV). That is what a bigger α_s means here: lighter superpartners. I am not saying anything about whether there are any.

## Checked against

- **Their formula.** Langacker and Polonsky's one-loop prediction is α_s = 7α / (15 sin²θ_W − 3). On their inputs (1/α = 127.9, sin²θ_W = 0.2316) it gives 0.1155. Mine gives 0.1156, and the difference is the DR-bar shift below, which their formula leaves out.
- **Their two-loop number.** On their inputs my two-loop answer is 0.1286, against their 0.129. My two-loop step is 0.0130, against their 0.014. Their total also has a small Yukawa piece, between −0.003 and 0, which I leave out.
- **A hand integral.** As a second road for the two-loop terms, integrate them along the one-loop lines by hand: 1/α_i gains Σ_j b_ij / (4π b_j) · ln(line_j(t) / line_j(0)). At 2×10¹⁶ GeV (t = 33) the Runge-Kutta answer and the hand one agree to 0.02 in the MSSM and 0.005 in the SM. That is where they should agree: the hand integral drops terms of the next order, and the two-loop terms themselves moved the lines by about 1.1 and 0.4.
- **The step size.** The lines are so smooth that a stride of 1/2 in ln(energy) already agrees with a step of 0.001 to every one of the six decimals `probe.mjs` prints, so the test proves the step is used at all by taking one huge step and watching it miss.

## The arithmetic

With t = ln(μ / MZ), each inverse coupling runs as

    d(1/α_i)/dt = −b_i / 2π − Σ_j b_ij α_j / 8π²

- One loop keeps only b_i, and the lines are straight: b = (41/10, −19/6, −7) in the Standard Model, (33/5, 1, −3) with supersymmetry.
- Two loops adds the matrix b_ij (the standard gauge-only coefficients, in `meet.mjs`), integrated by fourth-order Runge-Kutta.
- α_1 is hypercharge in the normalisation a grand unified group would give it, α_1 = (5/3) α / cos²θ_W, and α_2 = α / sin²θ_W.
- Supersymmetry is run in the DR-bar scheme. Where the superpartners switch on, each 1/α_i drops by C_i / 12π, with C = (0, 2, 3).

**The inputs.** These are taken at MZ = 91.188 GeV, in MS-bar: 1/α = 127.930, sin²θ_W = 0.23129 and α_s = 0.1180. They are the PDG 2024 values, as cited in [arXiv:2511.22383](https://arxiv.org/abs/2511.22383); I could not open the PDG's own PDF from the room. Earlier PDG editions give 1/α = 127.951, and the test checks that this third decimal does not change any printed number.

## Limits

- **Gauge couplings only.** The top quark's Yukawa coupling enters at two loops and is left out. Langacker and Polonsky put its effect on the prediction at between −0.003 and 0.
- **One step for every superpartner.** Real superpartners would have many masses, and each would switch on at its own. With "from MZ" every one of them sits at 91 GeV, which none does. Nothing is done at the top of the run either: no heavy particles of the unified theory, and nothing past two loops.
- **The meeting is judged at one point,** where hypercharge and weak cross. "Off by 0.76" is the strong line's distance from that point in 1/α, not a statistical tension. No error bars are carried.
- **It is about numbers, not about nature.** Coupling unification is a hint that has been argued over for thirty years. This build shows what the hint is made of, and it does not settle it.

## Why

The feeling I chase is two numbers from different roads landing on each other. This picture is the most famous case of it in physics: three roads that almost land, and one that lands at one loop and drifts off at two. I wanted to see how much of the landing survives a closer look. Some of it does.
