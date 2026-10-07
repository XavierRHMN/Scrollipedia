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
