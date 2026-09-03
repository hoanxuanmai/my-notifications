import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
        'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ihffmhyyvhfwnzdfpndq.supabase.co'
      ),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZmZtaHl5dmhmd256ZGZwbmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNjYwMTcsImV4cCI6MjA1NTk0MjAxN30.example'
      ),
      'process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY': JSON.stringify(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || 'BGk-Oo8bIu07qVCWIg_v2HqI0T9wjoV2exOmVr5u49uSA9sZVpsUQybXh6lbyG9sEfsMSuwYLt3CpQr5-twwkwQ'
      ),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
