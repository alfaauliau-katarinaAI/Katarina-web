import test from "node:test";
import assert from "node:assert/strict";
import {auditArticleImpact,scrubUnsupportedCausalClaims} from "../lib/analysis-guard.js";
test("hybrid China-EU deal must not invent GBPUSD or EURUSD direction",()=>{
 const body="BEIJING — European trade commissioner said China agreed to halve its exports of hybrid cars to the bloc. The final decision still needs Brussels approval. The ministers held bilateral talks.";
 const a=auditArticleImpact({eventType:"COMMENTARY",policyDirection:"NO_DECISION",currencyBias:"UNKNOWN",
  policyEvidence:"China setuju memangkas ekspor kendaraan",benefits:"Pihak yang diuntungkan belum dapat dipastikan dari teks berita.",
  harms:"Pihak yang dirugikan belum dapat dipastikan dari teks berita.",uncertainty:"Rincian belum tersedia.",
  marketEffects:[{symbol:"EURUSD",direction:"DOWN",reason:"Kurs turun karena berita perdagangan"},{symbol:"GBPUSD",direction:"DOWN",reason:"Sentimen kurs negatif"}]},
  body,{title:"China and Europe agree to cut Chinese hybrid exports by half"});
 assert.equal(a.marketEffects[0].direction,"UNKNOWN");
 assert.equal(a.marketEffects[1].direction,"UNKNOWN");
 assert.ok(a.benefits.includes("Produsen kendaraan"));
 assert.ok(a.harms.includes("Eksportir"));
 assert.ok(a.policyEvidence.includes("persetujuan"));
});
test("identical winners and losers cannot be published",()=>{
 const a=auditArticleImpact({eventType:"MARKET",policyDirection:"NO_DECISION",benefits:"PBOC and Chinese households",harms:"PBOC and Chinese households",marketEffects:[{symbol:"XAUUSD",direction:"MIXED",reason:"Permintaan naik tetapi yield juga meningkat"}]},"China has bought gold for many months.",{title:"China gold imports"});
 assert.notEqual(a.harms,a.benefits);
 assert.equal(a.marketEffects[0].direction,"MIXED");
});
test("Dalio commentary is not a new rate decision",()=>{
 const a=auditArticleImpact({eventType:"COMMENTARY",policyDirection:"TIGHTENING",currencyBias:"STRONGER",policyEvidence:"Rates will rise",benefits:"",harms:"",marketEffects:[{symbol:"US500",direction:"DOWN",reason:"Bond yields pressure valuations"}]},"Investor Ray Dalio warned stocks may face pressure from bond yields.",{title:"Ray Dalio warning"});
 assert.equal(a.policyDirection,"NO_DECISION");
 assert.equal(a.marketEffects[0].direction,"DOWN");
});

test("cached gold article may not claim that gold demand mechanically reduces its value",()=>{
 const x=scrubUnsupportedCausalClaims({title:"Why China is importing a record amount of gold",benefits:"Penggunaan emas sebagai tempat aman oleh masyarakat Cina",harms:"Penggunaan emas yang berlebihan dapat menyebabkan penurunan nilai emas"});
 assert.ok(x.benefits.includes("berpotensi"));
 assert.ok(!x.harms.includes("penggunaan emas yang berlebihan"));
 assert.ok(x.harms.includes("belum membuktikan"));
});
