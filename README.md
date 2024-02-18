# termenv

## 📦 Installation

```sh
npm install termenv
```

## 📚 Usage

```ts
import {
  getSupportedColorMode,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported
} from "termenv";

console.log(getSupportedColorMode()); // => "truecolor" | "256color" | "16color" | "none"
console.log(isColorsSupported()); // => true | false
console.log(is16ColorSupported()); // => true | false
console.log(is256ColorSupported()); // => true | false
console.log(isTrueColorSupported()); // => true | false
```

This package also provides a `browser` export, which tries to detect the color support of the browser environment.

## 📄 License

Published under [MIT License](./LICENSE).
