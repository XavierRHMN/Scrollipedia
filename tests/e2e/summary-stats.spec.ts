import {test,expect} from '@playwright/test';
const article={pageId:1,title:'Acceleration',extract:'Acceleration is the rate of change of velocity.',url:'https://en.wikipedia.org/wiki/Acceleration'};
test('summary generates only on click and stays available when the article panel is hidden',async({page})=>{
  let calls=0;
  await page.route('**/api/wikipedia?title=*',r=>r.fulfill({json:{article,sections:[{title:'Overview',content:article.extract}],related:[],organized:false}}));
  await page.route('**/api/gemini',r=>{
    if(r.request().postDataJSON().action==='summary'){calls++;return r.fulfill({json:{summary:'Acceleration measures how quickly velocity changes.'}});}
    return r.fulfill({json:{related:[],organized:false}});
  });
  await page.goto('/explore/Acceleration');
  await page.getByRole('button',{name:'Hide article',exact:true}).click();
  expect(calls).toBe(0);
  await page.getByRole('button',{name:'AI summary',exact:true}).click();
  await expect(page.locator('#ai-summary-content')).toContainText('Acceleration measures');
  await page.getByRole('button',{name:'AI summary',exact:true}).click();
  await page.getByRole('button',{name:'AI summary',exact:true}).click();
  expect(calls).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('stats reflects the stored library and fits mobile navigation',async({page})=>{
  await page.addInitScript(a=>localStorage.setItem('scrollipedia.library.v1',JSON.stringify({saved:[a],recent:[a],paths:[{id:'path-1',name:'Acceleration',savedAt:new Date().toISOString(),articles:[a]}]})),article);
  await page.goto('/stats');
  await expect(page.getByRole('heading',{name:'Stats',exact:true})).toBeVisible();
  await expect(page.locator('.stats-grid dd')).toHaveText(['1','1','1','1','1']);
  await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Stats',exact:true})).toHaveAttribute('aria-current','page');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
