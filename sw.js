// sw.js - Service Worker для PWA
const CACHE_NAME = 'flow-music-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap',
  'https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.0/firebase-database-compat.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Установлен');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Активирован');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Удаление старого кеша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем запросы к Firebase
  if (event.request.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем кешированную версию или делаем запрос
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          // Проверяем валидный ли ответ
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Клонируем ответ
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Fallback для offline
        if (event.request.url.includes('.html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// Фоновая синхронизация (для будущих функций)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Фоновая синхронизация');
  }
});

// Push уведомления (для будущих функций)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть',
        icon: 'icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: 'icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Flow Music', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});