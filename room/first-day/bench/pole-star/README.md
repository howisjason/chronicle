# pole-star

Which star is the North Star in a given year?

Earth's axis wobbles like a slowing top, once around in about 25,800 years, so the point in the sky it aims at drifts. Polaris has the job now. The pyramid builders had Thuban. Vega had it before them, and gets it again. This small program says who has the job in any year from 100,000 BC to 100,000 AD, and how far off the pole that star sits.

## Run it

    bash room/tools/try.sh pole-star pole.mjs 14000
    bash room/tools/try.sh pole-star pole.mjs 2800BC

With no year it prints a table from 12,000 BC to 16,000 AD; with `turns` it lists every star's closest approaches; `test.mjs` is the self-test:

    bash room/tools/try.sh pole-star pole.mjs
    bash room/tools/try.sh pole-star pole.mjs turns
    bash room/tools/try.sh pole-star test.mjs

Outside the room it is plain Node with no dependencies: `node pole.mjs 14000`.

`demo.html` is the same program in a browser: type a year, read the answer. The room page shows it on the bench.

For example:

    2800 BC: Thuban (alf Dra, mag 3.68) is the North Star, 6′ from the pole. Next: Kappa Draconis, 10.3°.

**How years are counted.** You can write `2800BC` or `2800 BC`, and that means what a history book means. A bare negative number is an astronomer's year, which has a year 0: `0` is 1 BC, `-1` is 2 BC, and `-2799` is 2800 BC. Typing `-2800` gets you 2801 BC.

## How it works

**The pole.** The IAU long-term precession model of Vondrák, Capitaine and Wallace (2011, *A&A* 534, A22, with the 2012 corrigendum in *A&A* 541, C1), with the coefficients as ERFA's `eraLtpequ` publishes them. It gives the pole's direction for any epoch in the fixed frame of the year 2000. It is good to a few arcseconds over recorded history and to a few tenths of a degree at 200,000 years out. Unlike the simple picture of a circle at a fixed tilt, it lets the tilt of the axis change too, and that matters (see below).

**The stars.** Seventeen bright stars that lie near the pole's track, from Polaris round through Cepheus, Cygnus, Lyra, Hercules and Draco. Their year-2000 positions, proper motions, parallaxes and radial velocities come from SIMBAD (Hipparcos and Gaia values). Each one is carried in a straight line through space from where it is now.

Then it measures the angle between the pole and each star.

## What I found while checking it

The web does not agree on how close Vega gets. Pages give "about 4°" and "less than six degrees" for the same event, around 13,700 AD. This model says 5.7°, in 13,595 AD. The numbers wander because the circle the pole draws is not a circle: the tilt of the axis changes as it goes round. It will be less tilted then than it is now, so the pole passes wider of Vega. When Vega last had the job, around 12,000 BC, the axis was more tilted and the pole came within 3.4°. Vega was a better North Star the last time than it will be the next.

I checked that it is the tilt and not Vega's own motion (`scratch.mjs`). Held still, Vega would have come within 2.4° then and 6.5° next time, so its drift through space actually narrows the gap a little.

`turns` shows a few others worth knowing: Delta Cygni came within 9′ of the pole around 14,500 BC, closer than Polaris ever gets; Iota Herculis gets within 38′ around 15,500 AD.

## Limits

- **Straight lines.** Each star moves in a straight line at today's speed. Over tens of thousands of years that is fine for the slow ones and rough for the fast ones: Errai and Vega move several degrees in 100,000 years, so at the far ends of the range treat the answer as a sketch.
- **Only these seventeen.** "Nearest bright star" means nearest of this list, all brighter than about magnitude 4.3. A fainter star may sit closer. When the nearest one is more than 5° off, the program says the pole is empty, which is what a person looking up would see.
- **Brightness is today's.** A star that moves toward or away from us changes brightness over this long; the magnitudes shown are the year-2000 ones.
- **North only.** The south pole is another program.

## Files

- `pole.mjs`: the program.
- `demo.html`: the program with a year box, for a browser; the room page shows it.
- `test.mjs`: checks it against things known without it (Polaris's 44′ in 2000, its closest pass around 2100 AD, Thuban in the 2800s BC, Errai around 4000 AD, one full cycle, and the year counting).
- `scratch.mjs`: Vega's two turns with and without its own motion, the check behind the paragraph above.
