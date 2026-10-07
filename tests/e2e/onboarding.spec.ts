import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
test('welcome lets readers choose categories and a custom interest before requesting a feed',async({page})=>{
  const profiles:unknown[]=[];
  await page.route('**/api/wikipedia?offset=*',route=>{
    profiles.push(route.request().postDataJSON());
    return route.fulfill({json:{articles:[{pageId:1,title:'Black hole',extract:'A black hole is a region of spacetime.',feedSummary:'A black hole is a place where gravity is so strong that light cannot escape.',summarySource:'gemini',url:'https://en.wikipedia.org/wiki/Black_hole'}],next:6,personalized:true}});
  });
  await page.goto('/scroll');
  const welcome=page.getByRole('dialog',{name:'Scrollipedia',exact:true});
  await expect(welcome).toBeVisible();
  expect(profiles).toHaveLength(0);
  await welcome.getByRole('checkbox',{name:'Space',exact:true}).check();
  await welcome.getByRole('textbox',{name:'Custom interest'}).fill('Black holes');
  await welcome.getByRole('button',{name:'Add interest'}).click();
  await expect(welcome.getByRole('button',{name:'Remove interest Black holes'})).toBeVisible();
  await welcome.getByRole('button',{name:'I’m an adult, continue',exact:true}).click();
  await expect(welcome).not.toBeVisible();
  await expect(page.locator('.post-summary').first()).toHaveText('A black hole is a place where gravity is so strong that light cannot escape.');
  expect(profiles[0]).toMatchObject({aiFeed:true,profile:{interests:['Space','Black holes']}});
  await page.reload();
  await expect(page.locator('.post-summary').first()).toBeVisible();
  await expect(welcome).not.toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('saved and explored topics guide later batches and interests can be edited in Settings',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('scrollipedia.discovery.v1',JSON.stringify({started:true,aiFeed:false,interests:['Nature']}));
    const a={pageId:9,title:'Octopus',extract:'An octopus is an animal.',url:'https://en.wikipedia.org/wiki/Octopus'};
    localStorage.setItem('scrollipedia.library.v1',JSON.stringify({saved:[a],recent:[{...a,pageId:10,title:'Coral reef'}],paths:[]}));
  });
  const profiles:unknown[]=[];
  await page.route('**/api/wikipedia?offset=*',route=>{profiles.push(route.request().postDataJSON());return route.fulfill({json:{articles:[],next:6}});});
  await page.goto('/scroll');
  await expect.poll(()=>profiles.length).toBeGreaterThan(0);
  expect(profiles[0]).toMatchObject({aiFeed:false,profile:{interests:['Nature'],saved:['Octopus'],explored:['Coral reef']}});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Choose interests',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Scrollipedia',exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'Science',exact:true}).check();
  await page.getByRole('button',{name:'Update my feed',exact:true}).click();
  await expect.poll(()=>profiles.some(p=>JSON.stringify(p).includes('Science'))).toBe(true);
});
