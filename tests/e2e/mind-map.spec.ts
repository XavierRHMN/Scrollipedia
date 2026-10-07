import {test,expect} from '@playwright/test';
import {exploreCircle} from './map-interaction';
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
test('exploring a circle grows the map without navigating or moving earlier circles',async({page,isMobile})=>{
  await page.goto('/explore/Acceleration');
  const node=page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true});
  await expect(node).toBeVisible();
  const initial=await page.locator('.react-flow__node[data-id="1"]').getAttribute('style');
  await page.waitForTimeout(500); // Let the initial fit animation finish before the touch gesture.
  await exploreCircle(node,isMobile);
  await expect(page.getByRole('button',{name:'Explore connections for Measurement',exact:true})).toBeAttached();
  await expect(page.locator('.topic-node')).toHaveCount(4);
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  expect(page.url()).toMatch(/\/explore\/Acceleration$/);
  expect(await page.locator('.react-flow__node[data-id="1"]').getAttribute('style')).toBe(initial);
  await page.getByRole('button',{name:'Show entire map'}).click();
  await page.waitForTimeout(350);
  await exploreCircle(page.getByRole('button',{name:'Explore connections for Acceleration',exact:true}),isMobile);
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(4);
  const shape=await node.evaluate(el=>({width:getComputedStyle(el).width,height:getComputedStyle(el).height,radius:getComputedStyle(el).borderRadius}));
  expect(shape.width).toBe(shape.height);expect(shape.radius).toBe('50%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('failed branch leaves the map readable and retry adds its connections',async({page,isMobile})=>{
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(3);
  let fail=true;
  await page.route('**/api/wikipedia?title=Physical%20quantity',route=>fail ? route.fulfill({status:503,json:{error:'Busy'}}) : route.fallback());
  await page.waitForTimeout(500);
  await exploreCircle(page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true}),isMobile);
  await expect(page.locator('.topic-notice')).toContainText('retry');
  await expect(page.locator('.topic-node')).toHaveCount(3);
  fail=false;
  await page.getByRole('button',{name:'Retry connections'}).click();
  await expect(page.locator('.topic-node')).toHaveCount(4);
  await expect(page.locator('.topic-notice')).toHaveCount(0);
});

test('phone circles require two quick taps on the same topic',async({page,isMobile})=>{
  test.skip(!isMobile,'Touch interaction is specific to the phone layout.');
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.graph-caption')).toContainText('Double tap a circle');
  const branchNode=page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true});
  const rootNode=page.getByRole('button',{name:'Explore connections for Acceleration',exact:true});
  await expect(branchNode).toBeVisible();
  await page.waitForTimeout(500);
  let branchRequests=0;
  page.on('request',request=>{if(new URL(request.url()).searchParams.get('title')==='Physical quantity')branchRequests++;});

  await branchNode.tap();
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  expect(branchRequests).toBe(0);
  await page.waitForTimeout(450);
  await branchNode.tap(); // A slow second tap starts a new pair.
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  expect(branchRequests).toBe(0);
  await rootNode.tap(); // A different topic also breaks the pair.
  await branchNode.tap();
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  expect(branchRequests).toBe(0);
  await branchNode.tap();
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  await expect(page.locator('.topic-node')).toHaveCount(4);
  expect(branchRequests).toBe(1);
});

test('phone circles ignore a swipe and remain keyboard accessible',async({page,isMobile})=>{
  test.skip(!isMobile,'Touch interaction is specific to the phone layout.');
  await page.goto('/explore/Acceleration');
  const node=page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true});
  await expect(node).toBeVisible();
  await page.waitForTimeout(500);
  await node.tap();
  const bounds=(await node.boundingBox())!;
  const touch=await page.context().newCDPSession(page);
  const point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+30}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.detach();
  await node.tap();
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration');
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
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

test('phone fullscreen keeps the map interactive and restores the page on exit',async({page,isMobile})=>{
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.topic-node')).toHaveCount(3);
  const fullscreen=page.getByRole('button',{name:'Fullscreen',exact:true});
  if(!isMobile){await expect(fullscreen).toHaveCount(0);return;}
  await page.setViewportSize({width:390,height:650});
  await fullscreen.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await fullscreen.evaluate(el=>el.addEventListener('pointerdown',()=>el.setAttribute('data-entry-scroll',String(window.scrollY))));
  const rootNode=page.getByRole('button',{name:'Explore connections for Acceleration',exact:true});
  await rootNode.evaluate(el=>el.setAttribute('data-mounted','original'));
  await fullscreen.tap();
  const before=Number(await page.getByRole('button',{name:'Exit fullscreen'}).getAttribute('data-entry-scroll'));
  const dialog=page.getByRole('dialog',{name:'Fullscreen mind map'});
  await expect(dialog).toBeVisible();
  await expect(page.locator('.app-header')).toHaveAttribute('inert','');
  await expect(page.getByRole('button',{name:'Close fullscreen mind map'})).toBeFocused();
  const bounds=await dialog.boundingBox();
  expect(bounds).toEqual({x:0,y:0,width:390,height:650});
  await page.getByRole('button',{name:'Exit fullscreen'}).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Close fullscreen mind map'})).toBeFocused();
  await page.waitForTimeout(200);
  await exploreCircle(page.getByRole('button',{name:'Explore connections for Physical quantity',exact:true}),true);
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  await expect(page.locator('.topic-node')).toHaveCount(4);
  await expect(dialog).toBeVisible();
  await page.getByRole('button',{name:'Exit fullscreen'}).tap();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.app-header')).not.toHaveAttribute('inert','');
  await expect(fullscreen).toBeFocused();
  expect(await page.evaluate(()=>scrollY)).toBe(before);
  await expect(rootNode).toHaveAttribute('data-mounted','original');
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  await fullscreen.tap();
  await expect(page.getByRole('button',{name:'Close fullscreen mind map'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.style.position)).toBe('');
  await fullscreen.tap();
  await page.setViewportSize({width:844,height:650});
  await expect(dialog).toBeVisible();
  await expect.poll(async()=>await dialog.boundingBox()).toEqual({x:0,y:0,width:844,height:650});
  await page.getByRole('button',{name:'Close fullscreen mind map'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.app-header')).not.toHaveAttribute('inert','');
});
