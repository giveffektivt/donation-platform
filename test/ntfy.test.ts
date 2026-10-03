import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { logError, logRequestError } from "../src/helpers/ntfy";

const fetchMock = vi.fn<typeof fetch>();

describe("ntfy error notifications", () => {
  beforeEach(() => {
    vi.stubEnv("NTFY_URL", "http://ntfy.example.com/?auth=secret-token");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(AbortSignal, "timeout");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const notification = () => {
    const [url, options] = fetchMock.mock.calls[0];
    return { url, options, body: JSON.parse(options?.body as string) };
  };

  it("publishes informative notifications while preserving auth and stderr logging", async () => {
    const error = new Error("Payment declined");
    await logError("Error charging ID '123'", error);

    const { url, options, body } = notification();
    expect(url).toBe("http://ntfy.example.com/?auth=secret-token");
    expect(options).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "error",
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
    expect(body).toEqual({
      topic: "giveffektivt",
      title: "Giv Effektivt error (production)",
      message: "Error charging ID '123'\n\nError: Payment declined",
      tags: ["warning"],
    });
    expect(console.error).toHaveBeenCalledWith(
      "Error charging ID '123'",
      error,
    );
  });

  it("keeps stderr logging when ntfy is not configured", async () => {
    vi.stubEnv("NTFY_URL", "");
    await logError("Something failed");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("Something failed");
  });

  it("includes only the existing request context allowlist", async () => {
    await logRequestError("api/donation:", new Error("Failed"), {
      donor: { email: "donor@example.com", name: "Private name" },
      id: "donation-id",
      order_id: 42,
      type: "Payment",
      token: "private-token",
      bank_account: "private-account",
    });
    expect(notification().body.message).toBe(
      'api/donation: {"email":"donor@example.com","id":"donation-id","order_id":42,"type":"Payment"}\n\nError: Failed',
    );
  });

  it("formats validation failures without the raw payload", async () => {
    const result = z
      .object({ email: z.email() })
      .safeParse({ email: "private" });
    await logRequestError("Invalid donation:", result.error, null);
    expect(notification().body.message).toContain("Validation failed: email:");
    expect(notification().body.message).not.toContain("private");
  });

  it.each([
    ["Something failed", "Something failed"],
    [{ code: "declined" }, '{"code":"declined"}'],
  ])("formats non-Error details: %j", async (error, expected) => {
    await logError("Failure", error);
    expect(notification().body.message).toBe(`Failure\n\n${expected}`);
  });

  it("handles circular error objects", async () => {
    const error: Record<string, unknown> = {};
    error.self = error;
    await expect(logError("Failure", error)).resolves.toBeUndefined();
    expect(notification().body.message).toBe("Failure\n\n[object Object]");
  });

  it("keeps large Unicode messages within ntfy's message limit", async () => {
    await logError("Failure", "😱".repeat(2000));
    const message = notification().body.message;
    expect(Buffer.byteLength(message)).toBeLessThan(4096);
    expect(message).toContain("Failure");
    expect(message).toContain("[truncated; see server logs]");
  });

  it("waits for notification delivery", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    let completed = false;
    const delivery = logRequestError("Failure", undefined, null).then(() => {
      completed = true;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    finish(new Response(null, { status: 200 }));
    await delivery;
    expect(completed).toBe(true);
  });

  it("uses NODE_ENV when VERCEL_ENV is absent", async () => {
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("NODE_ENV", "development");
    await logError("Failure");
    expect(notification().body.title).toBe("Giv Effektivt error (development)");
  });

  it("does not throw on HTTP failures", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(logError("Failure")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "ntfy notification failed (HTTP 403)",
    );
  });

  it.each([
    new Error("secret-token"),
    new DOMException("Timed out", "TimeoutError"),
  ])(
    "does not throw or expose auth on network failures or timeouts",
    async (error) => {
      fetchMock.mockRejectedValue(error);
      await expect(logError("Failure")).resolves.toBeUndefined();
      expect(console.error).toHaveBeenLastCalledWith(
        "ntfy notification failed (network error or timeout)",
      );
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        "secret-token",
      );
    },
  );
});
