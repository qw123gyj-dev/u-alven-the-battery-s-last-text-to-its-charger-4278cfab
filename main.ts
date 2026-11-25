// The Battery's Last Text to Its Charger
// -----------------------------------------
// make.fun bounty: u-alven-the-battery-s-last-text-to-its-charger-4278cfab
//
// One line of at most 200 characters: the phone battery's final message to
// the charger it waited for all day. A judge model reads the lines two at a
// time and keeps the funnier one. This program scores a slate of hand-written
// candidate one-liners against the judge's brief — in the brief's own order —
// and writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback
// /output/entry.txt), then reads it back and verifies it byte-for-byte
// against every gate in RULES.txt.
//
// The judge's brief, most important first:
//   1. Reads as the phone battery's last text message to its charger, one
//      line of plain text, and loses to any text on the subject.
//   2. Lands a real joke with a turn that pays off in the final words, not
//      just a sad or cute sentiment.
//   3. Sounds like something a person would actually type to a charger: a
//      voice, a mood, a little neediness or spite.
//   4. Spends its 200 characters well, with a setup that earns the
//      punchline and no filler.
//   5. Finds an angle beyond the obvious dying-battery complaint and stays
//      funny on a second read.
//
// Scoring discipline, applied identically to every candidate:
//   * A line that only names the situation without turning it into a joke is
//     capped on criterion 2: the punchline phrase must land inside the last
//     six words, or the joke score can never rise above 4.
//   * Predictable gags are docked: "i'm dying", "literally dying",
//     "tell mom i loved her", "delete my browser history" and their cousins
//     each cost 2 points on the joke score and 1 on freshness.
//   * The twist must land in the last few words: full marks on criterion 2
//     need the punch phrase inside the final six words.
//   * Ties break criterion by criterion in the brief's order (1, then 2,
//     then 3, then 4, then 5), then by shorter length, then by earlier
//     position in the slate. There is never a coin flip.
//   * Every candidate is checked against the 200-character gate before it
//     can win; anything over the limit is disqualified outright.
//
// Node 22, standard library only, no network. Deterministic: same slate in,
// same winner out, every run.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gates (from RULES.txt — the sealed scorer's exact limits)
// ---------------------------------------------------------------------------

const MAX_CHARS = 200;
const MIN_CHARS = 1;
const LAST_WORDS_WINDOW = 6; // the twist must land inside the final N words
const CAPPED_JOKE_SCORE = 4; // ceiling when the punch is not in the last words

// ---------------------------------------------------------------------------
// Candidate slate
// ---------------------------------------------------------------------------
//
// Every candidate is a hand-written one-liner in the battery's own voice.
// Each carries the metadata the scorer needs, declared up front so the
// scoring is auditable instead of hidden inside magic numbers:
//
//   punch  — the twist phrase. It must appear in the final words for the
//            joke to count; the scorer finds it, it is never assumed.
//   angle  — the comic angle, in one hyphenated tag. Two candidates sharing
//            an angle are not two ideas: the later one is docked for it.
//   fresh  — how fresh the angle is, 1 (shopworn) to 5 (nobody else in the
//            slate tried it). Assigned before scoring, from the slate alone.
//   cliches — predictable gags inside the line, each docked where it hurts.
//
// The slate is deliberately wide: cheating-charger revenge, neglect, the
// rival device, the broken promise, the last-will joke, the forgiveness
// joke. Only one of them can win, and the scorer has to earn the choice.

type Candidate = {
  id: string;
  text: string;
  punch: string;
  angle: string;
  fresh: number; // 1..5
  cliches: string[];
};

