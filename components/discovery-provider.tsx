'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useSettings} from './settings-provider';
type DiscoveryPreferences={started:boolean;interests:string[]};
const DEFAULTS:DiscoveryPreferences={started:false,interests:[]};
const KEY='scrollipedia.discovery.v1';
const Context=createContext<{preferences:DiscoveryPreferences;ready:boolean;editing:boolean;update:(patch:Partial<DiscoveryPreferences>)=>void;edit:()=>void;finish:()=>void;reset:(forgetWelcome?:boolean)=>void} | null>(null);
export function DiscoveryProvider({children}:{children:React.ReactNode}){
  const {preferences:settings,ready:settingsReady}=useSettings();
  const [preferences,setPreferences]=useState(DEFAULTS),[ready,setReady]=useState(false),[editing,setEditing]=useState(false);
  const initialized=useRef(false);
  useEffect(()=>{
    if(!settingsReady || initialized.current) return;
    initialized.current=true;
    try {
      const stored=JSON.parse(localStorage.getItem(KEY) || 'null');
      if(stored) setPreferences({started:stored.started===true,interests:settings.storeData && Array.isArray(stored.interests) ? stored.interests.filter((t:unknown)=>typeof t==='string' && t.length>0 && t.length<=100).slice(0,8) : []});
    } catch { /* Fresh preferences if storage is unavailable. */ }
    setReady(true);
  },[settingsReady,settings.storeData]);
  useEffect(()=>{
    if(!ready) return;
    // Welcome acknowledgement is a display preference. Interests
    // are retained for this session only when activity storage is disabled.
    try {
      if(!preferences.started && !preferences.interests.length) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY,JSON.stringify({...preferences,interests:settings.storeData ? preferences.interests : []}));
    } catch { /* Session mode still works. */ }
  },[preferences,ready,settings.storeData]);
  function reset(forgetWelcome=false){
    setPreferences(p=>({...DEFAULTS,started:forgetWelcome ? false : p.started}));
    if(forgetWelcome) localStorage.removeItem(KEY);
  }
  return <Context.Provider value={{preferences,ready,editing,update:patch=>setPreferences(p=>({...p,...patch})),edit:()=>setEditing(true),finish:()=>{setPreferences(p=>({...p,started:true}));setEditing(false);window.dispatchEvent(new Event('scrollipedia:reset-feed'));},reset}}>{children}</Context.Provider>;
}
export function useDiscovery(){const value=useContext(Context);if(!value) throw new Error('Missing discovery provider');return value;}
