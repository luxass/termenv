/**
 * @internal
 *
 * Reads colors from the `COLORFGBG` environment variable, with the xterm default palette.
 */

import type { TerminalColor } from "./query";

/**
 * Reads a color from `COLORFGBG`, which some terminals set to `foreground;background`, such as `15;0`.
 *
 * Some terminals add a middle field, such as `15;default;0`. The foreground is the first field and the background is the last.
 */
export function parseColorFgBg(
  value: string | undefined,
  layer: "foreground" | "background",
): TerminalColor | undefined {
  if (value?.includes(";") !== true) return undefined;

  const fields = value.split(";");
  const field = layer === "foreground" ? fields[0] : fields.at(-1);
  if (field === undefined || !/^\d{1,3}$/u.test(field)) return undefined;

  return ansi256ToRgb(Number(field));
}

// The default xterm colors for ANSI indexes 0 to 15, as used by muesli/termenv.
const ANSI_16_RGB: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [128, 0, 0],
  [0, 128, 0],
  [128, 128, 0],
  [0, 0, 128],
  [128, 0, 128],
  [0, 128, 128],
  [192, 192, 192],
  [128, 128, 128],
  [255, 0, 0],
  [0, 255, 0],
  [255, 255, 0],
  [0, 0, 255],
  [255, 0, 255],
  [0, 255, 255],
  [255, 255, 255],
];

/**
 * Converts an ANSI 256-color index to the xterm default RGB value.
 */
function ansi256ToRgb(index: number): TerminalColor | undefined {
  if (index > 255) return undefined;

  const ansi16 = ANSI_16_RGB[index];
  if (ansi16 !== undefined) {
    const [red, green, blue] = ansi16;
    return { red, green, blue };
  }

  if (index >= 232) {
    const level = (index - 232) * 10 + 8;
    return { red: level, green: level, blue: level };
  }

  // The 6x6x6 color cube for indexes 16 to 231.
  const cubeIndex = index - 16;
  return {
    red: cubeLevel(Math.floor(cubeIndex / 36)),
    green: cubeLevel(Math.floor(cubeIndex / 6) % 6),
    blue: cubeLevel(cubeIndex % 6),
  };
}

/**
 * Converts a step of the xterm 6x6x6 color cube (0 to 5) to a channel value.
 */
function cubeLevel(step: number): number {
  return step === 0 ? 0 : step * 40 + 55;
}
