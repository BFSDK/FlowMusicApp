// sw.js - Service Worker для Flow Music
const CACHE_NAME = 'flow-music-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🎵 Service Worker: Установка');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🎵 Service Worker: Кеширование основных файлов');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🎵 Service Worker: Установка завершена');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('🎵 Service Worker: Ошибка установки', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🎵 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🎵 Service Worker: Удаление старого кеша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎵 Service Worker: Активация завершена');
      return self.clients.claim();
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Firebase и внешние ресурсы
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  // Для аудио файлов - сеть сначала, потом кеш
  if (event.request.url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кешированную версию
        if (response) {
          return response;
        }

        // Делаем сетевой запрос
        return fetch(event.request)
          .then((response) => {
            // Проверяем валидный ли ответ
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кеширования
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Кешируем только HTML, CSS, JS
                if (event.request.url.match(/\.(html|css|js|json)$/)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Fallback для offline
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🎵 Service Worker: Фоновая синхронизация');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Здесь может быть фоновая синхронизация данных
  console.log('🎵 Выполняется фоновая синхронизация');
}

// Push уведомления
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Flow Music', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.url || '/',
    actions: [
      {
        action: 'play',
        title: '🎵 Воспроизвести',
      },
      {
        action: 'close',
        title: '❌ Закрыть'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Flow Music', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'play') {
    // Действие для воспроизведения
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        if (windowClients.length > 0) {
          return windowClients[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  } else if (event.action === 'close') {
    // Ничего не делаем, просто закрываем
  } else {
    // Клик по самому уведомлению
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        if (windowClients.length > 0) {
          return windowClients[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Сообщения от главного потока
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
