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

  $: notificationPeriodMilliseconds =
    (notificationPeriodMinutes > 0.005) ? notificationPeriodMinutes * 60 * 1000 : 1000;

  // Remove an existing task
  function removeTask(event) {
    const id = event.target.dataset.task;
    tasks = tasks.filter(t => t.id != id);
  }

  // Create a new task
  function createTask() {
    tasks = [...tasks, { id: nextId++, content: '' }];
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
  <label>
    Minutes between notifications
    <input type='number' step='0.01' bind:value={notificationPeriodMinutes} />
  </label>

  <label>
    <input type='checkbox' bind:checked={enabled} />
    Enabled
  </label>

  <button class='next' on:click={nextTask}>Next</button>

  <div class='tasklist'>
    {#each tasks as {id, content}}
      <div class='task' class:selected={selectedTaskId == id}>
        <button class='remove' tabindex={id} data-task={id} on:click={removeTask}>⮾</button>
        <div class='taskbody' contenteditable=true bind:innerHTML={content}></div>
      </div>
    {/each}

    <div class='task newtask'>
      <div class='taskbody'>
        <button class='new' on:click={createTask}>New task</button>
      </div>
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

  .tasklist {
    display: flex;
    flex-flow: row wrap;
  }

  .task {
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
    min-height: calc((var(--boxsize) - var(--buttonsize)) * 0.9);

    white-space: pre-wrap;
  }

  .remove {
    border: none;
    border-radius: 0;
    background-color: red;
    width: var(--buttonsize);
    height: var(--buttonsize);
    padding: 0;
  }

  .new {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 2em;
  }

  .next {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 1em 3em 1em 3em;
  }
</style>
