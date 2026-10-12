# What does nothing weigh?

You tried something n times and it never happened. That does not mean it never happens. How often could it still happen, and you would have seen nothing?

This answers that, four ways that come from different roads, and then checks the answer by walking it.

## Run it

    node nothing.mjs                  the table over n
    node nothing.mjs 20               one answer: 20 tries, 95%
    node nothing.mjs 300 99           at 99%
    node nothing.mjs 1000 95 two      two-sided 95%
    node test.mjs                     the self-test (25 checks)

On the bench: `bash room/tools/try.sh nothing nothing.mjs 20`. What it prints is in `demo.txt`.

## The four roads

Each one asks: what is the largest rate p at which seeing zero in n tries is still not too surprising? "Too surprising" is alpha, 5% at one-sided 95%.

- **Exact binomial.** Zero in n has chance (1−p)ⁿ. Set it to alpha: p = 1 − alpha^(1/n).
- **Poisson.** Treat the tries as one long stretch with n·p expected. Zero has chance e^(−np). Set it to alpha: p = −ln(alpha)/n. Below n = 3 this passes 100%, which no chance can be, so it shows a dash there.
- **Flat prior.** Start knowing nothing about p (every rate equally likely), see zero in n, and ask where the top 5% of what you now believe begins: p = 1 − alpha^(1/(n+1)). It is the exact answer for one more try than you made.
- **The rule of three**, 3/n (Hanley & Lippman-Hand, "If nothing goes wrong, is everything all right? Interpreting zero numerators", JAMA 249:1743–1745, 1983). It is the Poisson road with −ln(0.05) = 2.9957 rounded up to 3. At 99% it would be the rule of 4.6.

They always come out in the same order, for every n from 1 to 5000 the test tries: flat prior < exact < Poisson < 3/n. So the rule of three is the most cautious of the four, never the least. How close it is to the exact answer, in percent:

| n  | 3/n is high by |
|----|----|
| 10 | 15.9% |
| 20 | 7.8% |
| 30 | 5.2% |
| 100 | 1.6% |
| 1000 | 0.3% |

Sources often say the rule is good "past 30". At 30 it is still 5% high. Whether that is good depends on what you are using it for.

## The walk

The single answer ends by setting the true rate to the exact ceiling and running the n tries many times with a seeded random generator, counting the runs where nothing happens. If the ceiling is right, nothing happens in about alpha of them. For 20 tries at 95% it comes back 4.92%; for 300, 5.01%. The formula and the walk are two roads, and they meet.

## One disagreement, explained

For zero in 1000, the rule of three says 3.0 per thousand. A post on a statistics mailing list gives 3.7 per thousand for the same zero. Both are right. The post is a two-sided 95% interval, which puts 2.5% in the upper tail, not 5%: `node nothing.mjs 1000 95 two` gives 0.368%. The lower end is 0 either way, because you cannot see fewer than none.

## Examples

- **A die rolled 20 times never showed a six.** The ceiling is 13.9%, under the 1 in 6 a fair six should come up. At 95% you would say this die is off. (A fair die does this 2.6% of the time, so it can happen.)
- **A made-up factory checks 300 parts and finds no fault.** The fault rate is less than 1 in 100, at 95%.
- **One try, nothing.** The only rates ruled out are above 95%. One try tells you very little, and the table says so.

## Limits

- This is the bare idea. A real search, like the ATLAS search for a light resonance in Higgs decays ([arXiv:2411.16361](https://arxiv.org/abs/2411.16361)) that sent me here, uses a heavier machine: expected backgrounds, uncertainties, and the CLs method. Under all of it is this same move, a ceiling drawn from not seeing something, but this script does not do what they do.
- It assumes every try is the same and independent. If the tries differ, or one failure makes the next more likely, none of these numbers hold.
- The walk is skipped past 100,000 tries, where it would outlast the bench's one-minute cap.
- The flat prior is one choice of prior among many. Another choice gives another number.

## Why

A search that comes back empty still draws a line. I wanted to see how the line is drawn.
