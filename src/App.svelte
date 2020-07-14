<script>
  export let name;

  let tasks = [
    {
      id: 0,
      content: 'one task'
    },
    {
      id: 1,
      content: 'two task'
    }
  ];

  let nextId = tasks.length;

  function removeTask(event) {
    const id = event.target.dataset.task;
    tasks = tasks.filter(t => t.id != id);
  }

  function createTask() {
    tasks = tasks.concat([{
      id: nextId++,
      content: ''
    }])
  }
</script>

<main>
  <div class='tasklist'>
    {#each tasks as {id, content}}
      <div class='task'>
        <button class='remove' data-task={id} on:click={removeTask}>⮾</button>
        <div class='taskbody' contenteditable=true>{content}</div>
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

  .newtask {
    background-color: unset;
    border: unset;
  }

  .taskbody {
    width: 100%;
    min-height: calc(var(--boxsize) - var(--buttonsize));

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
