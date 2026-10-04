'use client';
import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Compass } from 'lucide-react';
import type { WikiArticle, RelatedTopic } from '@/types';
type TopicNodeData = { title: string; description: string; center: boolean; thumbnail?: string };
type TopicFlowNode = Node<TopicNodeData, 'topic'>;
function TopicNode({ data }: NodeProps<TopicFlowNode>) { return <div className={data.center ? 'topic-node center-node' : 'topic-node'}><Handle type="target" position={Position.Left}/>{data.center ? <span className="node-symbol"><Compass size={24}/></span> : <span className="node-eyebrow">{data.description}</span>}<strong>{data.title}</strong>{data.center && <span className="node-eyebrow">Current topic</span>}<Handle type="source" position={Position.Right}/></div>; }
const nodeTypes = { topic: TopicNode };
export function KnowledgeGraph({ article, related, onSelect }: { article: WikiArticle; related: RelatedTopic[]; onSelect: (title: string) => void }) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => { const media = window.matchMedia('(max-width: 799px)'); const update = () => setMobile(media.matches); update(); media.addEventListener('change',update); return () => media.removeEventListener('change',update); }, []);
  const nodes = useMemo<TopicFlowNode[]>(() => [{ id: 'center', type: 'topic', position: mobile ? { x: 95, y: 0 } : { x: 0, y: 0 }, data: { title: article.title, description: '', center: true }, draggable: false }, ...related.slice(0,6).map((r,i) => ({ id: String(r.pageId), type: 'topic' as const, position: mobile ? { x: i % 2 === 0 ? -40 : 260, y: i < 2 ? -170 : i < 4 ? 190 : 360 } : { x: i < 3 ? -340 : 340, y: ((i % 3) - 1) * 190 }, data: { title: r.title, description: r.reason, center: false }, draggable: false }))], [article, related, mobile]);
  const edges = useMemo(() => related.slice(0,6).map((r,i) => ({ id: `e-${r.pageId}`, source: i < 3 ? String(r.pageId) : 'center', target: i < 3 ? 'center' : String(r.pageId), type: 'smoothstep', style: { stroke: 'var(--muted)', strokeWidth: 1.4 } })), [related]);
  return <div className="graph-canvas" aria-label={`Knowledge graph for ${article.title}`}><ReactFlow key={`${article.pageId}-${mobile}-${related.map(r => r.pageId).join('-')}`} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => { if (node.id !== 'center') onSelect(node.data.title); }} fitView fitViewOptions={{ padding: mobile ? 0.15 : 0.25, maxZoom: 1 }} minZoom={0.3} maxZoom={1.5} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}><Background color="var(--border)" gap={24} size={1}/><Controls showInteractive={false} position={mobile ? 'top-right' : 'bottom-left'}/></ReactFlow><div className="graph-caption"><span className="eyebrow">Related topics</span><p>Select a topic to explore its connections.</p></div></div>;
}
