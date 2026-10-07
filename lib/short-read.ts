export function shortRead(text:string,maxWords=45,language='en'):string {
  const clean=text.replace(/\[\d+\]/g,'').replace(/\([^)]*(?:US:|UK:|IPA|pronounced)[^)]*\)/gi,'').replace(/\s+/g,' ').trim();
  const sentences=[...new Intl.Segmenter(language,{granularity:'sentence'}).segment(clean)].map(s=>s.segment.trim());
  let result='';
  for(const sentence of sentences.slice(0,2)) {
    const next=`${result} ${sentence}`.trim();
    if(next.split(/\s+/).length>maxWords) break;
    result=next;
  }
  if(result) return result;
  const words=clean.split(/\s+/);
  return words.length>maxWords ? words.slice(0,maxWords).join(' ').replace(/[,;:]$/,'')+'…' : clean;
}
