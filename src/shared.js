import localForage from 'localforage';

const allTags = /(<([^>]+)>)/ig;
const lineBreaks = /<\s*((br\s*\/?)|(\/\s*div)|(\/\s*p))\s*>/ig;
const separateOutFirstLine = /^([^\n]+)\n(.*)$/mus;

// Choose weighted random index from list of weights
function chooseIndexWeighted(chances) {
  var sum = chances.reduce((acc, el) => acc + el, 0);
  var acc = 0;
  chances = chances.map(el => (acc = el + acc));
  var rand = Math.random() * sum;
  return chances.filter(el => el <= rand).length;
}

// Remove HTML tags
export function stripContent(content) {
  return content
    .replace(lineBreaks, "\n")
    .replace(allTags, ' ')
    .trim();
}

// Returns next task and mutates weights
export function pickTaskAndUpdateWeights(tasks) {
  if (tasks.length === 0) return null;

  // Pick a task from weights
  const weights = tasks.map(t => t.weight == null ? 1 : t.weight);
  const index = chooseIndexWeighted(weights);

  // Adjust weights (selected one goes down, other ones go up)
  for (let i = 0; i < tasks.length; ++i) {
    if (tasks[i].weight == null)    tasks[i].weight = 1.0;
    else if (tasks[i].weight === 0) tasks[i].weight = 0.5;
    else if (i == index)            tasks[i].weight = 0;
    else                            tasks[i].weight *= 1.5;
  }

  return tasks[index];
}

// Returns Notification constructor args for the given task
export function toNotification(task) {
  // Start by removing tags
  const stripped = stripContent(task.content);

  // Default to just header text
  let header = stripped;
  let body;

  // Try to break off first line and use it as header
  if (stripped.includes("\n")) {
    const [_, head, tail] = separateOutFirstLine.exec(stripped);
    header = head.trim();
    body = tail.trim();
  }

  // Don't put long content into header
  if (header.length > 80) {
    header = 'MFocus';
    body = stripped;
  }

  // These are arguments to the Notification constructor!
  return [header, { body, data: task, icon: '/images/notif.png' }]
}
