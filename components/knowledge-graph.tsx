'use client';
import {useI18n} from './use-i18n';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Background,Handle,Position,BaseEdge,type EdgeProps,type Edge,type NodeProps,type Node,type ReactFlowInstance} from '@xyflow/react';
import {Plus,Minus,Scan,LocateFixed,LoaderCircle,Check,Maximize2,Minimize2,X} from 'lucide-react';
import type {WikiArticle,RelatedTopic} from '@/types';
import {expandMap,type MindMap} from '@/lib/mind-map';
type TopicNodeData={title:string;diameter:number;active:boolean;root:boolean;expanded:boolean;loading:boolean;mobile:boolean;select:(keyboard:boolean)=>void;cancelTap:()=>void};
type TopicFlowNode=Node<TopicNodeData,'topic'>;
function TopicNode({data}:NodeProps<TopicFlowNode>){
  const {t,language}=useI18n();
  const gesture=useRef({x:0,y:0,moved:false});
  return <><Handle type="target" position={Position.Top}/><button className={`topic-node nodrag nopan ${data.active ? 'center-node' : ''} ${data.root ? 'root-node' : ''}`} style={{width:data.diameter,height:data.diameter}} aria-label={t('Explore connections for {title}',{title:data.title})} aria-description={data.mobile ? t('Double tap description') : undefined} aria-pressed={data.active} onPointerDown={event=>{gesture.current={x:event.clientX,y:event.clientY,moved:!event.isPrimary};if(!event.isPrimary)data.cancelTap();}} onPointerMove={event=>{if(Math.hypot(event.clientX-gesture.current.x,event.clientY-gesture.current.y)>10){gesture.current.moved=true;data.cancelTap();}}} onPointerCancel={()=>{gesture.current.moved=true;data.cancelTap();}} onClick={event=>{event.stopPropagation();if(event.detail===0 || !gesture.current.moved)data.select(event.detail===0);}}><strong>{data.title}</strong><span className="node-state">{data.loading ? <LoaderCircle size={13} className="spin"/> : data.expanded ? <Check size={13}/> : <Plus size={13}/>}<span>{data.loading ? t('Loading') : data.expanded ? t('Explored') : data.mobile ? t('Double tap') : t('Expand')}</span></span></button><Handle type="source" position={Position.Bottom}/></>;
}
const nodeTypes={topic:TopicNode};
type CircleFlowEdge=Edge<{sourceRadius:number;targetRadius:number},'circle'>;
function CircleEdge({id,sourceX,sourceY,targetX,targetY,style,data}:EdgeProps<CircleFlowEdge>){
  const sourceRadius=data?.sourceRadius ?? 64, targetRadius=data?.targetRadius ?? 64;
  const sy=sourceY-sourceRadius, ty=targetY+targetRadius, dx=targetX-sourceX, dy=ty-sy;
  const length=Math.hypot(dx,dy) || 1, ux=dx/length, uy=dy/length;
  return <BaseEdge id={id} path={`M ${sourceX+ux*(sourceRadius+1)},${sy+uy*(sourceRadius+1)} L ${targetX-ux*(targetRadius+1)},${ty-uy*(targetRadius+1)}`} style={style}/>;
}
const edgeTypes={circle:CircleEdge};
export function KnowledgeGraph({article,related,onSelect,loading,complete=true}:{article:WikiArticle;related:RelatedTopic[];onSelect:(title:string)=>void;loading:string;complete?:boolean}){
  const {t,language}=useI18n();
  const root=useRef(String(article.pageId));
  const [map,setMap]=useState<MindMap>(()=>expandMap({topics:[],links:[]},article,related,!loading&&complete));
  const [mobile,setMobile]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const canvas=useRef<HTMLElement>(null), fullscreenButton=useRef<HTMLButtonElement>(null), closeButton=useRef<HTMLButtonElement>(null);
  const normalViewport=useRef<{x:number;y:number;zoom:number} | null>(null);
  const pageScroll=useRef(0);
  const lastTap=useRef<{id:string;time:number} | null>(null);
  const cancelTap=useCallback(()=>{lastTap.current=null;},[]);
  const selectTopic=useCallback((id:string,title:string,keyboard:boolean)=>{
    if(!(mobile || fullscreen) || keyboard){cancelTap();onSelect(title);return;}
    const now=performance.now(), previous=lastTap.current;
    if(previous?.id===id && now-previous.time<=400){cancelTap();onSelect(title);}
    else lastTap.current={id,time:now};
  },[mobile,fullscreen,onSelect,cancelTap]);
  const flow=useRef<ReactFlowInstance<TopicFlowNode,CircleFlowEdge> | null>(null);
  useEffect(()=>{
    if(!fullscreen)return;
    cancelTap();
    const scrollY=pageScroll.current, body=document.body;
    const previous={position:body.style.position,top:body.style.top,width:body.style.width,overflow:body.style.overflow};
    Object.assign(body.style,{position:'fixed',top:`-${scrollY}px`,width:'100%',overflow:'hidden'});
    // Keep the existing map mounted while making the rest of the page inert.
    const background:HTMLElement[]=[];
    let element:HTMLElement | null=canvas.current;
    while(element && element!==body){
      for(const sibling of element.parentElement?.children ?? [])if(sibling!==element && sibling instanceof HTMLElement && !sibling.inert){sibling.inert=true;background.push(sibling);}
      element=element.parentElement;
    }
    closeButton.current?.focus({preventScroll:true});
    function keydown(event:KeyboardEvent){
      if(event.key==='Escape'){event.preventDefault();setFullscreen(false);}
      if(event.key!=='Tab')return;
      const buttons=Array.from(canvas.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first=buttons[0], last=buttons[buttons.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
    }
    document.addEventListener('keydown',keydown);
    return()=>{
      document.removeEventListener('keydown',keydown);
      background.forEach(element=>{element.inert=false;});
      Object.assign(body.style,previous);window.scrollTo(0,scrollY);
      fullscreenButton.current?.focus({preventScroll:true});
    };
  },[fullscreen,cancelTap]);
  useEffect(()=>{
    const timer=setTimeout(()=>{
      if(fullscreen)void flow.current?.fitView({padding:0.12,maxZoom:1.15,duration:0});
      else if(normalViewport.current){void flow.current?.setViewport(normalViewport.current,{duration:0});normalViewport.current=null;}
    },100);
    return()=>clearTimeout(timer);
  },[fullscreen]);
  const active=String(article.pageId), lastFocus=useRef('');
  useEffect(()=>{const media=matchMedia('(max-width: 799px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{setMap(previous=>expandMap(previous,article,related,!loading&&complete));},[article,related,loading,complete]);
  const nodes=useMemo<TopicFlowNode[]>(()=>map.topics.map(t=>({id:t.id,type:'topic',position:t.position,origin:[0.5,0.5],width:t.diameter,height:t.diameter,draggable:false,data:{title:t.article.title,diameter:t.diameter,active:t.id===active,root:t.id===root.current,expanded:t.expanded,loading:t.article.title===loading,mobile:mobile || fullscreen,select:(keyboard:boolean)=>selectTopic(t.id,t.article.title,keyboard),cancelTap}})),[map.topics,active,loading,mobile,fullscreen,selectTopic,cancelTap]);
  const edges=useMemo<CircleFlowEdge[]>(()=>{
    const radii=new Map(map.topics.map(t=>[t.id,t.diameter/2]));
    return map.links.map(e=>({...e,type:'circle',data:{sourceRadius:radii.get(e.source)!,targetRadius:radii.get(e.target)!},style:{stroke:e.source===active||e.target===active ? 'var(--theme)' : 'var(--border)',strokeWidth:e.source===active||e.target===active ? 2 : 1.5}}));
  },[map.links,map.topics,active]);
  useEffect(()=>{
    const focusKey=`${active}:${related.map(r=>r.pageId).join(',')}:${mobile}`;
    if(loading || lastFocus.current===focusKey) return;
    const timer=setTimeout(()=>{
      if(!flow.current) return;
      const ids=[active,...related.slice(0,6).map(r=>String(r.pageId))];
      void flow.current.fitView({nodes:ids.map(id=>({id})),padding:mobile ? 0.04 : 0.18,maxZoom:1.15,minZoom:0.55,duration:matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350});
      lastFocus.current=focusKey;
    },100);
    return()=>clearTimeout(timer);
  },[active,related,loading,mobile,map.topics.length]);
  function focus(){const node=map.topics.find(t=>t.id===active);if(node) void flow.current?.setCenter(node.position.x,node.position.y,{zoom:1,duration:300});}
  function toggleFullscreen(){if(!fullscreen){normalViewport.current=flow.current?.getViewport() ?? null;pageScroll.current=window.scrollY;}setFullscreen(previous=>!previous);}
  return <section ref={canvas} className={`graph-canvas${fullscreen ? ' graph-fullscreen' : ''}`} role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? t('Fullscreen mind map') : t('Expanding knowledge map')}><div className="graph-caption"><span className="eyebrow">{t('Mind map · {count} topics',{count:map.topics.length})}</span><p>{t(mobile || fullscreen ? 'Phone map hint' : 'Desktop map hint')}</p>{fullscreen && <button ref={closeButton} className="graph-fullscreen-close" aria-label={t("Close fullscreen mind map")} onClick={()=>setFullscreen(false)}><X size={22}/></button>}</div><div className="graph-surface"><ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} nodeTypes={nodeTypes} onNodeClick={(event,node)=>node.data.select(event.detail===0)} onPaneClick={cancelTap} onMoveStart={cancelTap} onInit={instance=>{flow.current=instance;}} fitView fitViewOptions={{padding:0.04,maxZoom:1}} minZoom={0.15} maxZoom={1.8} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} zoomOnDoubleClick={false} zoomOnScroll={!mobile} preventScrolling={fullscreen || !mobile} proOptions={{hideAttribution:true}}><Background color="var(--border)" gap={24} size={1}/></ReactFlow></div><div className="graph-controls" role="group" aria-label={t("Map controls")}><button aria-label={t("Zoom out")} onClick={()=>void flow.current?.zoomOut()}><Minus size={19}/></button><button aria-label={t("Zoom in")} onClick={()=>void flow.current?.zoomIn()}><Plus size={19}/></button><button aria-label={t("Focus selected topic")} onClick={focus}><LocateFixed size={19}/></button><button aria-label={t("Show entire map")} onClick={()=>void flow.current?.fitView({padding:0.1,duration:300})}><Scan size={19}/><span>{t("Overview")}</span></button>{(mobile || fullscreen) && <button ref={fullscreenButton} aria-label={fullscreen ? t('Exit fullscreen') : t('Fullscreen')} aria-pressed={fullscreen} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}<span>{fullscreen ? t('Exit') : t('Fullscreen')}</span></button>}</div><div className="graph-status" role="status">{loading ? t('Opening connections for {title}…',{title:loading}) : `${article.title} · ${t(!related.length ? 'No new connections available' : mobile || fullscreen ? 'Double tap another topic to keep exploring' : 'Click another topic to keep exploring')}`}</div></section>;
}
