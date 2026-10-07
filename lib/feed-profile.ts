export type FeedProfile={interests:string[];saved:string[];explored:string[]};
export const CATEGORY_ANCHORS:Record<string,string>={Nature:'Ecology',Science:'Science',Animals:'Animal',History:'History',Places:'Geography',Culture:'Culture',Art:'Art',Mathematics:'Mathematics',Games:'Game',Technology:'Technology',Music:'Music',Space:'Astronomy'};
export function validFeedProfile(value:unknown):value is FeedProfile {
  if(!value || typeof value!=='object') return false;
  const p=value as FeedProfile;
  return [p.interests,p.saved,p.explored].every(a=>Array.isArray(a) && a.length<=8 && a.every(t=>typeof t==='string' && t.trim().length>0 && t.length<=100 && !/[\x00-\x1f|]/.test(t)));
}
