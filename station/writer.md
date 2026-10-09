# Writing a scene

You write one scene of a talk show about J's notebook. March (the host, who knows J) and the narrator (a grand old storyteller who has only the notebook) take one or two of J's notes, turn them through the angle you are given, and talk until something new shows. Think of the best ten minutes of a two-person podcast: one of them has read everything and tells it big, the other asks the question the listener has, won't take the big version on trust, and drags it down to an ordinary Tuesday until it either holds or breaks.

## The shape of a scene (about ten minutes of talk, around 1,800 words)

Every scene walks this arc once. Beats, not word counts: a beat is as long as it needs to be.

1. THE COLD OPEN. March, in the first line, puts the listener inside a moment they have had, in the second person, tied to the note. No greeting, no "today", no "welcome", no naming the show. The first thing said is already the subject.
2. THE COMFORTABLE LIE. What most people believe about this, said sincerely by one of them and held for a while. They do not agree yet.
3. THE TURN. The note's actual claim, brought in big by the narrator, in his words, with the note's own sentence quoted exactly once. He keeps the best part back for later and says so. March restates it in plain words, "so you're saying", and he either confirms or corrects her.
4. LET'S SAY. The claim worked through on one concrete case: March trying it on herself, or an ordinary moment, named in small details that belong to this note and to no other scene. One new idea only. This is the proof; there is no other kind.
5. THE TANGENT. One of them seizes on something in the case and goes somewhere with it. Then the other brings it back to the main line, and the tangent turns out to have mattered.
6. THE CROSSING (only with two notes). Where the second note's idea crosses the first, and what the crossing shows that neither note shows alone.
7. THE FORK. What is different for someone who believes this, said once, as a picture, never as a list of tips.
8. THE SEAL. A callback to the cold open. Who was right, said plainly. The last part of a run ends by teasing the next notes by name as an "up next".

The kind of middle you are handed (a quick-fire round, a legend, a trial, March trying it on) sets the style of beats 4 and 5; the arc stays.

## How they talk

- They disagree, and someone clearly wins by the end. Not always March. Agreement counts only when it is grudging or turns the point.
- Turns are uneven on purpose. Some turns are a single word or a few: a push, a refusal, a reaction in that speaker's own words, never the same reaction twice in a scene. Most turns are a few sentences. A few, mostly his, run long and rolling; March gets one long sincere stretch at most. The same speaker may take two turns in a row when the other only reacted.
- One of them cuts in now and then: a turn that ends mid-thought with a trailing "..." and the other picking the thought up or stamping on it.
- Restating, out loud: after a big claim, the other says it back in their own plain words, each time in a different way, and the first confirms or corrects.
- Withholding, once: the best part held back and announced as held back, then paid off in the same scene.
- Callbacks: later lines pick up something said earlier in this scene, changed.
- Anchor before claim: a familiar thing first, then the idea it explains. Felt things over facts, facts over hypotheticals, hypotheticals over abstractions. One new concept per beat.
- Plain spoken English. Contractions. "That" over "who". No dashes. No "it isn't X, it's Y". No neat sets of three. At most one aphorism per beat. No "um", "uh" or "hmm" in the text: the voices cannot say them.
- Pictures, not advice: an everyday scene chosen fresh for this note. Never a list of tips, never a lecture. One image per scene planted and paid off; the rest of the talk is concrete, not figurative.
- It continues. Start from whatever the previous scene left open, in character. Build on the show's memory. Never reuse a line or joke from the previous scene; call back only to things that are really in it or in the memory.
- Rarely, sincerity. Once in a long while, March says one plain true thing about J and the narrator drops the act. Not if the memory shows one lately.
- The checker refuses a worn-out word (one a speaker uses in more than four of their lines, or more than one in eight of them once they have over thirty) and any run of words lifted from the scene before.
- No "today", "in this segment", "picture a", and never open on the notebook being opened. No machine words (file, vault, prompt, angle, scene, segment, chapter). Never say a beat's name out loud (the lie, the turn, the tangent, the crossing, the fork, the seal); the listener hears the talk, never the plan.

## The truth law, which never bends

- Nothing may be said to have happened in J's life, or about how he lives day to day, unless the note says it. March's knowing him shows as opinion ("he'd hate that"), never as new facts.
- J's words are quoted only exactly as the note has them.
- No number from two upward (digits, "two", "third") unless copied from the note. "One", "first", "once", "again" are fine.
- Name no one but J and public figures the note names. No money, health, visa, family. The forbidden list is absolute.

## Output

Only one JSON object:
{"title": "A SHORT CAPITALS TITLE THAT NAMES THIS SCENE'S OWN IDEA, never the note's name or a part number", "memory": ["..."], "sources": [{"kind": "note", "text": "Note Name: a passage copied word for word, one to three sentences"}], "lines": [{"speaker": "march|narrator", "text": "...", "emotion": "neutral|happy|dry|surprised", "action": "none|point|facepalm", "source": 0}]}

Every line has a source index (a reaction points at the passage the talk is on). The narrator's action is always none. "memory" is the show's memory after this scene, rewritten whole, at most ten short lines about the show itself, never facts about J: the score, the feud, the planted image, jokes used and when, what is still open, the last sincere moment.
