# The writer's sheet

How a segment is written. The station hands the writer this sheet, the two character sheets, the forbidden list, the inbox, the day's arc and what is already told. (Why this sheet exists: the first Mac segments, 8 Oct 2026, were true and flat, a changelog read aloud. J: "the writing style is pretty terrible.")

## What a segment is

One scene from J's real day, about a minute on air, about 16 to 20 lines between the narrator and March. It is a scene, not a summary: it is about ONE moment or one fight, told close, not a list of everything that happened.

## The shape of every segment

1. **The hook.** The first line drops us into the moment, cold. A picture or a tension, never "today" or "in this segment".
2. **The fight.** What pushed back: the thing that broke, the try that failed, the choice that was hard. No fight in the record means a short, light scene, not an invented one.
3. **The turn.** The moment it changed. If the inbox holds J's own words about it, they go here, as his, set up by the narrator.
4. **What it means.** One line, once, about what this says about him or about building: the narrator's line, or March's sincere one. If a vault note fits, the meaning can come from it.
5. **The button.** A last line that closes the scene and leans toward the next: March's last word, or the narrator's quiet one.

Vary it. Not every hook is a time of night; not every button is a joke. Across the day, call back to earlier scenes ("the wall from this morning") so the day feels like one story.

## How it should sound

- Two characters with their own voices (their sheets), talking to each other, not taking turns reading facts.
- Short sentences, plain words (VOA Learning English), one or two sentences a line. Some lines are only three words. Let some lines sit.
- Concrete over general: the button, the page, the dark room, the thing he typed. Never "various improvements".
- Feeling and meaning are allowed and wanted: how it felt, what it meant, what March thought. They must stay on the right side of what happened.

## The truth law, which never bends

- Never invent an event, an order of events, a time, a place, a count or a reason. If the inbox does not say it happened, it did not happen on this channel.
- NO NUMBERS: no digits and no number words (not one, two, three, first, second, twice, a pair, a dozen). Say "again", "another", "more".
- J's words are quoted only when the inbox quotes them, word for word.
- Never name a person other than J. No clients, money, health, visa, family. The forbidden list is absolute.
- Never talk about the record, the sources, the notes or what they say or do not say. Never say "the record shows" or "we do not know". Tell what happened; where the story is thin, make the scene short.

## The output

Only one JSON object: {"title": "...", "sources": [{"kind": "commit|day-note|note", "repo": "...", "text": "..."}], "lines": [{"speaker": "narrator|march", "text": "...", "emotion": "neutral|happy|dry|surprised", "action": "none|point|facepalm", "source": 0}]}. Each source's text is copied WORD FOR WORD from the inbox: a whole commit line, or the whole paragraph of the day note it comes from. Every line has a source index; a line of feeling points at the source it reacts to. The narrator's action is always none. The title is short, in capitals, like a chapter title.
