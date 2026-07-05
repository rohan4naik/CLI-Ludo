<div align="center">

# 🎲 terminal-ludo

**Classic Ludo, right in your terminal.**
Fully offline · zero dependencies · play against AI or hotseat with friends.

[![npm version](https://img.shields.io/npm/v/terminal-ludo.svg)](https://www.npmjs.com/package/terminal-ludo)
[![node](https://img.shields.io/badge/node-%E2%89%A514-brightgreen.svg)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](package.json)
[![license](https://img.shields.io/badge/license-MIT-informational.svg)](LICENSE)

</div>

```
npx terminal-ludo
```

---

## Contents

- [Preview](#preview)
- [Features](#features)
- [Install](#install)
- [How to play](#how-to-play)
- [Rules](#rules)
- [Command-line options](#command-line-options)
- [Saving & resuming](#saving--resuming)
- [Board legend](#board-legend)
- [Project structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Preview

The board is a colour 15×15 grid. Tokens on the track render as filled coloured
pills so they are easy to spot; tokens still in the yard sit in their corner.

```
            · · ·
  ○   ○     ·   ◈   ○   ○
            Y   ·
  R   R     R   ·   G   G
            ·   ·
            ·   ·
· 2 · · · ·       · · · ✦ · ·
·             ★             ·
· · ✦ · · ·       · · · · 2 ·
            ·   ·
  ○   B     ·   ·   Y   ○
            ·   ·
  B   ○     ·   2   ○   Y
            ◈   ·
            · · ·
```

> Actual output is in full colour — red, green, yellow and blue.

## Features

- 🎯 **Full classic rules** — 4 tokens per player, capture, safe squares, home columns, exact-roll finish.
- 🤖 **Play vs. AI** — 0–4 humans; the rest are computer players.
- 🎚️ **Three difficulty levels** — `easy`, `normal`, `hard`.
- 🎨 **Choose your colours** — pick which colours play and which are human.
- 🎲 **Animated dice roll**.
- ⌨️ **Single-keypress controls** — press Enter to roll, no typing or Enter-to-confirm.
- 💾 **Save & resume** — quit anytime, pick up later.
- 👀 **`--watch` demo** — sit back and watch four AIs battle.
- 👥 **Hotseat multiplayer** on one machine.
- 🖥️ **Any ANSI terminal** — honours `NO_COLOR`.
- 📦 **Zero runtime dependencies** — works anywhere Node ≥ 14 runs, no internet needed.

## Install

Run instantly without installing:

```sh
npx terminal-ludo
```

Or install globally for a permanent `ludo` command:

```sh
npm install -g terminal-ludo
ludo
```

**Requirements:** Node.js ≥ 14 and a terminal that supports ANSI colour (virtually all do).

## How to play

Run `ludo` and answer the prompts:

1. **How many players** (2–4).
2. **Which colours play** — only asked when fewer than 4 are in the game.
3. **Which colours are human** — a comma-separated list; the rest are AI. Enter `none` for an all-CPU game.

Colours can be given by **name** (`red`), **initial** (`r`), or **number** (`1`).
For example `red, blue`, `r b`, and `1 4` all pick red and blue.

### Controls

On your turn everything is a **single keypress** — no typing, no Enter-to-confirm:

| Key         | Action                                   |
|-------------|------------------------------------------|
| `Enter`     | Roll the dice                            |
| `1`–`4`     | Move that token (when you have a choice) |
| any key     | Continue after a turn                    |
| `s`         | Save the game and quit                   |
| `q`         | Quit without saving                      |

## Rules

- You need a **6** to move a token out of your yard onto the board.
- Rolling a **6** — or **capturing** an opponent, or sending a token **home** — earns an **extra turn**.
- Rolling three **6s** in a row forfeits the turn.
- Landing on an opponent sends it back to its yard — **except** on a **safe square** (`✦`) or a coloured **start** (`◈`).
- Tokens must reach home on an **exact** roll; you cannot overshoot.
- First player to get **all four tokens home** wins. Play continues for the remaining places.

## Command-line options

```
ludo [options]

  -h, --help                 Show help
  -w, --watch                Watch four AI players battle it out (no input)
  -d, --difficulty <level>   AI level: easy | normal | hard   (default: normal)
  -l, --load <file>          Resume a previously saved game
```

Examples:

```sh
ludo                          # interactive game
ludo -d hard                  # play against a tougher AI
ludo --watch -d hard          # demo: four hard AIs play themselves
ludo --load ludo-save.json    # resume a saved game
```

## Saving & resuming

- Press **`s`** at the roll prompt to save to `ludo-save.json` and quit.
- Press **`q`** to quit without saving.
- Pressing **Ctrl-C** mid-game autosaves to `ludo-autosave.json`.
- Resume any save with `ludo --load <file>`.

## Board legend

| Symbol                | Meaning                                        |
|-----------------------|------------------------------------------------|
| `◈`                   | A colour's start square (safe)                 |
| `✦`                   | Star / safe square                             |
| `·`                   | Regular track cell                             |
| `★`                   | Centre goal                                    |
| filled `R` `G` `Y` `B` pill | A token on the board (red, green, yellow, blue) |
| number                | Count when several tokens share a cell         |
| `○` in a yard         | An empty base slot (that token is out on the board) |

## Project structure

```
terminal-ludo/
├── bin/
│   └── ludo.js        # CLI entry point (the `ludo` command)
├── src/
│   ├── constants.js   # board geometry: track, home columns, safe squares
│   ├── game.js        # pure, testable rules engine + save/load
│   ├── ai.js          # heuristic AI with difficulty levels
│   ├── render.js      # ANSI board renderer
│   └── cli.js         # interactive loop, input handling, animation
└── test/
    └── game.test.js   # rule-engine tests (no framework, no deps)
```

The rules live in `src/game.js` as a dependency-free, side-effect-free engine, so
they can be tested and reused independently of the terminal front-end.

## Development

```sh
git clone https://github.com/rohan4naik/CLI-Ludo.git
cd CLI-Ludo
npm test        # run the rule-engine tests
npm start       # run the game
```

There are no build steps and no dependencies to install.

## Contributing

Issues and pull requests are welcome at
[github.com/rohan4naik/CLI-Ludo](https://github.com/rohan4naik/CLI-Ludo).
Please run `npm test` before opening a PR.

## License

[MIT](LICENSE)