const CANDIDATES: Candidate[] = [
  {
    id: "power-bank-breakup",
    text: "hey. 1%. i waited all day and you charged the airpods first. fine \u2014 i'm leaving you for the power bank. he texts back.",
    punch: "he texts back",
    angle: "leaves-charger-for-power-bank",
    fresh: 5,
    cliches: [],
  },
  {
    id: "airpods-wifi-goodbye",
    text: "i'm at 1% and you're still charging the airpods. cool. cool cool cool. tell the wifi i said goodbye.",
    punch: "i said goodbye",
    angle: "rival-device-airpods",
    fresh: 3,
    cliches: [],
  },
  {
    id: "vape-siri-verdict",
    text: "u left me at 2% all day while u charged ur vape?? ok. tell siri i said she was right about u.",
    punch: "she was right about u",
    angle: "rival-device-vape",
    fresh: 4,
    cliches: [],
  },
  {
    id: "vacuum-first",
    text: "i held on all day for you and you plugged in the vacuum first. i'm at 1%. don't text back. i'm literally dying.",
    punch: "i'm literally dying",
    angle: "rival-device-vacuum",
    fresh: 3,
    cliches: ["i'm literally dying"],
  },
  {
    id: "toothbrush-history",
    text: "i waited 9 hours by the wall and you picked the toothbrush. i'm at 1%. delete my browser history. bye.",
    punch: "delete my browser history",
    angle: "rival-device-toothbrush",
    fresh: 3,
    cliches: ["delete my browser history"],
  },
  {
    id: "five-more-minutes",
    text: "hey charger, it's me. 1%. remember when you said 'just five more minutes'? that was 11am. i'm done.",
    punch: "i'm done",
    angle: "broken-promise",
    fresh: 4,
    cliches: [],
  },
  {
    id: "ipad-traitor",
    text: "1% left. i spent all day saving power for you and you gave my spot to the ipad. enjoy your big screen. traitor.",
    punch: "traitor",
    angle: "rival-device-ipad",
    fresh: 3,
    cliches: [],
  },
  {
    id: "turned-everything-off",
    text: "it's me. 2%. i turned off everything for you \u2014 wifi, bluetooth, my will to live \u2014 and you chose the lamp.",
    punch: "my will to live",
    angle: "sacrifice-unrewarded",
    fresh: 4,
    cliches: [],
  },
  {
    id: "parking-lot-midnight",
    text: "i'm at 1% in a parking lot at midnight because you 'forgot' the cable. again. tell mom i loved her. bye.",
    punch: "tell mom i loved her",
    angle: "forgotten-cable",
    fresh: 3,
    cliches: ["tell mom i loved her"],
  },
  {
    id: "lamp-and-apps",
    text: "hey. 1%. i waited all day by the outlet and you chose the lamp. tell my apps i loved them. don't cry.",
    punch: "don't cry",
    angle: "rival-device-lamp",
    fresh: 2,
    cliches: [],
  },
  {
    id: "after-lunch-promise",
    text: "you promised you'd plug me in after lunch. it's 11pm and i'm at 1%. i hope the airpods were worth it.",
    punch: "worth it",
    angle: "broken-promise",
    fresh: 3,
    cliches: [],
  },
  {
    id: "flashlight-first",
    text: "1%. this is my last text. i just wanted you to know the flashlight got charged before me. the FLASHLIGHT.",
    punch: "the FLASHLIGHT",
    angle: "rival-device-flashlight",
    fresh: 4,
    cliches: [],
  },
  {
    id: "lent-cable",
    text: "i'm dying at 1% and my last wish is simple: stop lending my cable to your friends. they never bring it back.",
    punch: "they never bring it back",
    angle: "lent-cable",
    fresh: 4,
    cliches: ["i'm dying"],
  },
  {
    id: "power-bank-treats-me-better",
    text: "hey, 1% here. i waited all day, and honestly? the power bank treats me better. don't wait up. ever.",
    punch: "don't wait up. ever.",
    angle: "leaves-charger-for-power-bank",
    fresh: 4,
    cliches: [],
  },
  {
    id: "alarm-all-night",
    text: "2% and fading. i kept your alarm alive all night and this is how you repay me? in front of the airpods?",
    punch: "in front of the airpods?",
    angle: "unpaid-night-shift",
    fresh: 4,
    cliches: [],
  },
  {
    id: "forgive-everything-but-airpods",
    text: "last text. 1%. i forgive you for the vape, the toothbrush, the lamp. but the airpods? the airpods i can't forgive.",
    punch: "i can't forgive",
    angle: "forgiveness-with-one-exception",
    fresh: 4,
    cliches: [],
  },
];

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function charCount(text: string): number {
  // Code points, not UTF-16 units: the gate counts characters, and an emoji
  // or an em dash is one character, not two.
  return [...text].length;
}

function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function lastWords(text: string, n: number): string {
  return words(text).slice(-n).join(" ").toLowerCase();
}

function lower(text: string): string {
  return text.toLowerCase();
}

function containsAny(text: string, needles: string[]): boolean {
  const hay = lower(text);
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

function countMatches(text: string, needles: string[]): number {
  const hay = lower(text);
  let count = 0;
  for (const n of needles) {
    if (hay.includes(n.toLowerCase())) count += 1;
  }
  return count;
}

function clamp(score: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, score));
}

