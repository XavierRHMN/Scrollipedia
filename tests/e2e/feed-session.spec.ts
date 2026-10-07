import {test,expect} from '@playwright/test';

test('routing retains feed order and position while page reload starts a fresh feed',async({page})=>{
  let batches=0;
  await page.route('**/api/wikipedia?offset=*',route=>{
    batches++;
    return route.fulfill({json:{articles:Array.from({length:24},(_,i)=>({pageId:batches*100+i,title:`Batch ${batches} topic ${i}`,extract:'A short Wikipedia read about this topic. '.repeat(4),url:`https://en.wikipedia.org/wiki/Topic_${i}`})),next:batches*24}});
  });
  await page.route('**/api/gemini',route=>route.fulfill({json:{related:[],organized:false}}));
  await page.route('**/api/wikipedia?title=*',route=>{
    const title=new URL(route.request().url()).searchParams.get('title');
    return route.fulfill({json:{article:{pageId:107,title,extract:'An article overview.',url:'https://en.wikipedia.org/wiki/Test'},sections:[{title:'Overview',content:'An article overview.'}],related:[],organized:false}});
  });
  await page.goto('/scroll');
  await expect(page.locator('.feed-slide')).toHaveCount(24);
  const initial=await page.locator('.feed-slide h2').allTextContents();
  const link=page.locator('.feed-slide').nth(7).getByRole('link',{name:'Explore topic'});
  await link.scrollIntoViewIfNeeded();
  const position=await page.evaluate(()=>scrollY);
  expect(position).toBeGreaterThan(300);
  await link.click();
  await expect(page.locator('.article-panel')).toBeAttached();
  await page.getByRole('navigation').getByRole('link',{name:'Scroll',exact:true}).click();
  await expect(page.locator('.feed-slide h2')).toHaveText(initial);
  await expect.poll(()=>page.evaluate(position=>Math.abs(scrollY-position),position)).toBeLessThan(3);
  expect(batches).toBe(1);
  await page.locator('.feed-slide').nth(7).getByRole('link',{name:'Explore topic'}).click();
  await expect(page.locator('.article-panel')).toBeAttached();
  await page.goBack();
  await expect(page.locator('.feed-slide h2')).toHaveText(initial);
  await expect.poll(()=>page.evaluate(position=>Math.abs(scrollY-position),position)).toBeLessThan(3);
  expect(batches).toBe(1);
  await page.reload();
  await expect(page.locator('.feed-slide h2').first()).toHaveText('Batch 2 topic 0');
  expect(batches).toBe(2);
});

test('phone pull at the top refreshes only after the threshold and release',async({page,isMobile})=>{
  test.skip(!isMobile,'Pull to refresh is a phone gesture.');
  let batches=0;
  await page.route('**/api/wikipedia?offset=*',route=>{
    batches++;
    return route.fulfill({json:{articles:Array.from({length:20},(_,i)=>({pageId:batches*100+i,title:`Batch ${batches} topic ${i}`,extract:'A short Wikipedia read about this topic. '.repeat(4),url:'https://en.wikipedia.org/wiki/Test'})),next:20}});
  });
  await page.goto('/scroll');
  await expect(page.locator('.feed-slide')).toHaveCount(20);
  const gesture=async(dy:number,cancel=false)=>{
    await page.locator('.feed-scroll').evaluate((root,{dy,cancel})=>{
      const touch=(y:number)=>new Touch({identifier:1,target:root,clientX:180,clientY:y});
      root.dispatchEvent(new TouchEvent('touchstart',{touches:[touch(160)],bubbles:true}));
      root.dispatchEvent(new TouchEvent('touchmove',{touches:[touch(160+dy)],bubbles:true,cancelable:true}));
      root.dispatchEvent(new TouchEvent(cancel ? 'touchcancel' : 'touchend',{touches:[],bubbles:true}));
    },{dy,cancel});
  };
  await gesture(35);
  expect(batches).toBe(1);
  await gesture(140,true);
  expect(batches).toBe(1);
  await page.evaluate(()=>scrollTo(0,350));
  await gesture(140);
  expect(batches).toBe(1);
  await page.evaluate(()=>scrollTo(0,0));
  await gesture(140);
  await expect(page.locator('.feed-slide h2').first()).toHaveText('Batch 2 topic 0');
  expect(batches).toBe(2);
});
