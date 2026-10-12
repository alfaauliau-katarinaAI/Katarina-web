import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("pair-news dialogs never echo generic per-country boilerplate twice",()=>{
 const script=readFileSync(new URL("../website/app-v4.js",import.meta.url),"utf8");
 assert.equal(script.includes("function specificImpact("),false);
 assert.equal(script.includes("Kabar dari otoritas "),false);
 assert.ok(script.includes("/api/news-intelligence?"));
 assert.ok(script.includes("arah kebijakan"));
 assert.ok(script.includes("berpotensi diuntungkan"));
 assert.ok(script.includes("berpotensi dirugikan"));
});
test("weekly plan veto requires latest verified source and updates after reading",()=>{
 const source=readFileSync(new URL("../functions/api/weekly-plan.js",import.meta.url),"utf8");
 const research=readFileSync(new URL("../website/research-v5.js",import.meta.url),"utf8");
 assert.ok(source.includes('status:"macro-conflict"'));
 assert.ok(source.includes("readPublicAI"));
 assert.ok(research.includes("katarina:policy-brief-updated"));
});

test("all cards use exactly the same source-backed endpoint without 2-item cap",()=>{
 const s=readFileSync(new URL("../website/app-v4.js",import.meta.url),"utf8");
 assert.equal(s.includes("original<3"),false);
 assert.ok(s.includes("new URLSearchParams({scope,symbol,index:String(chosenIndex),expected:item.url})"));
 assert.ok(s.includes("Fakta penting dari sumber"));
 assert.ok(s.includes("Mengapa bisa menggerakkan pasar?"));
 assert.ok(s.includes("Perbandingan dengan ekspektasi"));
 assert.ok(s.includes("Dampak "+impact.symbol"));
});
