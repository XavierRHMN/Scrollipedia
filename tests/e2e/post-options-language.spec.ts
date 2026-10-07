import {test,expect} from '@playwright/test';
const english={pageId:11,title:'Acceleration',extract:'Acceleration is the rate of change of velocity.',url:'https://en.wikipedia.org/wiki/Acceleration',language:'en'};
const arabic={pageId:11,title:'تسارع',extract:'التسارع هو تغير السرعة مع مرور الزمن.',url:'https://ar.wikipedia.org/wiki/تسارع',language:'ar'};
const related={...arabic,pageId:12,title:'كمية فيزيائية',extract:'الكمية الفيزيائية خاصية يمكن قياسها.',url:'https://ar.wikipedia.org/wiki/كمية_فيزيائية'};

test('post options dismiss, undo and persist negative feedback in future requests',async({page})=>{
  const requests:{exclude:string;disliked:string[]}[]=[];
  await page.route('**/api/wikipedia?offset=*',route=>{
    const url=new URL(route.request().url());
    requests.push({exclude:url.searchParams.get('exclude') || '',disliked:route.request().postDataJSON().profile.disliked});
    return route.fulfill({json:{articles:[english,{...english,pageId:13,title:'Velocity'}],next:6}});
  });
  await page.goto('/scroll');
  await expect(page.getByRole('heading',{name:'Scrollipedia',exact:true})).toBeVisible();
  const options=page.getByRole('button',{name:'Post options for Acceleration',exact:true});
  await options.click();
  await expect(page.getByRole('menuitem',{name:'Not interested',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await options.click();
  await page.getByRole('menuitem',{name:'Not interested',exact:true}).click();
  await expect(page.locator('.feed-slide h2')).toHaveText(['Velocity']);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(page.locator('.feed-slide h2')).toHaveText(['Acceleration','Velocity']);
  await options.click();
  await page.getByRole('menuitem',{name:'Not interested',exact:true}).click();
  await page.reload();
  await expect(page.locator('.feed-slide h2')).toHaveText(['Velocity']);
  expect(requests.some(r=>r.exclude.split(',').includes('11') && r.disliked.includes('Acceleration'))).toBe(true);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Reset discovery',exact:true}).click();
  await expect(page.locator('.feed-slide h2')).toHaveText(['Acceleration','Velocity']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Arabic changes interface and feed, retains bilingual saves, and explores Arabic connections',async({page,isMobile})=>{
  const feedLanguages:string[]=[];
  await page.route('**/api/wikipedia?offset=*',route=>{
    const language=new URL(route.request().url()).searchParams.get('language') || 'en';feedLanguages.push(language);
    return route.fulfill({json:{articles:[language==='ar' ? arabic : english],next:6}});
  });
  await page.route('**/api/gemini',route=>route.fulfill({json:{related:[],organized:false}}));
  await page.route('**/api/wikipedia?title=*',route=>{
    const params=new URL(route.request().url()).searchParams;
    const a=params.get('title')===related.title ? related : arabic;
    expect(params.get('language')).toBe('ar');
    return route.fulfill({json:{article:a,sections:[{title:'نظرة عامة',content:a.extract}],related:a===arabic ? [related] : [arabic],organized:false}});
  });
  await page.goto('/scroll');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Language',{exact:true}).selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang','ar');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.getByRole('dialog',{name:'الإعدادات',exact:true})).toBeVisible();
  await expect(page.getByLabel('اللغة',{exact:true})).toHaveValue('ar');
  const knob=await page.locator('.setting-switch span').first().boundingBox();
  const track=await page.locator('.setting-switch').first().boundingBox();
  expect(knob!.x).toBeGreaterThanOrEqual(track!.x);
  expect(knob!.x+knob!.width).toBeLessThanOrEqual(track!.x+track!.width);
  await page.getByRole('button',{name:'إغلاق الإعدادات',exact:true}).click();
  await expect(page.locator('.post-summary')).toHaveText(arabic.extract);
  await expect(page.getByRole('button',{name:'احفظ',exact:true})).toBeVisible(); // Same numeric ID as the English save.
  await page.getByRole('button',{name:'احفظ',exact:true}).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('.post-summary')).toHaveText(arabic.extract);
  expect(feedLanguages.includes('ar')).toBe(true);
  await page.getByRole('navigation',{name:'التنقل الرئيسي'}).getByRole('link',{name:/^المكتبة/}).click();
  await expect(page.locator('.saved-topic')).toHaveCount(2);
  await expect(page.getByRole('heading',{name:'المكتبة',exact:true})).toBeVisible();
  await page.locator('.saved-topic-link').filter({hasText:arabic.title}).click();
  await expect(page.locator('.center-node strong')).toHaveText(arabic.title);
  const node=page.getByRole('button',{name:'استكشف روابط كمية فيزيائية',exact:true});
  await expect(node).toBeVisible();
  await page.waitForTimeout(500);
  if(isMobile){await node.tap();await node.tap();}else await node.click();
  await expect(page.locator('.center-node strong')).toHaveText(related.title);
  await expect(page.getByRole('link',{name:'اقرأ المقالة كاملة على ويكيبيديا'})).toHaveAttribute('href',related.url);
  if(isMobile){
    await page.getByRole('button',{name:'ملء الشاشة',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'خريطة المعرفة بملء الشاشة'})).toBeVisible();
    await page.getByRole('button',{name:'إغلاق خريطة ملء الشاشة'}).click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