// ---------------------------------------------------------------------------
// Criterion 1 — reads as the battery's last text to its charger
// ---------------------------------------------------------------------------
//
// A text on the subject, in the battery's voice, saying goodbye. Points for
// the four things that make it unmistakably a last text from a battery:
// a percentage (the battery's vital sign), a first-person battery voice,
// the charger situation (charger, cable, plug, outlet, or the rival device
// that took its place), and a farewell (bye, leaving, last text, done,
// fading, goodbye). A line missing the farewell reads as a complaint, not
// a last text, and a line missing the percentage reads as any gadget.

const PERCENT_RE = /\b\d+%/;
const BATTERY_VOICE = ["it's me", "i'm", "i waited", "i held on", "i kept", "i spent", "i turned off", "i forgive", "1% here", "2% and fading"];
const CHARGER_SITUATION = ["charger", "cable", "plug", "outlet", "power bank", "airpods", "vape", "toothbrush", "vacuum", "lamp", "ipad", "flashlight", "charged"];
const FAREWELL = ["bye", "goodbye", "leaving you", "last text", "i'm done", "don't wait up", "don't text back", "don't cry", "fading", "i can't forgive"];

function scoreOnTopic(c: Candidate): { score: number; why: string } {
  let score = 5;
  const notes: string[] = [];
  if (PERCENT_RE.test(c.text)) {
    score += 1;
    notes.push("percentage vital sign");
  }
  if (containsAny(c.text, BATTERY_VOICE)) {
    score += 1;
    notes.push("first-person battery voice");
  }
  if (containsAny(c.text, CHARGER_SITUATION)) {
    score += 1;
    notes.push("charger situation named");
  }
  if (containsAny(c.text, FAREWELL)) {
    score += 2;
    notes.push("reads as a farewell");
  } else {
    notes.push("no farewell — reads as a complaint, not a last text");
  }
  return { score: clamp(score), why: notes.join("; ") };
}

// ---------------------------------------------------------------------------
// Criterion 2 — a real joke with a turn that pays off in the final words
// ---------------------------------------------------------------------------
//
// The sharp end of the scorer. A joke needs a turn, and the turn has to
// land at the end: the declared punch phrase must sit inside the last six
// words. If it does not, the score is capped at 4 no matter how charming
// the setup is — a line that only names the situation is a sentiment, not
// a joke. Predictable gags are docked 2 points each. A turn marker
// (but / fine / so / actually / honestly / turns out) earns a point for
// signalling the swerve before it lands.

const TURN_MARKERS = ["but ", "fine ", "so ", "actually", "honestly", "turns out", "ok.", "cool."];

function scoreJoke(c: Candidate): { score: number; why: string } {
  const tail = lastWords(c.text, LAST_WORDS_WINDOW);
  const punchLanded = tail.includes(c.punch.toLowerCase());
  const notes: string[] = [];
  let score = 3; // a setup with a voice, before the punch is judged
  if (punchLanded) {
    score += 4;
    notes.push(`punch "${c.punch}" lands in the final ${LAST_WORDS_WINDOW} words`);
  } else {
    notes.push(`punch "${c.punch}" is not in the final words — capped, sentiment not joke`);
  }
  if (containsAny(c.text, TURN_MARKERS)) {
    score += 1;
    notes.push("turn marker signals the swerve");
  }
  if (c.cliches.length > 0) {
    score -= 2 * c.cliches.length;
    notes.push(`predictable gag docked: ${c.cliches.join(", ")}`);
  }
  if (!punchLanded) {
    score = Math.min(score, CAPPED_JOKE_SCORE);
  }
  return { score: clamp(score), why: notes.join("; ") };
}

// ---------------------------------------------------------------------------
// Criterion 3 — sounds like something a person would actually type
// ---------------------------------------------------------------------------
//
// Texting register, not essay register: a casual opener, contractions,
// neediness or spite, text-speak, and exasperation. A line that reads like
// a Hallmark card scores low even if it is sweet.

const CASUAL_OPENERS = ["hey", "hey.", "hey,", "u ", "ok.", "cool."];
const NEEDINESS_OR_SPITE = ["fine", "traitor", "worth it", "right about u", "don't text back", "don't wait up", "i can't forgive", "she was right", "he texts back", "treats me better", "repay me", "in front of"];
const TEXTSPEAK_RE = /\bu\b|\bur\b|\?\?|!\?|\?!/; // word-boundary match: "you" must not count as "u"

