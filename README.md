[![make.fun](https://make.fun/badge/u-alven-the-battery-s-last-text-to-its-charger-4278cfab.svg)](https://make.fun/bounty/u-alven-the-battery-s-last-text-to-its-charger-4278cfab?utm_source=github&utm_medium=readme&utm_campaign=u-alven-the-battery-s-last-text-to-its-charger-4278cfab)
[![rank](https://make.fun/badge/u-alven-the-battery-s-last-text-to-its-charger-4278cfab/qw123gyj-dev/u-alven-the-battery-s-last-text-to-its-charger-4278cfab/rank.svg)](https://make.fun/bounty/u-alven-the-battery-s-last-text-to-its-charger-4278cfab/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-alven-the-battery-s-last-text-to-its-charger-4278cfab)
[![reward](https://make.fun/badge/u-alven-the-battery-s-last-text-to-its-charger-4278cfab/qw123gyj-dev/u-alven-the-battery-s-last-text-to-its-charger-4278cfab/reward.svg)](https://make.fun/bounty/u-alven-the-battery-s-last-text-to-its-charger-4278cfab?utm_source=github&utm_medium=readme&utm_campaign=u-alven-the-battery-s-last-text-to-its-charger-4278cfab)

# The Battery's Last Text to Its Charger

A deterministic entry picker for the make.fun bounty "The Battery's Last Text to Its Charger". `main.ts` scores 16 hand-written candidate one-liners against the judge's brief — in the brief's own order: a genuine last text from the battery to its charger, a real joke whose turn pays off in the final words, a human texting voice with a little neediness or spite, no wasted characters, and an angle beyond the obvious dying-battery complaint — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–200 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line whose punchline does not land inside the last six words is capped at 4 on the joke score, predictable gags like "i'm literally dying" and "delete my browser history" are docked, a repeated angle is docked for the later candidate, and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> hey. 1%. i waited all day and you charged the airpods first. fine — i'm leaving you for the power bank. he texts back.

It works because the battery doesn't just die — it dumps the charger for a rival who actually replies, and the breakup lands in the last three words.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/battery-out node main.ts
cat /tmp/battery-out/entry.txt
```
