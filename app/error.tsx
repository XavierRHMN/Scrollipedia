'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="empty-state"><h1>Something interrupted your exploration.</h1><p>Give it another try.</p><Button onClick={reset}>Try again</Button></main>; }
