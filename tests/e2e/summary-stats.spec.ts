import {test,expect} from '@playwright/test';
const article={pageId:1,title:'Acceleration',extract:'Acceleration is the rate of change of velocity.',url:'https://en.wikipedia.org/wiki/Acceleration'};
test('phone has a centered article shortcut while desktop toggles the panel without scrolling',async({page})=>{
  let summaryCalls=0;
  const content=Array(12).fill(article.extract).join('\n\n');
  await page.route('**/api/wikipedia?title=*',r=>r.fulfill({json:{article,sections:[{title:'Overview',content},{title:'Examples',content:'A different section.'}],related:[],organized:false}}));
  await page.route('**/api/gemini',r=>{
    if(r.request().postDataJSON().action==='summary') summaryCalls++;
    return r.fulfill({json:{related:[],organized:false}});
  });
  await page.goto('/explore/Acceleration');
  await expect(page.getByRole('button',{name:'AI summary',exact:true})).toHaveCount(0);
  const phone=page.viewportSize()!.width<800;
  if(phone) {
    await expect(page.locator('.article-shortcut')).toBeVisible();
    await expect(page.getByRole('button',{name:'Hide article',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open article',exact:true})).toHaveCount(1);
    const centered=await page.locator('.article-pill').evaluate(el=>{
      const button=el.getBoundingClientRect(),icon=el.querySelector('svg')!.getBoundingClientRect(),label=el.querySelector('span')!.getBoundingClientRect();
      return Math.abs((icon.left+label.right)/2-(button.left+button.right)/2)<1 && Math.abs((icon.top+icon.bottom)/2-(button.top+button.bottom)/2)<1;
    });
    expect(centered).toBe(true);
  } else await expect(page.locator('.article-shortcut')).toBeHidden();
  await page.getByRole('tab',{name:'Examples',exact:true}).click();
  await page.evaluate(()=>{document.querySelector('.article-panel')?.scrollTo(0,300);window.scrollTo(0,0);});
  if(phone) await page.getByRole('button',{name:'Open article',exact:true}).click();
  else {
    await page.getByRole('button',{name:'Hide article',exact:true}).click();
    const before=await page.evaluate(()=>scrollY);
    await page.getByRole('button',{name:'Open article',exact:true}).click();
    await expect(page.getByRole('tab',{name:'Examples',exact:true})).toHaveAttribute('aria-selected','true');
    expect(await page.evaluate(()=>scrollY)).toBe(before);
    await expect(page.getByRole('button',{name:'Hide article',exact:true})).toHaveAttribute('aria-expanded','true');
    expect(summaryCalls).toBe(0);
    return;
  }
  await expect(page.getByRole('tab',{name:'Overview',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#article-heading')).toBeFocused();
  await expect.poll(()=>page.locator('#section-content>p').first().evaluate(el=>{
    const bounds=el.getBoundingClientRect();return bounds.top>=0 && bounds.bottom<innerHeight-72;
  })).toBe(true);
  await page.getByRole('button',{name:'Close article panel',exact:true}).click();
  await expect(page.locator('.article-panel')).toHaveCount(0);
  await page.getByRole('button',{name:'Open article',exact:true}).click();
  await expect(page.locator('#article-heading')).toBeFocused();
  await expect(page.locator('#section-content>p').first()).toHaveText(article.extract);
  expect(summaryCalls).toBe(0);
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
