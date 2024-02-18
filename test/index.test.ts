import process from "node:process";

import tty from "node:tty";
import { beforeEach, describe, expect, it } from "vitest";
import { getSupportedLevel } from "../src";

// const ORIGINAL_TTY = tty.isatty;

beforeEach(() => {
  process.stdout.isTTY = true;
  process.argv = [];
  process.env = {};
  tty.isatty = () => true;
});

describe("get supported color mode", () => {
  it("should return `0` if NO_COLOR is in env", () => {
    process.env = {
      NO_COLOR: "1",
    };

    expect(getSupportedLevel()).toBe(0);
  });

  it("should return `0` if --no-color is in argv", () => {
    process.argv.push("--no-color");
    expect(getSupportedLevel()).toBe(0);
  });

  it("should return `3` if FORCE_COLOR is in env", () => {
    process.env = {
      FORCE_COLOR: "1",
    };

    expect(getSupportedLevel()).toBe(3);
  });

  it("should return `3` if --color is in argv", () => {
    process.argv.push("--color");
    expect(getSupportedLevel()).toBe(3);
  });

  it("return false if `CI` is in env", async () => {
    process.env = {
      CI: "1",
    };

    expect(getSupportedLevel()).toBe(0);
  });

  it("return true if `TRAVIS` is in env", async () => {
    process.env = {
      CI: "true",
      TRAVIS: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return true if `CIRCLECI` is in env", async () => {
    process.env = {
      CI: "true",
      CIRCLECI: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return true if `APPVEYOR` is in env", async () => {
    process.env = {
      CI: "true",
      APPVEYOR: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return true if `GITLAB_CI` is in env", async () => {
    process.env = {
      CI: "true",
      GITLAB_CI: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return true if `BUILDKITE` is in env", async () => {
    process.env = {
      CI: "true",
      BUILDKITE: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return true if `DRONE` is in env", async () => {
    process.env = {
      CI: "true",
      DRONE: "true",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return level 3 if `GITEA_ACTIONS` is in env", async () => {
    process.env = {
      CI: "true",
      GITEA_ACTIONS: "true",
    };

    expect(getSupportedLevel()).toBe(3);
  });

  it("return true if Codeship is in env", async () => {
    process.env = {
      CI: "true",
      CI_NAME: "codeship",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return false if `TEAMCITY_VERSION` is in env and is < 9.1", async () => {
    process.env = {
      TEAMCITY_VERSION: "9.0.5 (build 32523)",
    };

    expect(getSupportedLevel()).toBe(0);
  });

  it("return true if `TEAMCITY_VERSION` is in env and is a newer release", async () => {
    process.env = {
      TEAMCITY_VERSION: "2023.11.3 (build 147512)",
    };

    expect(getSupportedLevel()).toBe(1);
  });

  it("return level 1 if `TEAMCITY_VERSION` is in env and is >= 9.1", async () => {
    process.env = {
      TEAMCITY_VERSION: "9.1.0 (build 32523)",
    };

    expect(getSupportedLevel()).toBe(1);
  });
});
