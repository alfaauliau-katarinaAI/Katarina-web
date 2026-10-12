import test from "node:test";
import assert from "node:assert/strict";
import {headlinePolicy,pairDirection,summarizeMacro,normalizeMarketEffects} from "../lib/macro-policy.js";
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

test("non-FX macro implications are shown but only independent reports can veto a plan",()=>{
 const now=Date.parse("2026-10-12T04:00:00.000Z");
 const x={status:"ai-full-article",basis:"Isi artikel publik dari penerbit",publishedAt:new Date(now-3600000).toISOString(),
  eventType:"MARKET",source:"Official article",title:"Supply disruption pressures crude",url:"https://www.cnbc.com/one",
  marketEffects:[{symbol:"XAUUSD",direction:"UP",reason:"Premi risiko global meningkat dalam skenario laporan."}]};
 const one=summarizeMacro("XAUUSD",[x],now);
 assert.equal(one.crossAssetBias,"UNKNOWN");
 assert.equal(one.crossAsset.length,1);
 const two=summarizeMacro("XAUUSD",[x,{...x,url:"https://www.federalreserve.gov/two",title:"Monetary context confirms risk"}],now);
 assert.equal(two.crossAssetBias,"BUY");
 assert.equal(two.crossAsset.length,2);
 const conflicting=summarizeMacro("XAUUSD",[x,{...x,url:"https://www.federalreserve.gov/two",marketEffects:[{symbol:"XAUUSD",direction:"DOWN",reason:"Yield riil meningkat dan menekan logam tanpa kupon."}]}],now);
 assert.equal(conflicting.crossAssetBias,"CONFLICT");
});

test("validated AI must not invent unsourced numbers even with fast JSON object output",()=>{
 const body="China increased purchases of gold as households sought safety, and the central bank disclosed more reserve buying.";
 const a={eventType:"MARKET",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
 summary:"Permintaan emas dari rumah tangga di China meningkat karena mencari tempat menyimpan kekayaan.",
 policyEvidence:"Ini adalah laporan permintaan dan bukan keputusan suku bunga.",
 benefits:"Produsen emas berpotensi diuntungkan jika kenaikan permintaan bertahan.",
 harms:"Pengguna emas sebagai bahan baku menghadapi biaya yang berpotensi lebih tinggi.",
 watch:"Pantau rilis pembelian resmi dan harga fisik emas.",
 uncertainty:"Besarnya dampak terhadap harga dunia belum diketahui.",
 sourceQuote:"China increased purchases of gold as households sought safety",
 keyFacts:["China increased purchases of gold as households sought safety"],
 marketEffects:[{symbol:"XAUUSD",direction:"UP",reason:"Permintaan fisik dapat menambah dukungan pada pasar emas."}],
 macroMechanism:"Pembelian emas dapat meningkatkan permintaan fisik dunia."};
 assert.equal(parseBrief({response:a},body)?.marketEffects?.[0]?.symbol,"XAUUSD");
 assert.equal(parseBrief({response:{...a,summary:"China purchased 9000 tonnes despite no data."}},body),null);
});

test("opposing effects on the same asset are reported MIXED, never contradictory",()=>{
 const mixed=normalizeMarketEffects([
  {symbol:"XAUUSD",direction:"UP",reason:"Permintaan fisik bank sentral China menopang emas."},
  {symbol:"XAUUSD",direction:"DOWN",reason:"Kenaikan yield riil dapat menekan harga."},
  {symbol:"NASDAQ",direction:"DOWN",reason:"Tekanan valuasi dari yield obligasi tinggi."}
 ]);
 assert.equal(mixed.length,2);
 assert.equal(mixed.find(x=>x.symbol==="XAUUSD").direction,"MIXED");
 assert.ok(mixed.find(x=>x.symbol==="XAUUSD").reason.includes("yield"));
});

test("a written half in source supports equivalent 50 percent but not invented amounts",()=>{
 const body="Officials have agreed to halve vehicle shipments next year, while the final endorsement is still required.";
 const data={eventType:"COMMENTARY",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
 summary:"Pejabat mengatakan pengiriman kendaraan akan dibatasi hingga setengah, tetapi masih menunggu persetujuan.",
 policyEvidence:"Belum menjadi keputusan akhir karena pihak berwenang harus menyetujuinya.",
 benefits:"Produsen di kawasan tujuan berpotensi menghadapi persaingan impor lebih rendah.",
 harms:"Eksportir kendaraan bisa kehilangan peluang penjualan di pasar tujuan.",
 watch:"Pantau persetujuan otoritas dan jadwal penerapan pembatasan tersebut.",
 uncertainty:"Volume rujukan dan waktu pelaksanaan tetap belum diketahui.",
 sourceQuote:"Officials have agreed to halve vehicle shipments next year",
 macroMechanism:"Pembatasan volume ekspor mengubah tekanan persaingan di pasar tujuan.",
 keyFacts:["The final endorsement is still required."],
 marketEffects:[{symbol:"EURUSD",direction:"UNKNOWN",reason:"Dampak terhadap kurs tidak langsung dan belum cukup data."}]};
 assert.ok(parseBrief({response:{...data,summary:data.summary+" 50%."}},body));
 assert.equal(parseBrief({response:{...data,summary:data.summary+" 75%."}},body),null);
});

test("AI report with missing opinion-specific optional fields stays source-grounded",()=>{
 const body="EU Trade Commissioner said China agreed to halve hybrid exports, with final approval still needed in Brussels. Talks addressed commercial relations.";
 const record={eventType:"COMMENTARY",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
  summary:"Pejabat Uni Eropa menyampaikan kesepahaman pengurangan ekspor mobil hybrid, tetapi persetujuan akhir masih dibutuhkan.",
  policyEvidence:"Persetujuan akhir dari otoritas Brussels masih diperlukan.",
  sourceQuote:"EU Trade Commissioner said China agreed to halve hybrid exports"};
 const result=parseBrief({response:record},body);
 assert.ok(result);
 assert.equal(result.eventType,"COMMENTARY");
 assert.equal(result.benefits,"Pihak yang diuntungkan belum dapat dipastikan dari teks berita.");
 assert.equal(result.keyFacts.length,1);
 assert.equal(result.keyFacts[0],result.sourceQuote);
});

test("if AI cites CNBC boilerplate, the selected evidence is a real article sentence",()=>{
 const body="BEIJING — The EU trade commissioner said China agreed to halve hybrid exports. Brussels must still approve the arrangement.\nData is a real-time snapshot *Data is delayed at least 15 minutes. Global Business and Financial News, Stock Quotes, and Market Data and Analysis.";
 const a={eventType:"COMMENTARY",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
 summary:"Komisioner perdagangan Uni Eropa menyebut adanya kesepahaman pembatasan ekspor hybrid China, masih menunggu persetujuan.",
 policyEvidence:"Belum berlaku sampai otoritas Brussels menyetujui langkah berikutnya.",
 sourceQuote:"Data is a real-time snapshot *Data is delayed at least 15 minutes."};
 const result=parseBrief({response:a},body);
 assert.ok(result);
 assert.ok(result.sourceQuote.startsWith("BEIJING"));
 assert.ok(!result.sourceQuote.includes("Data is a real-time snapshot"));
});
