import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'To-Do List Fikri',
    short_name: 'To-Do App',
    description: 'Aplikasi manajemen tugas harian yang cepat dan modern',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1016',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      }
    ],
  }
}
