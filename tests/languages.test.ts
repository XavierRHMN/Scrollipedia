import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGES,isLanguage,articleLanguage,articleKey} from '../lib/languages';
import {MESSAGES,translate} from '../lib/messages';
import {exploreUrl} from '../lib/trail';
import {rememberTopic,knownClientTopic,clearTopicMemory} from '../lib/topic-client';
import {shortRead} from '../lib/short-read';
import {validFeedProfile} from '../lib/feed-profile';

test('registered languages have complete translations and reject arbitrary API hosts',()=>{
  for(const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]){
    assert.deepEqual(Object.keys(MESSAGES[language]).sort(),Object.keys(MESSAGES.en).sort());
    assert.ok(Object.values(MESSAGES[language]).every(text=>text.trim().length>0));
    assert.ok(LANGUAGES[language].wikipediaHost.endsWith('.wikipedia.org'));
  }
  for(const value of ['__proto__','https://evil.test','ar.wikipedia.org',null,42])assert.equal(isLanguage(value),false);
  assert.equal(translate('ar','Explore connections for {title}',{title:'تسارع'}),'استكشف روابط تسارع');
  assert.equal(translate('bn','Explore connections for {title}',{title:'ত্বরণ'}),'ত্বরণ-এর সম্পর্ক অন্বেষণ করুন');
});

test('cross-language IDs, URLs and client caches remain separate',()=>{
  clearTopicMemory();
  const english={pageId:1,title:'Test',extract:'English text.',url:'https://en.wikipedia.org/wiki/Test'};
  const arabic={...english,extract:'نص عربي.',language:'ar' as const,url:'https://ar.wikipedia.org/wiki/Test'};
  assert.notEqual(articleKey(english),articleKey(arabic));
  assert.equal(articleLanguage(english),'en');
  assert.equal(articleLanguage({...arabic,language:undefined}),'ar');
  for(const article of [english,arabic])rememberTopic({article,sections:[{title:'Overview',content:article.extract}],related:[],organized:false});
  assert.equal(knownClientTopic('Test','en')?.article.extract,'English text.');
  assert.equal(knownClientTopic('Test','ar')?.article.extract,'نص عربي.');
  assert.equal(exploreUrl('تسارع',[],'ar'),'/explore/%D8%AA%D8%B3%D8%A7%D8%B1%D8%B9?lang=ar');
  assert.ok(exploreUrl('Test',[english,arabic],'ar').endsWith('&lang=ar'));
});

test('Arabic short reads and negative preferences retain their bounds',()=>{
  assert.equal(shortRead('التسارع هو تغير السرعة. يقاس مع مرور الزمن. هذه جملة ثالثة.',45,'ar'),'التسارع هو تغير السرعة. يقاس مع مرور الزمن.');
  assert.ok(shortRead(Array(80).fill('موضوع').join(' '),45,'ar').split(/\s+/).length<=45);
  assert.equal(validFeedProfile({interests:[],saved:[],explored:[],disliked:['Astronomy']}),true);
  assert.equal(validFeedProfile({interests:[],saved:[],explored:[],disliked:Array(9).fill('Astronomy')}),false);
  assert.equal(validFeedProfile({interests:[],saved:[],explored:[],disliked:['bad|title']}),false);
});

test('Bangla article identity, routes and sentence boundaries use the registered language',()=>{
  const article={pageId:1,title:'ত্বরণ',extract:'ত্বরণ হলো বেগের পরিবর্তন। সময়ের সঙ্গে বেগ বদলায়। এটি তৃতীয় বাক্য।',url:'https://bn.wikipedia.org/wiki/ত্বরণ'};
  assert.equal(articleLanguage(article),'bn');
  assert.equal(articleKey(article),'bn:1');
  assert.equal(exploreUrl(article.title,[],'bn'),'/explore/%E0%A6%A4%E0%A7%8D%E0%A6%AC%E0%A6%B0%E0%A6%A3?lang=bn');
  assert.equal(shortRead(article.extract,45,'bn'),'ত্বরণ হলো বেগের পরিবর্তন। সময়ের সঙ্গে বেগ বদলায়।');
  assert.ok(shortRead(Array(80).fill('বিষয়').join(' '),45,'bn').split(/\s+/).length<=45);
});
