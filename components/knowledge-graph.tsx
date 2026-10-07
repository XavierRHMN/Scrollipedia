'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Background,Handle,Position,BaseEdge,type EdgeProps,type Edge,type NodeProps,type Node,type ReactFlowInstance} from '@xyflow/react';
import {Plus,Minus,Scan,LocateFixed,LoaderCircle,Check} from 'lucide-react';
import type {WikiArticle,RelatedTopic} from '@/types';
import {expandMap,type MindMap} from '@/lib/mind-map';
type TopicNodeData={title:string;diameter:number;active:boolean;root:boolean;expanded:boolean;loading:boolean;select:()=>void};
type TopicFlowNode=Node<TopicNodeData,'topic'>;
function TopicNode({data}:NodeProps<TopicFlowNode>){
  return <><Handle type="target" position={Position.Top}/><button className={`topic-node nodrag nopan ${data.active ? 'center-node' : ''} ${data.root ? 'root-node' : ''}`} style={{width:data.diameter,height:data.diameter}} aria-label={`Explore connections for ${data.title}`} aria-pressed={data.active} onClick={event=>{event.stopPropagation();data.select();}}><strong>{data.title}</strong><span className="node-state">{data.loading ? <LoaderCircle size={13} className="spin"/> : data.expanded ? <Check size={13}/> : <Plus size={13}/>}<span>{data.loading ? 'Loading' : data.expanded ? 'Explored' : 'Expand'}</span></span></button><Handle type="source" position={Position.Bottom}/></>;
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
  const root=useRef(String(article.pageId));
  const [map,setMap]=useState<MindMap>(()=>expandMap({topics:[],links:[]},article,related,!loading&&complete));
  const [mobile,setMobile]=useState(false);
  const flow=useRef<ReactFlowInstance<TopicFlowNode,CircleFlowEdge> | null>(null);
  const active=String(article.pageId), lastFocus=useRef('');
  useEffect(()=>{const media=matchMedia('(max-width: 799px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{setMap(previous=>expandMap(previous,article,related,!loading&&complete));},[article,related,loading,complete]);
  const nodes=useMemo<TopicFlowNode[]>(()=>map.topics.map(t=>({id:t.id,type:'topic',position:t.position,origin:[0.5,0.5],width:t.diameter,height:t.diameter,draggable:false,data:{title:t.article.title,diameter:t.diameter,active:t.id===active,root:t.id===root.current,expanded:t.expanded,loading:t.article.title===loading,select:()=>onSelect(t.article.title)}})),[map.topics,active,loading,onSelect]);
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
  return <section className="graph-canvas" aria-label="Expanding knowledge map"><div className="graph-caption"><span className="eyebrow">Mind map · {map.topics.length} topics</span><p>Tap a circle to grow a branch. Drag to move around.</p></div><div className="graph-surface"><ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} nodeTypes={nodeTypes} onNodeClick={(_,node)=>onSelect(node.data.title)} onInit={instance=>{flow.current=instance;}} fitView fitViewOptions={{padding:0.04,maxZoom:1}} minZoom={0.15} maxZoom={1.8} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} zoomOnDoubleClick={false} zoomOnScroll={!mobile} preventScrolling={!mobile} proOptions={{hideAttribution:true}}><Background color="var(--border)" gap={24} size={1}/></ReactFlow></div><div className="graph-controls" role="group" aria-label="Map controls"><button aria-label="Zoom out" onClick={()=>void flow.current?.zoomOut()}><Minus size={19}/></button><button aria-label="Zoom in" onClick={()=>void flow.current?.zoomIn()}><Plus size={19}/></button><button aria-label="Focus selected topic" onClick={focus}><LocateFixed size={19}/></button><button aria-label="Show entire map" onClick={()=>void flow.current?.fitView({padding:0.1,duration:300})}><Scan size={19}/><span>Overview</span></button></div><div className="graph-status" role="status">{loading ? `Opening connections for ${loading}…` : `${article.title}${!related.length ? ' · No new connections available' : ' · Tap another topic to keep exploring'}`}</div></section>;
}
