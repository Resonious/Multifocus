import localForage from 'localforage';
import {pickTaskAndUpdateWeights, toNotification} from './shared.js';

async function showTask() {
  // Pull from localForage
  const tasks = JSON.parse(await localForage.getItem('tasks'));
  if (!tasks || tasks.length <= 1) return;

  // Pick task
  const task = pickTaskAndUpdateWeights(tasks);

  // Save tasks and show notification in parellel!
  return Promise.all([
    localForage.setItem('tasks', JSON.stringify(tasks)).then(_ => undefined),
    self.registration.showNotification(...toNotification(task))
  ]);
}

async function openTask(notification) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  });

  notification.close();

  if (clients.length > 0) {
    const client = clients[0];
    client.postMessage({ newtasks: true });
    return client.focus();
  }
  else {
    return self.clients.openWindow(`/#task-${notification.data.id}`);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    self.registration.showNotification(
      'MFocus',
      {
        body: 'Installed! Ready to rumble.',
        icon: '/images/notif.png'
      }
    )
  )
});

self.addEventListener('activate', event => {
  event.waitUntil(
    self.registration.showNotification(
      'MFocus',
      {
        body: 'Successfully updated!',
        icon: '/images/notif.png'
      }
    )
  )
});

self.addEventListener('push', event => {
  event.waitUntil(showTask());
});

self.addEventListener('notificationclick', event => {
  event.waitUntil(openTask(event.notification));
});
