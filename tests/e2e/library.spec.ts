import {test,expect} from '@playwright/test';

const article=(pageId:number,title:string)=>({pageId,title,description:'A saved Wikipedia topic',extract:`${title} is a topic.`,url:`https://en.wikipedia.org/wiki/${title}`});
const first=article(1,'Bioluminescence'),second=article(2,'Physical quantity'),recent=article(3,'Acceleration');

test('clean library keeps saves and paths while recent explorations stay in stats',async({page})=>{
  await page.addInitScript(({first,second,recent})=>{
    if(!localStorage.getItem('scrollipedia.library.v1'))localStorage.setItem('scrollipedia.library.v1',JSON.stringify({saved:[first,second],recent:[recent],paths:[{id:'path-1',name:first.title,savedAt:new Date().toISOString(),articles:[first,second]}]}));
  },{first,second,recent});
  await page.goto('/library');
  await expect(page.getByRole('heading',{name:'Library',exact:true})).toBeVisible();
  await expect(page.locator('.saved-topic')).toHaveCount(2);
  await expect(page.locator('.path-card')).toHaveCount(1);
  await expect(page.getByRole('heading',{name:/recent/i})).toHaveCount(0);
  await expect(page.getByText(recent.title,{exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Reopen 2-topic path'})).toHaveAttribute('href',`/explore/Physical%20quantity?trail=${encodeURIComponent(JSON.stringify([first.title,second.title]))}`);
  await expect(page.locator('.saved-topic-link').first()).toHaveAttribute('href','/explore/Bioluminescence');

  await page.getByRole('button',{name:'Unsave Bioluminescence',exact:true}).click();
  await expect(page.locator('.saved-topic h2')).toHaveText([second.title]);
  await expect(page.locator('.path-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Delete path starting at Bioluminescence',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Saved paths',exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.saved-topic h2')).toHaveText([second.title]);
  await expect(page.locator('.path-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Unsave Physical quantity',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No saved topics yet',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Explore topics',exact:true})).toHaveAttribute('href','/scroll');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Stats',exact:true}).click();
  await expect(page.locator('.stats-topic-list')).toContainText(recent.title);
  await expect(page.locator('.stats-grid dd')).toHaveText(['0','1','0','0','0']);
});
