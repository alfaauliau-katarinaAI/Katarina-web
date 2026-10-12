import test from "node:test";
import assert from "node:assert/strict";
import {headlinePolicy,pairDirection,summarizeMacro} from "../lib/macro-policy.js";
import {parseBrief} from "../functions/api/policy-brief.js";
const now=Date.parse("2026-10-12T04:00:00Z");
test("two Japanese report headings do NOT imply BOJ tightening or AUDJPY sell",()=>{
 for(const title of ["Output Gap, Potential Growth Rate, and Labor Market Indicators","Japanese Government Bonds Held by the Bank of Japan"]){
  const r=headlinePolicy({title,market:"JPY"});
  assert.equal(r.policyDirection,"NO_DECISION");assert.equal(r.currencyBias,"UNKNOWN");assert.equal(pairDirection("AUDJPY",r.currency,r.currencyBias),"UNKNOWN");
 }
});
test("currency effect correct and only explicit decision titles count",()=>{
 assert.equal(headlinePolicy({title:"Bank of Japan raises interest rates",market:"JPY"}).currencyBias,"STRONGER");
 assert.equal(headlinePolicy({title:"Bank of Japan may raise interest rates",market:"JPY"}).currencyBias,"UNKNOWN");
 assert.equal(pairDirection("AUDJPY","JPY","STRONGER"),"SELL");
 assert.equal(pairDirection("AUDJPY","JPY","WEAKER"),"BUY");
 assert.equal(pairDirection("XAUUSD","USD","STRONGER"),"UNKNOWN");
});
test("no plan override from title-only evidence or old reports",()=>{
 const rec={status:"ai-full-article",basis:"Isi artikel publik dari penerbit",url:"https://www.boj.or.jp/example",title:"Actual policy decision",currency:"JPY",currencyBias:"STRONGER",policyDirection:"TIGHTENING",summary:"Decision",publishedAt:new Date(now-3600000).toISOString()};
 const a=summarizeMacro("AUDJPY",[{...rec,status:"headline-only"},rec],now);
 assert.equal(a.bias,"SELL");assert.equal(a.verifiedCount,1);
 assert.equal(summarizeMacro("AUDJPY",[{...rec,publishedAt:"2026-10-01T00:00:00Z"}],now).bias,"UNKNOWN");
});
test("AI output requires actual excerpt and verified numbers",()=>{
 const body="Bank of Japan decided to hold its policy rate unchanged during the meeting and disclosed additional evidence.";
 const a={eventType:"DECISION",policyDirection:"HOLD",currencyBias:"NEUTRAL",
 summary:"Bank sentral memutuskan mempertahankan tingkat bunga kebijakan yang sudah berlaku.",
 policyEvidence:"Pernyataan resmi memastikan tidak terjadi perubahan tingkat bunga pada rapat terakhir.",
 benefits:"Tidak ada satu aset yang terbukti memperoleh keuntungan langsung dari keputusan tersebut.",
 harms:"Tidak ada aset tertentu yang terbukti dirugikan hanya dengan informasi yang tersedia.",
 watch:"Pantau komunikasi pada pertemuan berikutnya dan harga obligasi pemerintah.",
 uncertainty:"Tanpa data ekspektasi pasar dampak bersih belum bisa ditentukan secara pasti.",
 sourceQuote:"Bank of Japan decided to hold its policy rate unchanged during the meeting"};
 assert.equal(parseBrief({response:JSON.stringify(a)},body).policyDirection,"HOLD");
 assert.ok(body.includes(parseBrief({response:JSON.stringify({...a,sourceQuote:"An invented quote unrelated to article"})},body).sourceQuote));
 assert.equal(parseBrief({response:JSON.stringify({...a,summary:"Bank sentral menaikkan suku bunga menjadi 3.75% tanpa bukti."})},body),null);
});

test("headline currency mapping only uses unambiguous country signals",()=>{
 const a=headlinePolicy({title:"Bank of Japan gives monetary-policy commentary"});
 assert.equal(a.currency,"JPY");
 assert.equal(a.currencyBias,"UNKNOWN");
 const b=headlinePolicy({title:"Federal Reserve may cut policy interest rates"});
 assert.equal(b.currency,"USD");
 assert.equal(b.currencyBias,"UNKNOWN");
 const c=headlinePolicy({title:"EUR and GBP inflation outlook mixed"});
 assert.equal(c.currency,null);
});

test("missing model sourceQuote is replaced ONLY by a real publisher excerpt",()=>{
 const body="Bank of Japan publishes latest data about government bond holdings and related historical series. The article clarifies the reporting period.";
 const a={eventType:"STATISTICS",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
 summary:"Publikasi memuat data historis kepemilikan obligasi pemerintah Jepang.",
 policyEvidence:"Dokumen hanya memuat pengumuman statistik, tidak memutuskan suku bunga.",
 benefits:"Tidak ada keuntungan teridentifikasi dari rilis statistik ini.",
 harms:"Tidak ada kerugian teridentifikasi langsung dari rilis statistik ini.",
 watch:"Pantau rilis rapat kebijakan aktual dari Bank of Japan.",
 uncertainty:"Tidak tersedia konteks reaksi pasar langsung."};
 const r=parseBrief({response:JSON.stringify(a)},body);
 assert.equal(r.sourceQuote,body.slice(0,150));
 assert.ok(body.includes(r.sourceQuote));
});
