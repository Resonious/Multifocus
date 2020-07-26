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

self.addEventListener('install', event => {
  // Hooray!
});

self.addEventListener('push', event => {
  event.waitUntil(showTask());
});
