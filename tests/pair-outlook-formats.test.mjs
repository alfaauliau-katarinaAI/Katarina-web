import test from "node:test";
import assert from "node:assert/strict";
import {onRequestGet} from "../functions/api/pair-outlook.js";
import {modelText} from "../lib/ai-router.js";
const timestamp=Date.UTC(2026,9,12)/1000;
const bars=Array.from({length:45},(_,i)=>{
 const close=3900+i*2;
 return [timestamp-(45-i)*14400,close-3,close+8,close-9,close];
});
const base="https://katarina-research.pages.dev";
const source={
 "/market-ohlc.json":{series:{xau:{bars}}},
 "/instrument-context.json":{instruments:[{id:"XAUUSD",label:"Emas",chart:"xau",drivers:["suku bunga The Fed","dolar AS"]}]},
 "/calendar-brief.json":{events:[]}
};
const modelResponse={
 summary:"Ringkasan berdasarkan harga historis XAUUSD saja.",
 drivers:"Dolar AS dan kebijakan Fed merupakan faktor yang perlu dipantau.",
 upside:"Harga perlu bertahan di atas resistensi untuk skenario naik.",
 downside:"Harga turun melewati support akan mengubah skenario.",
 watch:"Pantau penutupan H4 berikutnya dan berita resmi.",
 uncertainty:"Harga acuan bukan live dan perubahan harga tidak pasti."
};
function fakeEnv(output){
 return {
  ASSETS:{fetch:async request=>new Response(JSON.stringify(source[new URL(request.url).pathname]),{status:200})},
  AI:{run:async()=>output}
 };
}
test("Cloudflare object JSON mode is accepted, fields preserved",async()=>{
 const response=await onRequestGet({request:new Request(base+"/api/pair-outlook?symbol=XAUUSD"),env:fakeEnv({response:modelResponse})});
 const value=await response.json();
 assert.equal(response.status,200);
 assert.equal(value.status,"ready");
 assert.equal(value.summary,modelResponse.summary);
 assert.equal(value.fallbackUsed,false);
 assert.equal(modelText({response:modelResponse}),JSON.stringify(modelResponse));
});
test("Cloudflare chat completion response accepted",async()=>{
 const response=await onRequestGet({request:new Request(base+"/api/pair-outlook?symbol=XAUUSD"),env:fakeEnv({choices:[{message:{content:JSON.stringify(modelResponse)}}]})});
 const value=await response.json();
 assert.equal(response.status,200);
 assert.equal(value.summary,modelResponse.summary);
});
test("malformed AI response fails closed",async()=>{
 const response=await onRequestGet({request:new Request(base+"/api/pair-outlook?symbol=XAUUSD"),env:fakeEnv({response:{incomplete:"No validated scenario"}})});
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,"validation-failed");
});
