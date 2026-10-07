import type { Metadata } from 'next';
import './globals.css';
import '@xyflow/react/dist/style.css';
import { LibraryProvider } from '@/components/library-provider';
import { AppNav } from '@/components/app-nav';
import {DiscoveryProvider} from '@/components/discovery-provider';
import {StartScreen} from '@/components/start-screen';
import { SettingsProvider } from '@/components/settings-provider';
export const metadata: Metadata = { title: 'Scrollipedia — addictive learning', description: 'Wikipedia, one article at a time. Discover short reads, explore connected ideas, and save your discoveries.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SettingsProvider><LibraryProvider><DiscoveryProvider><AppNav/><StartScreen/>{children}</DiscoveryProvider></LibraryProvider></SettingsProvider></body></html>; }
