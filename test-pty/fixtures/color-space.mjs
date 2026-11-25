// Prints the color space termenv detects for this process's real stdout.
import { getColorSpace } from "../../dist/supports.mjs";

process.stdout.write(
  `RESULT ${JSON.stringify({ colorSpace: getColorSpace(), isTTY: process.stdout.isTTY === true })}\n`,
);
