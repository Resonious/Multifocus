<script>
  export let name;

  let tasks = ['one', 'two'];
</script>

<main>
  <div class='tasklist'>
    {#each tasks as task}
      <div class='task'>
        <button class='remove'>⮾</button>
        <div class='taskbody'>
          {task}
        </div>
      </div>
    {/each}

    <div class='task newtask'>
      <div class='taskbody'>
        <button class='new'>New task</button>
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
    display: flex;
    flex-flow: row wrap;
    justify-content: center;
    align-items: center;

    width: 100%;
    height: 100%;
  }

  .remove {
    position: absolute;

    border: none;
    border-radius: 0;
    background-color: red;
    width: 2em;
    height: 2em;
  }

  .new {
    border: none;
    border-radius: 0;
    background-color: #9f9ff8;
    padding: 2em;
  }
</style>
