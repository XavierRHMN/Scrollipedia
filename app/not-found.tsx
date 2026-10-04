import Link from 'next/link';
export default function NotFound() { return <main className="empty-state"><h1>This trail ends here.</h1><Link href="/scroll">Discover another topic</Link></main>; }
