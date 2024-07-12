import { describe, expect, it } from "vitest";
import { strip } from "../src/utils";

describe("strip", () => {
  it("should strip ANSI escape codes from the input string", () => {
    const input = "\x1B[31mHello\x1B[0m, \x1B[32mworld\x1B[0m!";
    const expected = "Hello, world!";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle empty input string", () => {
    const input = "";
    const expected = "";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle input string without any ANSI escape codes", () => {
    const input = "Hello, world!";
    const expected = "Hello, world!";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle input string with multiple ANSI escape codes", () => {
    const input = "\x1B[31mHello\x1B[0m, \x1B[32mworld\x1B[0m! \x1B[33mHow\x1B[0m are \x1B[34myou\x1B[0m?";
    const expected = "Hello, world! How are you?";
    const result = strip(input);
    expect(result).toEqual(expected);
  });
});
