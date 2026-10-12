import test from "node:test";
import assert from "node:assert/strict";
import {onRequestGet} from "../functions/api/news-intelligence.js";
const url="https://katarina-research.pages.dev/api/news-intelligence";
test("one URL must match the current trusted feed index",async()=>{
 const bad=await onRequestGet({request:new Request(url+"?scope=dashboard&index=0"),env:{}});
 assert.equal(bad.status,409);
 assert.equal((await bad.json()).status,"headline-changed");
});
test("cannot inject arbitrary hosts or unbounded indices",async()=>{
 const invalid=await onRequestGet({request:new Request(url+"?scope=dashboard&index=99&expected=https://evil.com/a"),env:{}});
 assert.equal(invalid.status,400);
 const symbol=await onRequestGet({request:new Request(url+"?scope=pair&symbol=INVALID!&index=0&expected=x"),env:{}});
 assert.equal(symbol.status,400);
});
test("explicit unavailable/full-text response is never a fabricated verdict",async()=>{
 const r=await onRequestGet({request:new Request(url+"?index=0&expected=https://example.invalid/x"),env:{}});
 assert.equal(r.status,409);
});
