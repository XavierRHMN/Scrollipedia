import {test,expect} from '@playwright/test';
const english={pageId:11,title:'Acceleration',extract:'Acceleration is the rate of change of velocity.',url:'https://en.wikipedia.org/wiki/Acceleration',language:'en'};
const bangla={pageId:11,title:'ত্বরণ',extract:'ত্বরণ হলো সময়ের সঙ্গে বেগের পরিবর্তন।',url:'https://bn.wikipedia.org/wiki/ত্বরণ',language:'bn'};
const related={...bangla,pageId:12,title:'ভৌত রাশি',extract:'ভৌত রাশি হলো পরিমাপ করা যায় এমন বৈশিষ্ট্য।',url:'https://bn.wikipedia.org/wiki/ভৌত_রাশি'};

test('Bangla switches content and interface, persists, and keeps translated maps and saves usable',async({page,isMobile})=>{
  await page.route('**/api/wikipedia?offset=*',route=>{
    const language=new URL(route.request().url()).searchParams.get('language') || 'en';
    return route.fulfill({json:{articles:[language==='bn' ? bangla : english],next:6}});
  });
  await page.route('**/api/gemini',route=>route.fulfill({json:{related:[],organized:false}}));
  await page.route('**/api/wikipedia?title=*',route=>{
    const params=new URL(route.request().url()).searchParams;
    const article=params.get('title')===related.title ? related : bangla;
    expect(params.get('language')).toBe('bn');
    return route.fulfill({json:{article,sections:[{title:'সারসংক্ষেপ',content:article.extract}],related:article===bangla ? [related] : [bangla],organized:false}});
  });
  await page.goto('/scroll');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Language',{exact:true}).selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await page.getByLabel('اللغة',{exact:true}).selectOption('bn');
  await expect(page.locator('html')).toHaveAttribute('lang','bn');
  await expect(page.locator('html')).toHaveAttribute('dir','ltr');
  await expect(page.getByLabel('ভাষা',{exact:true})).toHaveValue('bn');
  await page.getByRole('button',{name:'সেটিংস বন্ধ করুন',exact:true}).click();
  await expect(page.locator('.post-summary')).toHaveText(bangla.extract);
  await page.getByRole('button',{name:'সংরক্ষণ করুন',exact:true}).click();
  await page.reload();
  await expect(page.locator('.post-summary')).toHaveText(bangla.extract);
  await expect(page.locator('html')).toHaveAttribute('lang','bn');
  await page.getByRole('navigation',{name:'প্রধান নেভিগেশন'}).getByRole('link',{name:/^লাইব্রেরি/}).click();
  await expect(page.locator('.saved-topic')).toHaveCount(2);
  await page.locator('.saved-topic-link').filter({hasText:bangla.title}).click();
  await expect(page.locator('.center-node strong')).toHaveText(bangla.title);
  const node=page.getByRole('button',{name:'ভৌত রাশি-এর সম্পর্ক অন্বেষণ করুন',exact:true});
  await expect(node).toBeVisible();
  await page.waitForTimeout(500);
  if(isMobile){await node.tap();await node.tap();}else await node.click();
  await expect(page.locator('.center-node strong')).toHaveText(related.title);
  await expect(page.getByRole('link',{name:'উইকিপিডিয়ায় পুরো নিবন্ধ পড়ুন'})).toHaveAttribute('href',related.url);
  if(isMobile){
    await page.getByRole('button',{name:'পূর্ণপর্দা',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'পূর্ণপর্দায় মাইন্ড ম্যাপ'})).toBeVisible();
    await page.getByRole('button',{name:'পূর্ণপর্দার মাইন্ড ম্যাপ বন্ধ করুন'}).click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
