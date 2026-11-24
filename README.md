# termenv

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

## 📦 Installation

```sh
npm install termenv
```

Node.js 24.11.0 or later is required. CI also tests the latest Bun 1.1, 1.2, 1.3, and 1.4 releases.

## 📚 Usage

> [!NOTE]
> This package works best in Node.js or Bun. It also works in browser environments.
> Deno is no longer a tested or supported runtime. Its detection remains for compatibility.

```ts
import {
  getColorSpace,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
} from "termenv";
import { isUnicodeSupported } from "termenv/utils";

console.log(getColorSpace()); // => 3 | 2 | 1 | 0
// 3: 24-bit color support (16m colors)
// 2: 8-bit color support (256 colors)
// 1: 4-bit color support (16 colors)
// 0: no color support

console.log(isColorsSupported()); // => true | false
console.log(is16ColorSupported()); // => true | false
console.log(is256ColorSupported()); // => true | false
console.log(isTrueColorSupported()); // => true | false

console.log(isUnicodeSupported()); // => true | false
```

### Utilities

```ts
import {
  ERASE_LINE,
  ERASE_LINE_LEFT,
  ERASE_LINE_RIGHT,
  ERASE_SCREEN,
  ERASE_SCREEN_LEFT,
  ERASE_SCREEN_RIGHT,
  getWindowSize,
  isUnicodeSupported,
  RESET,
  strip,
} from "termenv/utils";

// strip ansi escape codes from a string
console.log(strip("\u001B[31mHello world!\u001B[39m")); // => Hello world!

process.stdout.write(RESET); // reset the terminal
process.stdout.write(ERASE_LINE); // erase the current line
process.stdout.write(ERASE_LINE_LEFT); // erase the line to the left of the cursor
process.stdout.write(ERASE_LINE_RIGHT); // erase the line to the right of the cursor
process.stdout.write(ERASE_SCREEN); // erase the screen
process.stdout.write(ERASE_SCREEN_LEFT); // erase the screen to the left of the cursor
process.stdout.write(ERASE_SCREEN_RIGHT); // erase the screen to the right of the cursor

console.log(isUnicodeSupported()); // => true | false
console.log(getWindowSize()); // => { width: 80, height: 24 }
```

### Cursor, screen, and input sequences

These builders return strings and write nothing, so you choose the output stream.
Counts must be non-negative integers. A count of `0` returns an empty string, because terminals treat `0` as `1`.

```ts
import {
  ALT_SCREEN,
  clearLines,
  cursorUp,
  ENABLE_BRACKETED_PASTE,
  ENABLE_MOUSE_CELL_MOTION,
  ENABLE_MOUSE_EXTENDED_MODE,
  EXIT_ALT_SCREEN,
  HIDE_CURSOR,
  moveCursor,
  SHOW_CURSOR,
} from "termenv/utils";

// full-screen program
process.stdout.write(ALT_SCREEN + HIDE_CURSOR + moveCursor(1, 1));
process.stdout.write(
  ENABLE_MOUSE_CELL_MOTION + ENABLE_MOUSE_EXTENDED_MODE + ENABLE_BRACKETED_PASTE,
);
// ...
process.stdout.write(SHOW_CURSOR + EXIT_ALT_SCREEN);

// redraw a 3-line progress display
process.stdout.write(clearLines(2) + render());
process.stdout.write(cursorUp(2));
```

Also available: `cursorDown`, `cursorForward`, `cursorBack`, `cursorNextLine`, `cursorPrevLine`,
`SAVE_CURSOR_POSITION`, `RESTORE_CURSOR_POSITION`, `insertLines`, `deleteLines`, `changeScrollingRegion`,
`SAVE_SCREEN`, `RESTORE_SCREEN`, the other `ENABLE_MOUSE_*` / `DISABLE_MOUSE_*` modes,
`DISABLE_BRACKETED_PASTE`, `BRACKETED_PASTE_START`, and `BRACKETED_PASTE_END`.

### Hyperlinks, notifications, clipboard, and window title

These builders reject control characters in URLs, titles, and colors, so a value can't end the sequence or inject another one.

```ts
import {
  copyToClipboard,
  hyperlink,
  notify,
  RESET_BACKGROUND_COLOR,
  setBackgroundColor,
  setWindowTitle,
} from "termenv/utils";

console.log(hyperlink("https://github.com/luxass/termenv", "termenv")); // OSC 8
process.stdout.write(notify("Build finished", "0 errors")); // OSC 777
process.stdout.write(copyToClipboard("npm install termenv")); // OSC 52, works over SSH
process.stdout.write(copyToClipboard("text", { primary: true })); // X11 primary selection
process.stdout.write(setWindowTitle("my app")); // OSC 2
process.stdout.write(setBackgroundColor("#1e1e2e")); // OSC 11
process.stdout.write(RESET_BACKGROUND_COLOR); // OSC 111
```

`copyToClipboard` wraps the sequence for GNU screen. Also available: `setForegroundColor`, `setCursorColor`,
`RESET_FOREGROUND_COLOR`, and `RESET_CURSOR_COLOR`.

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/termenv
[npm-downloads-src]: https://img.shields.io/npm/dm/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/termenv