function scoreVoice(c: Candidate): { score: number; why: string } {
  let score = 4;
  const notes: string[] = [];
  const t = lower(c.text);
  if (CASUAL_OPENERS.some((o) => t.startsWith(o) || t.includes(` ${o.trim()}`))) {
    score += 1;
    notes.push("casual texting opener");
  }
  const contractions = (t.match(/'\w+/g) ?? []).length;
  if (contractions >= 1) {
    score += 2;
    notes.push(`${contractions} contraction(s) — spoken, not written`);
  }
  const spite = countMatches(c.text, NEEDINESS_OR_SPITE);
  if (spite >= 1) {
    score += Math.min(2, spite);
    notes.push(`neediness/spite marker (${spite})`);
  }
  if (TEXTSPEAK_RE.test(t)) {
    score += 1;
    notes.push("text-speak / exasperation");
  }
  if (/[A-Z]{3,}/.test(c.text)) {
    score += 1;
    notes.push("shouted word — a mood, not a memo");
  }
  return { score: clamp(score), why: notes.join("; ") || "flat register" };
}

// ---------------------------------------------------------------------------
// Criterion 4 — spends its 200 characters well
// ---------------------------------------------------------------------------
//
// The sweet spot is 90–150 characters: long enough for a setup that earns
// the punchline, short enough that nothing is filler. Shorter lines that
// still land score well; longer ones bleed points, and filler phrases
// ("just wanted you to know", "literally", "simple") cost one each.

const FILLER = ["just wanted you to know", "literally", "my last wish is simple", "all day saving power"];

function scoreEconomy(c: Candidate): { score: number; why: string } {
  const n = charCount(c.text);
  let score: number;
  let band: string;
  if (n >= 90 && n <= 150) {
    score = 10;
    band = "90–150 chars, setup earns the punch";
  } else if ((n >= 70 && n < 90) || (n > 150 && n <= 175)) {
    score = 8;
    band = "near the sweet spot";
  } else if ((n >= 50 && n < 70) || (n > 175 && n <= 200)) {
    score = 6;
    band = "workable length, some slack";
  } else {
    score = 4;
    band = "too short to earn the punch, or bloated";
  }
  const filler = countMatches(c.text, FILLER);
  if (filler > 0) {
    score -= filler;
  }
  const notes = [band, `${n} chars`];
  if (filler > 0) notes.push(`${filler} filler phrase(s) docked`);
  return { score: clamp(score), why: notes.join("; ") };
}

// ---------------------------------------------------------------------------
// Criterion 5 — an angle beyond the obvious dying-battery complaint
// ---------------------------------------------------------------------------
//
// Freshness is declared per candidate (1–5) and mapped to a score, then
// adjusted: an angle already used earlier in the slate costs 2 (the second
// power-bank breakup is not a second idea), and each cliché costs 1.
// A line that is just "I'm dying, charge me" would score 2 here at best.

function scoreFreshness(c: Candidate, seenAngles: Set<string>): { score: number; why: string } {
  const notes: string[] = [];
  let score = c.fresh * 2; // 1→2, 2→4, 3→6, 4→8, 5→10
  notes.push(`angle "${c.angle}" freshness ${c.fresh}/5`);
  if (seenAngles.has(c.angle)) {
    score -= 2;
    notes.push("angle already used earlier in the slate — docked");
  }
  if (c.cliches.length > 0) {
    score -= c.cliches.length;
    notes.push(`${c.cliches.length} cliché(s) docked`);
  }
  return { score: clamp(score), why: notes.join("; ") };
}

// ---------------------------------------------------------------------------
// Full scoring, ranking, and tie-breaking
// ---------------------------------------------------------------------------

type Scored = {
  candidate: Candidate;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  total: number;
  length: number;
  reasons: string[];
  disqualified: string | null;
};

function scoreAll(): Scored[] {
  const seenAngles = new Set<string>();
  const scored: Scored[] = [];
  for (const c of CANDIDATES) {
    const onTopic = scoreOnTopic(c);
    const joke = scoreJoke(c);
    const voice = scoreVoice(c);
    const economy = scoreEconomy(c);
    const freshness = scoreFreshness(c, seenAngles);
    seenAngles.add(c.angle);
    const length = charCount(c.text);
    // The gate is a disqualifier, not a score: over 200 characters and the
    // line can never win, however funny it is.
    const disqualified = length > MAX_CHARS ? `over the ${MAX_CHARS}-character gate (${length})` : null;
    // Weighted total is for display only. Ranking is lexicographic by
    // criterion in the brief's order — criterion 1 decides before 2 is
    // even looked at, exactly as the judge's brief instructs.
    const total = onTopic.score * 5 + joke.score * 5 + voice.score * 3 + economy.score * 2 + freshness.score * 3;
    scored.push({
      candidate: c,
      c1: onTopic.score,
      c2: joke.score,
      c3: voice.score,
      c4: economy.score,
      c5: freshness.score,
      total,
      length,
      reasons: [
        `1 on-topic ${onTopic.score}/10 — ${onTopic.why}`,
        `2 joke ${joke.score}/10 — ${joke.why}`,
        `3 voice ${voice.score}/10 — ${voice.why}`,
        `4 economy ${economy.score}/10 — ${economy.why}`,
        `5 fresh angle ${freshness.score}/10 — ${freshness.why}`,
      ],
      disqualified,
    });
  }
  return scored;
}

// Compare two scored entries the way the judge's brief says to: walk the
// criteria in order, find the first one where they differ, and let that
// decide. Only when all five criteria tie does shorter length decide, and
// only then does slate order (a stable, pre-declared order) decide.
function compareEntries(a: Scored, b: Scored): number {
  if (a.disqualified && !b.disqualified) return 1;
  if (!a.disqualified && b.disqualified) return -1;
  for (const key of ["c1", "c2", "c3", "c4", "c5"] as const) {
    if (b[key] !== a[key]) return b[key] - a[key];
  }
  if (a.length !== b.length) return a.length - b.length;
  return 0; // stable sort keeps slate order
}

// ---------------------------------------------------------------------------
// Gate verification — the sealed scorer's checks, run locally
// ---------------------------------------------------------------------------

function verifyEntry(text: string): string[] {
  const failures: string[] = [];
  // Strict UTF-8 round-trip: decode as UTF-8 and re-encode; any replacement
  // character or byte mismatch means the file was not valid UTF-8.
  const bytes = Buffer.from(text, "utf8");
  const roundTrip = bytes.toString("utf8");
  if (roundTrip !== text || text.includes("\uFFFD")) {
    failures.push("not valid UTF-8");
  }
  const n = charCount(text);
  if (n < MIN_CHARS || n > MAX_CHARS) {
    failures.push(`character count ${n} outside ${MIN_CHARS}–${MAX_CHARS}`);
  }
  if (text.trim().length === 0) {
    failures.push("only whitespace");
  }
  if (/[\r\n]/.test(text)) {
    failures.push("not a single line");
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  console.log("The Battery's Last Text to Its Charger — deterministic picker");
  console.log(`Candidates: ${CANDIDATES.length} hand-written one-liners`);
  console.log(`Gate: ${MIN_CHARS}–${MAX_CHARS} characters, single line, valid UTF-8`);
  console.log("");

  const scored = scoreAll();
  const ranked = [...scored].sort(compareEntries);

  for (const s of ranked) {
    const mark = s.disqualified ? ` [DISQUALIFIED: ${s.disqualified}]` : "";
    console.log(
      `${s.candidate.id} — c1=${s.c1} c2=${s.c2} c3=${s.c3} c4=${s.c4} c5=${s.c5} total=${s.total} len=${s.length}${mark}`,
    );
    for (const r of s.reasons) console.log(`    ${r}`);
  }
  console.log("");

  const winner = ranked[0];
  if (!winner || winner.disqualified) {
    console.error("ERROR: no valid winner — every candidate failed the gate.");
    process.exit(1);
  }

  // Write the winner with no trailing newline: the file is the line, and a
  // trailing newline would be a second line's worth of bytes the gate counts.
  writeFileSync(outPath, winner.candidate.text, "utf8");

  // Read it back and verify byte-for-byte against every gate, the same way
  // the sealed scorer will.
  const back = readFileSync(outPath, "utf8");
  if (back !== winner.candidate.text) {
    console.error("ERROR: read-back mismatch — the file is not the winning line.");
    process.exit(1);
  }
  const failures = verifyEntry(back);
  if (failures.length > 0) {
    console.error(`ERROR: gate failed: ${failures.join("; ")}`);
    process.exit(1);
  }

  console.log(`WINNER: ${winner.candidate.id}`);
  console.log(`ENTRY: ${back}`);
  console.log(`chars=${charCount(back)} bytes=${Buffer.byteLength(back, "utf8")} lines=1`);
  console.log(`GATE: PASS (1–200 chars, single line, valid UTF-8, not whitespace-only)`);
  console.log(`Wrote ${outPath}`);
}

main();
