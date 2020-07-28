<script>
  import {tick} from 'svelte';
  import localForage from 'localforage';
  import debounce from 'lodash.debounce';

  import {pickTaskAndUpdateWeights, toNotification} from './shared.js';

  const pubKey = 'BJ7oD8OHR2U5iaJwqaDPoI652gS4WjdUoRwd2ubwm_cJ7jEhnMvNEqy9RezkqnJuvc8W03X_abaL-hlnjrwY1z4';
  let loaded = {}

  // Helper function for saving - returns a function that saves to 'key'
  function save(key) {
    return debounce(
      value => {
        if (!loaded[key]) {
          console.log(`SKIPPING saving ${key} since it's not loaded yet`)
          return;
        }

        localForage.setItem(key, JSON.stringify(value), err => {
          if (err) {
            alert(`Error saving ${key}: ${err} - putting it into localstorage for backup`)
            window.localStorage.setItem(key, JSON.stringify(value));
          }
        });
      },
      300, { leading: true }
    );
  }

  // Helper function for loading - just loads 'key' then calls cb
  function load(key, cb) {
    loaded[key] = false;
    localForage.getItem(key, (err, value) => {
      if (err) {
        alert(`Error loading ${key}: ${err}`);
      }
      else if (value != null) {
        cb(JSON.parse(value));
      }
      tick().then(() => loaded[key] = true);
    })
  }

  let tasks = [];
  function loadTasks() { load('tasks', v => tasks = v); }
  loadTasks();
  // Save tasks
  const saveTasks = save('tasks');
  $: saveTasks(tasks);

  // Next ID to be used for new tasks
  let nextId = 0;
  load('nextId', v => nextId = v);
  // Save nextId
  const saveNextId = save('nextId');
  $: saveNextId(nextId);

  // Toggle functionality
  let enabled = false;
  load('enabled', v => enabled = v);
  // Save enabled
  const saveEnabled = save('enabled');
  $: saveEnabled(enabled);

  // How long between notifications (in minutes)
  let notificationPeriodMinutes = 5;
  load('period', v => {
    if (typeof(v) === 'number' && !isNaN(v)) {
      notificationPeriodMinutes = v;
    }
  })
  // Save period
  const savePeriod = save('period');
  $: savePeriod(notificationPeriodMinutes);

  // Period in ms for setInterval
  $: notificationPeriodMilliseconds =
    (notificationPeriodMinutes > 0.005) ? notificationPeriodMinutes * 60 * 1000 : 1000;

  // Undo stack
  let restores = [];

  // Perform undo
  function putBack() {
    if (restores.length === 0) return;

    const restoredTask = restores.pop();
    restores = restores;

    tasks = [...tasks, restoredTask];
  }

  // Remove an existing task
  function removeTask(event) {
    const id = event.target.dataset.task;
    const index = tasks.findIndex(t => t.id == id);

    if (index === -1) return;

    restores = [...restores, tasks[index]];
    tasks    = [...tasks.slice(0, index), ...tasks.slice(index+1)];
  }

  // Create a new task
  function createTask() {
    tasks = [...tasks, { id: nextId++, content: '', editable: true, weight: 1.0 }];
  }

  // Task selection bookkeeping
  let notification;

  // Adapted from https://stackoverflow.com/a/55671924
  function chooseIndexWeighted(chances) {
    var sum = chances.reduce((acc, el) => acc + el, 0);
    var acc = 0;
    chances = chances.map(el => (acc = el + acc));
    var rand = Math.random() * sum;
    return chances.filter(el => el <= rand).length;
  }

  // Select next task
  async function nextTask() {
    if (notification) { notification.close() }
    if (tasks.length <= 1) return;

    // Check permission real quick
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      console.error("Can't do much if you deny notifications");
      return;
    }

    // Select task
    const selectedTask = pickTaskAndUpdateWeights(tasks);
    tasks = tasks;

    // Show desktop notification
    notification = new Notification(...toNotification(selectedTask));
    notification.onclick = () => {
      document.getElementById(`task-${selectedTask.id}`).scrollIntoView();
    };
  }

  // Subscribe to notifications
  let subscription;
  const ab2str = buf => String.fromCharCode.apply(null, new Uint16Array(buf));

  $: subscriptionText = subscription ?
    JSON.stringify(subscription, null, 2) : undefined;

  $: if (subscription) {
    window.addEventListener('focus', loadTasks);
  }
  else {
    window.removeEventListener('focus', loadTasks);
  }

  async function subscribe() {
    // Check for existing subscription
    if (!subscription) {
      subscription = await registration.pushManager.getSubscription();
    }
    if (subscription && window.confirm('Subscription exists. Remake it?')) {
      if (await subscription.unsubscribe()) {
        subscription = null;
      }
      else {
        alert("Well... It failed to unsubscribe for some reason.");
        return;
      }
    }

    // Create new subscription if necessary
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: pubKey
      });
    }

    // Present subscription to user. It's up to them to fire it..
    console.log(subscription);
    await tick();
    const element = document.getElementById('subscription-text');
    element.select();
    document.execCommand('copy');
  }

  // Unsubscribe from notifications
  function unsubscribe() {
    if (!subscription) return;

    const backup = subscription;
    subscription.unsubscribe().then(result => {
      if (!result) {
        subscription = backup;
        alert('Failed to unsubscribe somehow...');
      }
    });
    subscription = null;
  }

  // Send notifications every once in awhile
  $: interval = (
    clearInterval(interval) ||
    !enabled ||
    setInterval(
      () => nextTask(),
      notificationPeriodMilliseconds
    )
  );

  // Set up service worker
  let registration;
  if ('serviceWorker' in navigator) {
    // Register a service worker hosted at the root of the
    // site using the default scope.
    navigator.serviceWorker.register('/build/serviceworker.js')
      .then(r => {
        registration = r;
        console.log('Service worker registration succeeded:', registration);

        return r.pushManager.getSubscription();
      })
      .then(sub => {
        subscription = sub;
      })
      .catch(error => {
        console.log('Service worker registration failed:', error);
      });

    // Listen for messages
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.newtasks) {
        console.log('Re-loading tasks');
        loadTasks();
      }
    });
  } else {
    alert('Service workers are not supported.');
  }
