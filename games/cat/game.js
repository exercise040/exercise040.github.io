/*
 * exercise040 Cat
 *
 * The artwork is the original oneko.gif sprite sheet.
 * Input is changed to direct WASD movement.
 */

const world = document.getElementById("world");
const neko = document.getElementById("oneko");
const statusText = document.getElementById("status");

const doors = [...document.querySelectorAll(".door")];
const eventBox = document.getElementById("event-box");
const eventContent = document.getElementById("event-content");
const closeEvent = document.getElementById("close-event");

const keys = new Set();

const cat = {
  x: 100,
  y: 120,
  speed: 5.5,
  direction: "S"
};

let nearestDoor = null;
let lastTime = performance.now();
let walkTick = 0;

/*
 * oneko's sprite sheet is a 256x128 image made of 32x32 cells.
 * The positions below select the original directional frames.
 */
const sprites = {
  idle: [[-3, -3]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]]
};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["w", "a", "s", "d", "enter"].includes(key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === "enter") {
    enterNearestDoor();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

closeEvent.addEventListener("click", () => {
  eventBox.hidden = true;
});

function readInput() {
  let dx = 0;
  let dy = 0;

  if (keys.has("a")) dx -= 1;
  if (keys.has("d")) dx += 1;
  if (keys.has("w")) dy -= 1;
  if (keys.has("s")) dy += 1;

  return { dx, dy };
}

function updateMovement(dt) {
  const { dx: rawX, dy: rawY } = readInput();

  if (rawX === 0 && rawY === 0) {
    setSprite("idle", 0);
    statusText.textContent = nearestDoor ? "ENTER" : "IDLE";
    return;
  }

  const length = Math.hypot(rawX, rawY);
  const dx = rawX / length;
  const dy = rawY / length;

  cat.x += dx * cat.speed * dt;
  cat.y += dy * cat.speed * dt;

  const half = 16;

  cat.x = Math.max(half, Math.min(world.clientWidth - half, cat.x));
  cat.y = Math.max(half, Math.min(world.clientHeight - half, cat.y));

  if (dx > 0 && dy < 0) cat.direction = "NE";
  else if (dx > 0 && dy > 0) cat.direction = "SE";
  else if (dx < 0 && dy < 0) cat.direction = "NW";
  else if (dx < 0 && dy > 0) cat.direction = "SW";
  else if (dx > 0) cat.direction = "E";
  else if (dx < 0) cat.direction = "W";
  else if (dy < 0) cat.direction = "N";
  else cat.direction = "S";

  walkTick += dt;

  const frames = sprites[cat.direction];
  const frame = Math.floor(walkTick * 12) % frames.length;

  setSprite(cat.direction, frame);

  statusText.textContent = nearestDoor ? "ENTER" : "EXPLORE";
}

function setSprite(name, frame) {
  const frames = sprites[name] || sprites.idle;
  const [x, y] = frames[frame % frames.length];

  neko.style.backgroundPosition = `${x * 32}px ${y * 32}px`;
}

function render() {
  neko.style.left = `${cat.x - 16}px`;
  neko.style.top = `${cat.y - 16}px`;
}

function doorCenter(door) {
  const worldRect = world.getBoundingClientRect();
  const rect = door.getBoundingClientRect();

  return {
    x: rect.left - worldRect.left + rect.width / 2,
    y: rect.top - worldRect.top + rect.height / 2
  };
}

function updateNearestDoor() {
  let closest = null;
  let distance = Infinity;

  for (const door of doors) {
    door.classList.remove("near");

    const center = doorCenter(door);
    const d = Math.hypot(cat.x - center.x, cat.y - center.y);

    if (d < distance) {
      distance = d;
      closest = door;
    }
  }

  nearestDoor = distance <= 82 ? closest : null;

  if (nearestDoor) {
    nearestDoor.classList.add("near");
  }
}

function enterNearestDoor() {
  if (!nearestDoor) return;

  switch (nearestDoor.dataset.event) {
    case "about":
      showEvent(
        "ABOUT",
        "The cat found the room where exercise040 begins."
      );
      break;

    case "projects":
      showEvent(
        "PROJECTS",
        "Behind this door are experiments, machine learning, quantitative research, and software projects.",
        "../../index.html#projects"
      );
      break;

    case "secret":
      showEvent(
        "???",
        "You found something that was not supposed to be here."
      );
      break;
  }
}

function showEvent(title, text, link = null) {
  eventContent.innerHTML = `
    <h2 class="event-title">${title}</h2>
    <p class="event-text">${text}</p>
    ${link ? `<a class="event-link" href="${link}">OPEN PROJECTS →</a>` : ""}
  `;

  eventBox.hidden = false;
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 16.6667, 2);
  lastTime = now;

  updateMovement(dt);
  updateNearestDoor();
  render();

  requestAnimationFrame(loop);
}

setSprite("idle", 0);
render();
requestAnimationFrame(loop);
