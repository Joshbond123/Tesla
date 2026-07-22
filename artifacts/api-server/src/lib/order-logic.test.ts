import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type OrderResponse,
  buildOrderConfirmationEmail,
  buildVerificationEmail,
  calcEstimatedDelivery,
  defaultTimeline,
  getBaseUrl,
  simulateProgress,
} from "./order-logic.js";

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    orderId: "TSLA-ABCD1234",
    trackingNumber: "TRK-DEADBEEF",
    email: "winner@example.com",
    entryId: "entry-1",
    selectedCar: {},
    deliveryDetails: {},
    deliveryMethod: {},
    paymentMethod: {},
    status: "confirmed",
    orderDate: "2026-01-01T00:00:00.000Z",
    estimatedDelivery: "2026-01-11",
    timeline: defaultTimeline("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("getBaseUrl", () => {
  const ENV_KEYS = ["PUBLIC_BASE_URL", "REPLIT_DOMAINS", "PORT"] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("prefers PUBLIC_BASE_URL and strips a single trailing slash", () => {
    process.env["PUBLIC_BASE_URL"] = "https://tesla.example.com/";
    expect(getBaseUrl()).toBe("https://tesla.example.com");
  });

  it("trims surrounding whitespace on PUBLIC_BASE_URL", () => {
    process.env["PUBLIC_BASE_URL"] = "  https://spaced.example.com  ";
    expect(getBaseUrl()).toBe("https://spaced.example.com");
  });

  it("falls back to the first REPLIT_DOMAINS entry over HTTPS", () => {
    process.env["REPLIT_DOMAINS"] = "first.repl.co, second.repl.co";
    expect(getBaseUrl()).toBe("https://first.repl.co");
  });

  it("uses PORT for the localhost fallback when nothing else is set", () => {
    process.env["PORT"] = "10000";
    expect(getBaseUrl()).toBe("http://localhost:10000");
  });

  it("defaults to port 8080 when PORT is unset", () => {
    expect(getBaseUrl()).toBe("http://localhost:8080");
  });
});

describe("defaultTimeline", () => {
  it("returns six stages with only the first one completed", () => {
    const timeline = defaultTimeline("2026-01-01T00:00:00.000Z");
    expect(timeline).toHaveLength(6);
    expect(timeline.map((t) => t.stage)).toEqual([
      "Order Confirmed",
      "Processing",
      "Shipped",
      "In Transit",
      "Out for Delivery",
      "Delivered",
    ]);
    expect(timeline[0]).toEqual({
      stage: "Order Confirmed",
      timestamp: "2026-01-01T00:00:00.000Z",
      completed: true,
    });
    for (const item of timeline.slice(1)) {
      expect(item.completed).toBe(false);
      expect(item.timestamp).toBeNull();
    }
  });
});

describe("calcEstimatedDelivery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:34:56.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a YYYY-MM-DD date offset by the given number of days", () => {
    expect(calcEstimatedDelivery(10)).toBe("2026-03-20");
    expect(calcEstimatedDelivery(2)).toBe("2026-03-12");
  });

  it("rolls over month boundaries", () => {
    expect(calcEstimatedDelivery(30)).toBe("2026-04-09");
  });
});

describe("simulateProgress", () => {
  const orderDate = "2026-01-01T00:00:00.000Z";

  function progressAfterHours(hours: number) {
    vi.setSystemTime(new Date(new Date(orderDate).getTime() + hours * 3_600_000));
    return simulateProgress(makeOrder({ orderDate }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the order in confirmed state before the first threshold", () => {
    const result = progressAfterHours(0.5);
    expect(result.status).toBe("confirmed");
    expect(result.timeline.filter((t) => t.completed)).toHaveLength(1);
  });

  it.each([
    [2, "processing", 2],
    [25, "shipped", 3],
    [49, "in_transit", 4],
    [73, "out_for_delivery", 5],
    [100, "delivered", 6],
  ])("after %i hours -> status %s with %i completed stages", (hours, status, completed) => {
    const result = progressAfterHours(hours);
    expect(result.status).toBe(status);
    expect(result.timeline.filter((t) => t.completed)).toHaveLength(completed);
  });

  it("stamps advanced stages at their exact threshold offset", () => {
    const result = progressAfterHours(30);
    expect(result.timeline[1]!.timestamp).toBe(
      new Date(new Date(orderDate).getTime() + 1 * 3_600_000).toISOString(),
    );
    expect(result.timeline[2]!.timestamp).toBe(
      new Date(new Date(orderDate).getTime() + 24 * 3_600_000).toISOString(),
    );
  });

  it("does not mutate the input order or its timeline", () => {
    vi.setSystemTime(new Date(new Date(orderDate).getTime() + 100 * 3_600_000));
    const order = makeOrder({ orderDate });
    const snapshot = JSON.parse(JSON.stringify(order));
    simulateProgress(order);
    expect(order).toEqual(snapshot);
  });
});

describe("buildVerificationEmail", () => {
  it("interpolates the recipient name, verify link and entry id", () => {
    const html = buildVerificationEmail("Ada", "https://x.test/api/verify?token=t&email=a%40b.com", "entry-42");
    expect(html).toContain("Hi Ada, you're almost in!");
    expect(html).toContain('href="https://x.test/api/verify?token=t&email=a%40b.com"');
    expect(html).toContain("entry-42");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  });
});

describe("buildOrderConfirmationEmail", () => {
  it("selects the vehicle image matching the car id (case-insensitive)", () => {
    const html = buildOrderConfirmationEmail({ selectedCar: { id: "Cybertruck", name: "Cybertruck" } });
    expect(html).toContain("vehicle-images/cybertruck-main.png");
    expect(html).toContain("Tesla Cybertruck");
  });

  it("falls back to the Model S image for an unknown car id", () => {
    const html = buildOrderConfirmationEmail({ selectedCar: { id: "roadster" } });
    expect(html).toContain("vehicle-images/models-main.png");
  });

  it("applies placeholder fallbacks when order fields are missing", () => {
    const html = buildOrderConfirmationEmail({});
    expect(html).toContain("Tesla Model S");
    expect(html).toContain("Standard Delivery");
    expect(html).toContain("Not specified");
    expect(html).toContain("Retail Value: <strong>—</strong>");
  });

  it("embeds a tracking link with the order id and tracking number", () => {
    const html = buildOrderConfirmationEmail({
      orderId: "TSLA-99",
      trackingNumber: "TRK-77",
      paymentMethod: { name: "Bank Transfer" },
    });
    expect(html).toContain("track.html?order=TSLA-99&tracking=TRK-77");
    expect(html).toContain("Bank Transfer");
  });
});
