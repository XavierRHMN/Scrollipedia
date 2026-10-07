import type { Metadata } from 'next';
import './globals.css';
import '@xyflow/react/dist/style.css';
import { LibraryProvider } from '@/components/library-provider';
import { AppNav } from '@/components/app-nav';
import {DiscoveryProvider} from '@/components/discovery-provider';
import {StartScreen} from '@/components/start-screen';
import { SettingsProvider } from '@/components/settings-provider';
export const metadata: Metadata = { title: 'Scrollipedia — follow your curiosity', description: 'Discover Wikipedia stories, explore connected ideas, and keep the topics that matter.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SettingsProvider><LibraryProvider><DiscoveryProvider><AppNav/><StartScreen/>{children}</DiscoveryProvider></LibraryProvider></SettingsProvider></body></html>; }
