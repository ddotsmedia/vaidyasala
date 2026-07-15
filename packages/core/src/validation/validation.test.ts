import { describe, expect, it } from "vitest";
import { analyticsEventSchema, cursorPageSchema } from "./index";

describe("cursorPageSchema", () => {
  it("defaults limit to 20 and coerces string limits", () => {
    expect(cursorPageSchema.parse({})).toEqual({ limit: 20 });
    expect(cursorPageSchema.parse({ limit: "10" }).limit).toBe(10);
  });

  it("rejects limits above 50", () => {
    expect(cursorPageSchema.safeParse({ limit: 100 }).success).toBe(false);
  });
});

describe("analyticsEventSchema", () => {
  it("accepts a named event with props", () => {
    const parsed = analyticsEventSchema.parse({ name: "play", props: { videoId: "abc" } });
    expect(parsed.name).toBe("play");
  });

  it("rejects an empty name", () => {
    expect(analyticsEventSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
