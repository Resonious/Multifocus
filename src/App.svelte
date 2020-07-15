<script>
  // Master list of tasks
  let tasks = JSON.parse(window.localStorage.getItem('tasks')) || [];
  // Save tasks
  $: window.localStorage.setItem('tasks', JSON.stringify(tasks));

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
  let notificationPeriodMinutes = JSON.parse(window.localStorage.getItem('period')) || 2.0;
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
    tasks = [...tasks, restoredTask];
    restores = restores;
  }

  // Remove an existing task
  function removeTask(event) {
    const id = event.target.dataset.task;
    const index = tasks.findIndex(t => t.id == id);

    if (index === -1) return;

    restores = [...restores, tasks[index]];
    tasks.splice(index, 1);
    tasks = tasks;
  }

  // Create a new task
  function createTask() {
    tasks = [...tasks, { id: nextId++, content: '', editable: true }];
  }

  // Select another task
  let notification;
  let selectedTask;
  $: selectedTaskId = selectedTask ? selectedTask.id : null;

  function nextTask() {
    if (notification) { notification.close() }
    if (tasks.length <= 1) return;

    let taskIndex = Math.floor(Math.random() * tasks.length);
    while (tasks[taskIndex].id === selectedTaskId)
      taskIndex = Math.floor(Math.random() * tasks.length);

    selectedTask = tasks[taskIndex];
    const strippedContent = selectedTask.content.replace(/(<([^>]+)>)/ig, ' ');

    notification = new Notification('Multifocus', { body: strippedContent })
  }

  // Get permission to send notifiactions
  Notification.requestPermission().then((permission) => {
    if (permission !== 'granted') {
      console.error("Can't do much if you deny notifications");
      return;
    }
  });

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
  </div>

  <button class='next' on:click={nextTask}>Next</button>

  <div class='tasklist'>
    {#each tasks as task}
      <div class='task' class:selected={selectedTaskId === task.id}>
        <button class='remove' tabindex={task.id} data-task={task.id} on:click={removeTask}>⮾</button>

        <label class='edit'>
          ✎
          <input type='checkbox' tabindex={task.id} data-task={task.id} bind:checked={task.editable} />
        </label>

        {#if task.editable}
          <div class='taskbody' contenteditable=true bind:innerHTML={task.content}></div>
        {:else}
          <div class='taskbody'>{@html task.content}</div>
        {/if}
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

  .tasklist {
    display: flex;
    flex-flow: row wrap;
  }

  .task {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;

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

  .taskbody {
    width: 100%;
    min-height: calc((var(--boxsize) - var(--buttonsize)));

    white-space: pre-wrap;
    padding: 5px;
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
