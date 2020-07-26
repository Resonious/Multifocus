<script>
  import {tick} from 'svelte';

  const pubKey = 'BJ7oD8OHR2U5iaJwqaDPoI652gS4WjdUoRwd2ubwm_cJ7jEhnMvNEqy9RezkqnJuvc8W03X_abaL-hlnjrwY1z4';

  // Master list of tasks
  let tasks = JSON.parse(window.localStorage.getItem('tasks')) || [];
  // Save tasks
  $: window.localStorage.setItem('tasks', JSON.stringify(tasks));

  // Task selection weights (not saved) (manually kept parallel with tasks)
  let weights = tasks.map(() => 1);

  // Next ID to be used for new tasks
  let nextId = JSON.parse(window.localStorage.getItem('nextId')) || tasks.length;
  // Save nextId
  $: window.localStorage.setItem('nextId', JSON.stringify(nextId));

  // Toggle functionality
  let enabled = window.localStorage.getItem('enabled') === null ?
     true : JSON.parse(window.localStorage.getItem('enabled'));
  // Save enabled
  $: window.localStorage.setItem('enabled', JSON.stringify(enabled));

  // How long between notifications (in minutes)
  let notificationPeriodMinutes = (() => {
    const loaded = parseInt(window.localStorage.getItem('period'));
    return isNaN(loaded) ? 5 : loaded;
  })();
  // Save period
  $: window.localStorage.setItem('period', JSON.stringify(notificationPeriodMinutes));

  // Period in ms for setInterval
  $: notificationPeriodMilliseconds =
    (notificationPeriodMinutes > 0.005) ? notificationPeriodMinutes * 60 * 1000 : 1000;

  // Undo stack
  let restores = [];

  function putBack() {
    if (restores.length === 0) return;

    const restoredTask = restores.pop();
    restores = restores;

    tasks   = [...tasks,   restoredTask];
    weights = [...weights, 1];
  }

  // Remove an existing task
  function removeTask(event) {
    const id = event.target.dataset.task;
    const index = tasks.findIndex(t => t.id == id);

    if (index === -1) return;

    restores = [...restores, tasks[index]];
    tasks    = [...tasks.slice(0, index),   ...tasks.slice(index+1)];
    weights  = [...weights.slice(0, index), ...weights.slice(index+1)];
  }

  // Create a new task
  function createTask() {
    tasks   = [...tasks, { id: nextId++, content: '', editable: true }];
    weights = [...weights, 1];
  }

  // Task selection bookkeeping
  let notification;
  let selectedTask;
  $: selectedTaskId = selectedTask ? selectedTask.id : null;

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

    // Pick a task from weights
    const index = chooseIndexWeighted(weights);
    selectedTask = tasks[index];

    // Adjust weights (selected one goes down, other ones go up)
    for (let i = 0; i < tasks.length; ++i) {
      if (weights[i] === 0) weights[i] = 0.5;
      else if (i == index)  weights[i] = 0;
      else                  weights[i] *= 1.5;
    }

    // Show desktop notification
    const strippedContent = selectedTask.content.replace(/(<([^>]+)>)/ig, ' ');
    notification = new Notification('Multifocus', { body: strippedContent })
    notification.onclick = () => {
      document.getElementById(`task-${selectedTask.id}`).scrollIntoView();
    };
  }

  // Subscribe to notifications
  let subscription;
  const ab2str = buf => String.fromCharCode.apply(null, new Uint16Array(buf));
  $: subscriptionText = subscription ?
    JSON.stringify(subscription, null, 2) : undefined;
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
      () => {
        nextTask();
      },
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
      <div class='task' class:selected={selectedTaskId === task.id}>
        <button class='remove' tabindex={task.id} data-task={task.id} on:click={removeTask}>⮾</button>

        <span class='weight'>{weights[i]}</span>

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
    min-width: var(--boxsize);
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
