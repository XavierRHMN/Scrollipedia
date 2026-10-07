'use client';
import {useSettings} from './settings-provider';
import {translate,type Message} from '@/lib/messages';
export function useI18n(){
  const {preferences,ready}=useSettings();
  return {language:preferences.language,ready,t:(message:Message,values?:Record<string,string|number>)=>translate(preferences.language,message,values)};
}
