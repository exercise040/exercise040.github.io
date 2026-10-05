/*
 * exercise040 Cat
 *
 * Original oneko.gif artwork.
 * Mouse-tracking movement with a deliberately slower animation cadence.
 */

const world = document.getElementById("world");
const neko = document.getElementById("oneko");
const statusText = document.getElementById("status");

const doors = [...document.querySelectorAll(".door")];
const eventBox = document.getElementById("event-box");
const eventContent = document.getElementById("event-content");
const closeEvent = document.getElementById("close-event");

const cat = {
  x: 100,
  y: 120,

  // Distance moved per animation frame toward the cursor.
  speed: 3.2,

  direction: "S"
};

let mouseX = 100;
let mouseY = 120;
let mouseInside = false;

let nearestDoor = null;
let lastTime = performance.now();

let walkElapsed = 0;
let currentFrame = 0;

// Original oneko sprite-sheet positions.
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

document.addEventListener("mousemove", (event) => {
  const rect = world.getBoundingClientRect();

  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
  mouseInside = true;
});

world.addEventListener("mouseleave", () => {
  mouseInside = false;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    enterNearestDoor();
  }
});

closeEvent.addEventListener("click", () => {
  eventBox.hidden = true;
});

function updateMovement(dt) {
  if (!mouseInside) {
    setSprite("idle", 0);
    statusText.textContent = nearestDoor ? "ENTER" : "IDLE";
    return;
  }

  const dx = mouseX - cat.x;
  const dy = mouseY - cat.y;
  const distance = Math.hypot(dx, dy);

  // Stop close to the cursor instead of sitting directly underneath it.
  const stopDistance = 8;

  if (distance <= stopDistance) {
    setSprite("idle", 0);
    statusText.textContent = nearestDoor ? "ENTER" : "IDLE";
    return;
  }

  const nx = dx / distance;
  const ny = dy / distance;

  /*
   * Frame-rate independent movement.
   * The 0.06 factor makes the cat noticeably calmer than the
   * previous WASD version.
   */
  const step = Math.min(distance - stopDistance, cat.speed * dt);

  cat.x += nx * step;
  cat.y += ny * step;

  const half = 16;
  cat.x = Math.max(half, Math.min(world.clientWidth - half, cat.x));
  cat.y = Math.max(half, Math.min(world.clientHeight - half, cat.y));

  if (nx > 0 && ny < -0.35) cat.direction = "NE";
  else if (nx > 0 && ny > 0.35) cat.direction = "SE";
  else if (nx < 0 && ny < -0.35) cat.direction = "NW";
  else if (nx < 0 && ny > 0.35) cat.direction = "SW";
  else if (nx > 0) cat.direction = "E";
  else if (nx < 0) cat.direction = "W";
  else if (ny < 0) cat.direction = "N";
  else cat.direction = "S";

  /*
   * Slow sprite animation:
   * change frame roughly every 120 ms instead of every render frame.
   */
  walkElapsed += dt * 16.6667;

  if (walkElapsed >= 120) {
    walkElapsed -= 120;
    currentFrame++;
  }

  setSprite(cat.direction, currentFrame);
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

function getDoorCenter(door) {
  const worldRect = world.getBoundingClientRect();
  const rect = door.getBoundingClientRect();

  return {
    x: rect.left - worldRect.left + rect.width / 2,
    y: rect.top - worldRect.top + rect.height / 2
  };
}

function updateNearestDoor() {
  let closest = null;
  let closestDistance = Infinity;

  for (const door of doors) {
    door.classList.remove("near");

    const center = getDoorCenter(door);
    const distance = Math.hypot(
      cat.x - center.x,
      cat.y - center.y
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = door;
    }
  }

  nearestDoor = closestDistance <= 82 ? closest : null;

  if (nearestDoor) {
    nearestDoor.classList.add("near");
  }
}

function enterNearestDoor() {
  if (!nearestDoor) return;

  const type = nearestDoor.dataset.event;

  if (type === "about") {
    showEvent(
      "ABOUT",
      "The cat found the room where exercise040 begins."
    );
  }

  if (type === "projects") {
    showEvent(
      "PROJECTS",
      "Behind this door are experiments, machine learning, quantitative research, and software projects.",
      "../../index.html#projects"
    );
  }

  if (type === "secret") {
    showEvent(
      "???",
      "You found something that was not supposed to be here."
    );
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
