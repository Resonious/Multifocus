<script>
  // TODO load these bad boys from localstorage or something
  let tasks = [];

  // Next ID to be used for new tasks
  let nextId = tasks.length;

  // Toggle functionality
  let enabled = true;

  // How long between notifications (in minutes)
  let notificationPeriodMinutes = 1.1;
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

  // Get permission to send notifiactions
  Notification.requestPermission().then((permission) => {
    if (permission !== 'granted') {
      console.error("Can't do much if you deny notifications");
      return;
    }
  });

  // Send notifications every once in awhile
  let notification;
  let selectedTaskId;
  $: interval = (
    clearInterval(interval) ||
    setInterval(
      () => {
        if (notification) { notification.close() }
        if (!enabled) return;
        const task = tasks[Math.floor(Math.random() * tasks.length)];
        if (task == undefined) return;

        const strippedContent = task.content.replace(/(<([^>]+)>)/ig, ' ');

        selectedTaskId = task.id;
        notification = new Notification('Multifocus', { body: strippedContent })
      },
      notificationPeriodMilliseconds
    )
  );
</script>

<main>
  <label>
    Minutes between notifications
    <input type='number' bind:value={notificationPeriodMinutes} />
  </label>

  <label>
    <input type='checkbox' bind:checked={enabled} />
    Enabled
  </label>

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
</style>
