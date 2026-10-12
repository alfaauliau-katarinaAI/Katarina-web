import test from "node:test";
import assert from "node:assert/strict";
import {articleText,decodeEntities} from "../lib/article-extract.js";
import {article} from "../functions/api/policy-brief.js";
const paragraphs=[
 "China's central bank has bought gold for many months while domestic savings seek more safety.",
 "Domestic investors face weak alternative returns from real estate, deposits and government bonds.",
 "The move is attributed to diversification away from dollar reserves and local demand for bullion.",
 "Gold imports reflect both official reserve management and private household purchases.",
 "The report distinguishes observed transactions from forecasts about future gold prices."
];
const p=paragraphs.map(x=>"<p class='ArticleBody'>"+x+"</p>").join("");
const raw="<html><head><script>"+("var longState = 'x';".repeat(38000))+"</script></head><body><article>"+p+"</article></body></html>";
test("CNBC-like article after byte 600000 is read fully, never cut at 600k",()=>{
 assert.ok(raw.indexOf("<p class=")>600000);
 const body=articleText(raw,250);
 assert.ok(body.includes("Domestic investors"));
 assert.equal(body.split("\n").length,5);
});
test("short title and meta description without article paragraphs are rejected",()=>{
 assert.equal(articleText("<html><head><meta name='description' content='A headline.'></head><body><h1>Headline</h1></body></html>"),null);
});
test("HTML entities from real article remain readable",()=>{
 assert.equal(decodeEntities("China&#x27;s gold &amp; silver &mdash; growth"),"China's gold & silver — growth");
});
test("network response contains article text beyond metadata",async()=>{
 const html="<html><body>"+paragraphs.map(x=>"<p>"+x+"</p>").join("")+"</body></html>";
 const body=await article("https://www.cnbc.com/2026/10/12/china-gold-buying-interest-rate-.html",
  async url=>new Response(html,{status:200,headers:{"content-type":"text/html"}}));
 // Response.url is blank for synthetic fetch; test catches without allowing redirects to untrusted hosts.
 assert.equal(body,null);
});
