import { describe, expect, it } from "vitest";
import { VideoStatus } from "@vaidyasala/db";
import { parseDuration, promotionFor } from "./import";

const YT = new Date("2023-03-06T04:22:52Z");
const base = { publish: true, existingPublishedAt: null, ytPublishedAt: YT };

describe("parseDuration", () => {
  it("parses hours, minutes and seconds", () => {
    expect(parseDuration("PT5M52S")).toBe(352);
    expect(parseDuration("PT1H2M3S")).toBe(3723);
    expect(parseDuration("PT45S")).toBe(45);
    expect(parseDuration("PT2H")).toBe(7200);
  });

  it("returns 0 for anything unparseable rather than NaN", () => {
    expect(parseDuration("")).toBe(0);
    expect(parseDuration("garbage")).toBe(0);
  });
});

describe("promotionFor", () => {
  it("promotes an INGESTING row when --publish is passed", () => {
    expect(promotionFor(VideoStatus.INGESTING, base)).toEqual({
      status: VideoStatus.PUBLISHED,
      publishedAt: YT,
    });
  });

  it("does nothing without --publish", () => {
    expect(promotionFor(VideoStatus.INGESTING, { ...base, publish: false })).toEqual({});
  });

  it("never overrides an editor's HIDDEN decision", () => {
    expect(promotionFor(VideoStatus.HIDDEN, base)).toEqual({});
  });

  it("leaves a mid-pipeline PROCESSING video alone", () => {
    expect(promotionFor(VideoStatus.PROCESSING, base)).toEqual({});
  });

  it("does not re-publish an already PUBLISHED video", () => {
    // Re-publishing would reset publishedAt and reorder /latest on every run.
    expect(promotionFor(VideoStatus.PUBLISHED, base)).toEqual({});
  });

  it("ignores a brand-new row — creation sets status directly", () => {
    expect(promotionFor(null, base)).toEqual({});
  });

  it("keeps an existing publishedAt rather than overwriting it", () => {
    const earlier = new Date("2020-01-01T00:00:00Z");
    expect(
      promotionFor(VideoStatus.INGESTING, { ...base, existingPublishedAt: earlier }),
    ).toEqual({ status: VideoStatus.PUBLISHED, publishedAt: earlier });
  });
});
