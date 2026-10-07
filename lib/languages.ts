// A language is added here and in messages.ts. All selectors and Wikipedia
// endpoints are derived from this catalog; raw language input never becomes a host.
export const LANGUAGES={
  en:{name:'English',nativeName:'English',direction:'ltr',wikipediaHost:'en.wikipedia.org',wikidataSite:'enwiki',overview:'Overview',defaultTopic:'Bioluminescence',summaryLanguage:'simple everyday English',anchors:{Nature:'Ecology',Science:'Science',Animals:'Animal',History:'History',Places:'Geography',Culture:'Culture',Art:'Art',Mathematics:'Mathematics',Games:'Game',Technology:'Technology',Music:'Music',Space:'Astronomy'}},
  ar:{name:'Arabic',nativeName:'العربية',direction:'rtl',wikipediaHost:'ar.wikipedia.org',wikidataSite:'arwiki',overview:'نظرة عامة',defaultTopic:'ضيائية حيوية',summaryLanguage:'clear, simple Modern Standard Arabic',anchors:{Nature:'علم البيئة',Science:'علم',Animals:'حيوان',History:'تاريخ',Places:'جغرافيا',Culture:'ثقافة',Art:'فن',Mathematics:'رياضيات',Games:'لعبة',Technology:'تقنية',Music:'موسيقى',Space:'علم الفلك'}},
} as const;
export type Language=keyof typeof LANGUAGES;
export const DEFAULT_LANGUAGE:Language='en';
export function isLanguage(value:unknown):value is Language{return typeof value==='string' && Object.hasOwn(LANGUAGES,value);}
export function articleLanguage(article:{language?:Language;url?:string}):Language{
  if(isLanguage(article.language))return article.language;
  try{const host=new URL(article.url || '').hostname;return (Object.keys(LANGUAGES) as Language[]).find(code=>LANGUAGES[code].wikipediaHost===host) || DEFAULT_LANGUAGE;}catch{return DEFAULT_LANGUAGE;}
}
export function articleKey(article:{pageId:number;language?:Language;url?:string}){return `${articleLanguage(article)}:${article.pageId}`;}
