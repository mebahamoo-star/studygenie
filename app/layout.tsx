import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'StudyGenie — Your magical study companion', description: 'A focused study companion for university students.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body>{children}</body></html>; }
