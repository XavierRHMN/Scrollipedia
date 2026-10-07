import {test,expect} from '@playwright/test';
const article=(id:number,title:string)=>({pageId:id,title,extract:`${title} is a topic from Wikipedia.`,url:`https://en.wikipedia.org/wiki/${title}`});
const root=article(1,'Acceleration'), branch=article(2,'Physical quantity'), sibling=article(3,'Velocity'), leaf=article(4,'Measurement');
test.beforeEach(async({page})=>{
  await page.route('**/api/gemini',route=>route.fulfill({json:{related:[],organized:false}}));
  await page.route('**/api/wikipedia?title=*',route=>{
    const title=new URL(route.request().url()).searchParams.get('title');
    const a=title===branch.title ? branch : title===leaf.title ? leaf : root;
    const related=a.pageId===1 ? [branch,sibling] : a.pageId===2 ? [root,leaf] : [branch];
    return route.fulfill({json:{article:a,sections:[{title:'Overview',content:a.extract}],related:related.map(a=>({...a,reason:'Linked article'})),organized:false}});
  });
});
test('tapping a circle grows the map without navigating or moving earlier circles',async({page})=>{
  await page.goto('/explore/Acceleration');
  const node=page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true});
  await expect(node).toBeVisible();
  const initial=await page.locator('.react-flow__node[data-id="1"]').getAttribute('style');
  await node.click();
  await expect(page.getByRole('button',{name:'Explore connections for Measurement',exact:true})).toBeAttached();
  await expect(page.locator('.topic-node')).toHaveCount(4);
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  expect(page.url()).toMatch(/\/explore\/Acceleration$/);
  expect(await page.locator('.react-flow__node[data-id="1"]').getAttribute('style')).toBe(initial);
  await page.getByRole('button',{name:'Show entire map'}).click();
  await page.getByRole('button',{name:'Explore connections for Acceleration',exact:true}).click();
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(4);
  const shape=await node.evaluate(el=>({width:getComputedStyle(el).width,height:getComputedStyle(el).height,radius:getComputedStyle(el).borderRadius}));
  expect(shape.width).toBe(shape.height);expect(shape.radius).toBe('50%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('failed branch leaves the map readable and retry adds its connections',async({page})=>{
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(3);
  let fail=true;
  await page.route('**/api/wikipedia?title=Physical%20quantity',route=>fail ? route.fulfill({status:503,json:{error:'Busy'}}) : route.fallback());
  await page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true}).click();
  await expect(page.locator('.topic-notice')).toContainText('retry');
  await expect(page.locator('.topic-node')).toHaveCount(3);
  fail=false;
  await page.getByRole('button',{name:'Retry connections'}).click();
  await expect(page.locator('.topic-node')).toHaveCount(4);
  await expect(page.locator('.topic-notice')).toHaveCount(0);
});

test('variable circles show complete long and unbroken titles inside their boundaries',async({page},testInfo)=>{
  const titles=['Mass','International Bureau of Weights and Measures and the International System of Quantities','W'.repeat(90),'中华人民共和国全国人民代表大会常务委员会'];
  await page.route('**/api/wikipedia?title=*',route=>route.fulfill({json:{article:root,sections:[{title:'Overview',content:root.extract}],related:titles.map((title,i)=>({...article(i+2,title),reason:'Linked article'})),organized:false}}));
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(5);
  await page.getByRole('button',{name:'Show entire map'}).click();
  await expect.poll(()=>page.locator('.topic-node').evaluateAll(nodes=>nodes.every(node=>{
    const circle=node.getBoundingClientRect(), title=node.querySelector('strong')!, status=node.querySelector('.node-state')!;
    const radius=circle.width/2-2, cx=circle.x+circle.width/2,cy=circle.y+circle.height/2;
    return [title,status].every(el=>{
      const bounds=el.getBoundingClientRect();
      return el.scrollHeight<=el.clientHeight+1 && el.scrollWidth<=el.clientWidth+1 &&
        [bounds.left,bounds.right].every(x=>[bounds.top,bounds.bottom].every(y=>Math.hypot(x-cx,y-cy)<=radius));
    });
  }))).toBe(true);
  const diameters=await page.locator('.topic-node').evaluateAll(nodes=>nodes.map(el=>({width:el.clientWidth,height:el.clientHeight})));
  expect(new Set(diameters.map(d=>d.width)).size).toBeGreaterThan(1);
  for(const d of diameters) expect(d.width).toBe(d.height);
  for(const title of titles) await expect(page.getByRole('button',{name:`Explore connections for ${title}`,exact:true}).locator('strong')).toHaveText(title);
  await page.locator('.graph-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({path:`.tools/map-variable-${testInfo.project.name}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
