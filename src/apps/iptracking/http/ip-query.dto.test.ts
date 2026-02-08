import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIpQuery } from "./ip-query.dto";

describe("parseIpQuery", () => {
  it("should parse valid IPs and reject invalid ones", () => {
    const cases = [
      { ip: undefined, ok: false },
      { ip: null, ok: false },
      { ip: "", ok: false },
      { ip: "   ", ok: false },
      { ip: "-", ok: false },
      { ip: "....", ok: false },
      { ip: "---", ok: false },
      { ip: "0.0.0", ok: false },
      { ip: "0.0.0.0.0", ok: false },
      { ip: "256.256.256.256", ok: true },
      { ip: "8.8.8.8", ok: true },
      { ip: "  8.8.8.8  ", ok: true },
    ];

    for (const c of cases) {
      const result = parseIpQuery(c.ip);
      assert.equal(result.ok, c.ok, `ip=${String(c.ip)}`);

      if (result.ok) {
        assert.equal(typeof result.value.ipId, "number");
        assert.equal(result.value.ip, String(c.ip).trim());
      } else {
        assert.equal(typeof result.error, "string");
        assert.ok(result.error.length > 0);
      }
    }
  });

  it("should reject random junk", () => {
    for (let i = 0; i < 200; i++) {
      const junk = Math.random().toString(36).repeat(3);
      const r = parseIpQuery(junk);
      assert.equal(r.ok, false);
    }
  });
});
