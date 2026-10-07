import type {Locator} from '@playwright/test';

export async function exploreCircle(circle:Locator,mobile:boolean){
  if(mobile){await circle.tap();await circle.tap();}
  else await circle.click();
}
