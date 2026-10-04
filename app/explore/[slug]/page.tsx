import { Explore } from '@/components/explore';
import { routeTitle } from '@/lib/wiki-title';
export default async function ExplorePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <Explore title={routeTitle(slug)}/>; }
