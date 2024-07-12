# termenv

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

## 📦 Installation

```sh
npm install termenv
```

## 📚 Usage

```ts
import {
  getSupportedLevel,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
  isUnicodeSupported,
} from "termenv";

console.log(getSupportedLevel()); // => 3 | 2 | 1 | 0
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

This package also provides a `browser` export, which tries to detect the color support of the browser environment.

```ts
import {
  ERASE_LINE,
  ERASE_LINE_LEFT,
  ERASE_LINE_RIGHT,
  ERASE_SCREEN,
  ERASE_SCREEN_LEFT,
  ERASE_SCREEN_RIGHT,
  RESET,
  strip
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
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/termenv
[npm-downloads-src]: https://img.shields.io/npm/dm/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/termenv
