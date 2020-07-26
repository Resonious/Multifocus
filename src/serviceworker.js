// import localforage from 'localforage';

self.addEventListener('install', event => {
  console.log('does htis appear??');
});

self.addEventListener('push', event => {
  event.waitUntil(
    self.registration.showNotification('it worked', {
      body: 'the fuck?'
    })
  );
});
