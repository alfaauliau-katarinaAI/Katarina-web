/* Final source-based impact sanity checks.
 * LLM is responsible for the interpretation; these are veto/qualification rules
 * against unsupported FX directions and contradictory outcomes.
 */
const aliases={
 USD:/\b(?:USD|dollar|greenback|U\.S\. currency|Federal Reserve)\b/i,
 EUR:/\b(?:EUR|euro|ECB|European Central Bank)\b/i,
 GBP:/\b(?:GBP|sterling|British pound|Bank of England)\b/i,
 JPY:/\b(?:JPY|yen|Japanese currency|Bank of Japan)\b/i,
 AUD:/\b(?:AUD|Australian dollar|Reserve Bank of Australia)\b/i,
 CAD:/\b(?:CAD|Canadian dollar|Bank of Canada)\b/i,
 CHF:/\b(?:CHF|Swiss franc|Swiss National Bank)\b/i,
 NZD:/\b(?:NZD|New Zealand dollar|RBNZ)\b/i
};
const same=(a,b)=>String(a||"").trim().toLowerCase().replace(/\s+/g," ")===String(b||"").trim().toLowerCase().replace(/\s+/g," ");
/* Also sanitize cached older reports, which may contain internally
 * contradictory model-generated profit/loss claims.
 */
export function scrubUnsupportedCausalClaims(record){
 const result={...record};
 if(/\b(?:gold|emas)\b/i.test(String(record.title||""))){
  if(/penggunaan emas.*(?:penurunan nilai emas|harga emas turun|nilai emas turun)/i.test(String(result.harms||"")))
   result.harms="Rilis ini belum membuktikan siapa yang langsung dirugikan. Pembeli baru berisiko membayar lebih mahal jika permintaan fisik terus menopang harga.";
  if(/penggunaan emas sebagai tempat aman/i.test(String(result.benefits||"")))
   result.benefits="Pemegang emas berpotensi diuntungkan apabila permintaan fisik menopang harga; pergerakan harga setelah rilis tetap perlu dikonfirmasi.";
 }
 return result;
}

export function auditArticleImpact(analysis,article,item={}){
 const body=String(article||""),title=String(item.title||"");
 const res=scrubUnsupportedCausalClaims({...analysis,title:item.title||analysis.title,marketEffects:(analysis.marketEffects||[]).map(x=>({...x}))});
 if(same(res.benefits,res.harms)){
  res.harms="Pihak yang dirugikan belum dapat dipastikan dari bukti berita yang tersedia.";
 }
 const isTrade=/\b(export|import|trade)\b/i.test(body)&&/\b(China|Chinese)\b/i.test(body)&&/\b(Europe|European|EU)\b/i.test(body);
 const isHybrid=/\b(hybrid|vehicle|car)\b/i.test(body+" "+title);
 if(isTrade&&isHybrid&&/\b(halve|cut|reduc|restrict|curb)\w*\b/i.test(body)){
  if(/belum dapat dipastikan|tidak diketahui/i.test(res.benefits||""))
   res.benefits="Produsen kendaraan di pasar Eropa berpotensi menghadapi persaingan impor yang lebih rendah apabila pembatasan benar-benar diterapkan.";
  if(/belum dapat dipastikan|tidak diketahui/i.test(res.harms||""))
   res.harms="Eksportir kendaraan hibrida China berpotensi kehilangan sebagian akses penjualan ke UE apabila pembatasan diberlakukan.";
 }
 if(/\b(final decision|final approval|requires? approval|subject to approval)\b/i.test(body)&&
  /\b(Brussels|EU|European)\b/i.test(body)){
  const note=" Pelaksanaannya masih memerlukan persetujuan akhir dari pihak Eropa.";
  if(!/\bpersetujuan|approval\b/i.test(res.policyEvidence||""))res.policyEvidence=(res.policyEvidence||"")+note;
  if(!/\bpersetujuan|approval\b/i.test(res.uncertainty||""))res.uncertainty=(res.uncertainty||"")+note;
 }
 if(res.eventType==="COMMENTARY"&&
  res.policyDirection!=="NO_DECISION"&&!/\bcentral bank.{0,90}\b(raised|cut|hiked|lowered|held)\b/i.test(body)){
  res.policyDirection="NO_DECISION";
  res.policyEvidence="Ini merupakan pandangan atau peringatan pihak yang diwawancarai, bukan keputusan baru bank sentral.";
  res.currencyBias="UNKNOWN";
 }
 const hasMonetaryDecision=res.eventType==="DECISION"&&
  ["TIGHTENING","EASING"].includes(res.policyDirection)&&
  ["STRONGER","WEAKER"].includes(res.currencyBias);
 res.marketEffects=res.marketEffects.map(e=>{
  const s=e.symbol||"";
  if(!/^[A-Z]{6}$/.test(s)||s.startsWith("XAU")||s.startsWith("XAG")||s.startsWith("BTC")||
   !aliases[s.slice(0,3)]||!aliases[s.slice(3)]||e.direction==="UNKNOWN"||e.direction==="MIXED")return e;
  const pairHasCurrencyEvidence=aliases[s.slice(0,3)].test(body)&&aliases[s.slice(3)].test(body);
  if(hasMonetaryDecision||pairHasCurrencyEvidence)return e;
  return {...e,direction:"UNKNOWN",
   reason:"Sumber tidak memuat bukti nilai tukar kedua mata uang maupun reaksi "+s+" yang cukup untuk menetapkan arah. Tidak ada kesimpulan BUY atau SELL."};
 });
 return res;
}