</script>

<main>
  <div class='controls'>
    <button class='putBack' disabled={restores.length === 0} on:click={putBack}>⎌</button>

    <label>
      <input type='checkbox' bind:checked={enabled} />
      Enabled
    </label>

    <label>
      Minutes between notifications
      <input type='number' step='0.01' bind:value={notificationPeriodMinutes} />
    </label>

    <button class='subscribe' on:click={subscribe}>Subscribe</button>
    {#if subscription}
      <button class='subscribe' on:click={unsubscribe}>Unsubscribe</button>
    {/if}

    <textarea
      style={subscriptionText ? '' : 'display: none'}
      id='subscription-text'
      bind:value={subscriptionText}
      ></textarea>
  </div>

  <button class='next' on:click={nextTask}>Next</button>

  <div class='tasklist'>
    {#each tasks as task, i}
      <div class='task' class:selected={task.weight === 0}>
        <button class='remove' tabindex={task.id} data-task={task.id} on:click={removeTask}>⮾</button>

        <span class='weight'>{tasks[i].weight}</span>

        <label class='edit'>
          ✎
          <input type='checkbox' tabindex={task.id} data-task={task.id} bind:checked={task.editable} />
        </label>

        <div id={`task-${task.id}`} class='taskbody-wrapper'>
          {#if task.editable}
            <div class='taskbody' contenteditable=true bind:innerHTML={task.content}></div>
          {:else}
            <div class='taskbody'>{@html task.content}</div>
          {/if}
        </div>
      </div>
    {/each}

    <div class='task newtask'>
      <button class='new' on:click={createTask}>New task</button>
    </div>
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;

    --boxsize: 300px;
    --buttonsize: 2em;
    --contentsize: calc((var(--boxsize) - var(--buttonsize)));
  }

  .controls {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    margin-bottom: 0.5em;
  }

  .controls * {
    margin-left: 1em;
    margin-right: 1em;
  }

  .controls label {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
  }

  .controls label * {
    margin: 5px;
  }

  .putBack {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 0.5em 0.5em 0.5em 0.5em;

    width: var(--buttonsize);
    height: var(--buttonsize);
  }

  .putBack:disabled {
    background: #dddde3;
  }

  .subscribe {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 0.5em 0.5em 0.5em 0.5em;
  }

  .tasklist {
    display: flex;
    flex-flow: row wrap;
  }

  .task {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;

    flex-grow: 1;
    width: var(--boxsize);
    height: var(--boxsize);
    text-align: left;

    background-color: aliceblue;
    border: 1px solid darkgrey;

    margin: 10px;
  }

  .selected {
    border: 2px solid blue;
  }

  .newtask {
    background-color: unset;
    border: unset;
  }

  .taskbody-wrapper {
    overflow-y: scroll;
    width: 100%;
    max-height: var(--contentsize);
  }

  .taskbody {
    width: 100%;
    min-height: var(--contentsize);

    white-space: pre-wrap;
    padding: 5px;
  }

  .weight {
    color: #c4c4c4;
  }

  .edit {
    height: 20px;
    margin-right: 5px;
    align-self: center;
  }

  .remove {
    border: none;
    border-radius: 0;
    background-color: red;
    width: var(--buttonsize);
    height: var(--buttonsize);
    padding: 0;
    margin: 0;
  }

  .new {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 2em;
    margin: 0;
  }

  .next {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 1em 3em 1em 3em;
  }
</style>
