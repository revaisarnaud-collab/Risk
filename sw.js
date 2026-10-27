// Met l'appli en cache pour qu'elle fonctionne sans réseau.
// Changer VERSION à chaque mise à jour pour que les téléphones récupèrent les nouveaux fichiers.
const VERSION = 'v4';
const CARDS = ['red-murat', 'red-redcoat', 'red-lancer', 'red-moore', 'blue-napoleon', 'blue-ney', 'blue-grognard', 'blue-hussar'];
const FILES = [
  ...CARDS.flatMap((id) => [
    `assets/cards/${id}-passive.webp`,
    `assets/cards/${id}-aggressive.webp`,
    `assets/cries/${id}.mp3`,
  ]),
  'assets/cards/frame.svg',
  'assets/map.webp',
  './',
  'index.html',
  'style.css',
  'app.js',
  'rules.js',
  'audio.js',
  'manifest.webmanifest',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
