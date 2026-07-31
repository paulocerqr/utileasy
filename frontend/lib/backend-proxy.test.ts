import assert from "node:assert/strict"

import { buildBackendHeaders } from "./backend-proxy.ts"

const forgedHeaders = new Headers({
  "cf-connecting-ip": "203.0.113.90",
  forwarded: "for=203.0.113.91",
  host: "attacker.example",
  "true-client-ip": "203.0.113.92",
  "x-forwarded-for": "203.0.113.93, 172.18.0.2",
  "x-forwarded-host": "utileasy.com.br",
  "x-forwarded-proto": "https",
  "x-real-ip": "198.51.100.20",
})

const untrusted = buildBackendHeaders(forgedHeaders, false)
for (const header of [
  "cf-connecting-ip",
  "forwarded",
  "host",
  "true-client-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]) {
  assert.equal(untrusted.get(header), null)
}

const trusted = buildBackendHeaders(forgedHeaders, true)
assert.equal(trusted.get("x-real-ip"), "198.51.100.20")
assert.equal(trusted.get("x-forwarded-for"), "198.51.100.20")
assert.equal(trusted.get("x-forwarded-host"), null)
assert.equal(trusted.get("x-forwarded-proto"), "https")
assert.equal(trusted.get("cf-connecting-ip"), null)
assert.equal(trusted.get("forwarded"), null)
assert.equal(trusted.get("true-client-ip"), null)

const invalid = buildBackendHeaders(
  {
    "x-forwarded-for": "203.0.113.93",
    "x-forwarded-proto": "javascript",
    "x-real-ip": "198.51.100.20, 203.0.113.93",
  },
  true,
)
assert.equal(invalid.get("x-real-ip"), null)
assert.equal(invalid.get("x-forwarded-for"), null)
assert.equal(invalid.get("x-forwarded-proto"), null)
