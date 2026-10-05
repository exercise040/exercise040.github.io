/*
 * exercise040 — Oneko-style Cat
 *
 * Uses the original oneko.gif supplied with the project.
 *
 * Behaviors:
 * - Starts in the center
 * - Follows the mouse slowly (about half the previous speed)
 * - Sleeps after inactivity
 * - Wakes when the mouse moves
 * - Click causes a reaction
 * - Repeated clicks trigger the face-washing animation
 * - Running animation uses the original 8 directional sprites
 * - ENTER opens a nearby door
 */

const world = document.getElementById("world");
const neko = document.getElementById("oneko");
const statusEl = document.getElementById("status");
const stateEl = document.getElementById("cat-state");

const doors = [...document.querySelectorAll(".door")];
const eventBox = document.getElementById("event-box");
const eventContent = document.getElementById("event-content");
const closeEvent = document.getElementById("close-event");

const cat = {
  x: 0,
  y: 0,

  // Roughly half the previous 3.2 speed.
  speed: 1.6,

  direction: "S"
};

const mouse = {
  x: 0,
  y: 0,
  active: false,
  moved: false
};

let nearestDoor = null;

let lastTime = performance.now();
let idleTime = 0;

let idleAnimation = null;
let idleAnimationFrame = 0;

let walkingFrame = 0;
let walkingTimer = 0;

let clickTimes = [];
let clickReactionUntil = 0;

const SPRITE = 32;

/*
 * Original oneko sprite positions.
 */
const spriteSets = {
  idle: [[-3, -3]],

  alert: [[-7, -3]],

  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0]
  ],

  scratchWallN: [
    [0, 0],
    [0, -1]
  ],

  scratchWallS: [
    [-7, -1],
    [-6, -2]
  ],

  scratchWallE: [
    [-2, -2],
    [-2, -3]
  ],

  scratchWallW: [
    [-4, 0],
    [-4, -1]
  ],

  tired: [[-3, -2]],

  sleeping: [
    [-2, 0],
    [-2, -1]
  ],

  N: [
    [-1, -2],
    [-1, -3]
  ],

  NE: [
    [0, -2],
    [0, -3]
  ],

  E: [
    [-3, 0],
    [-3, -1]
  ],

  SE: [
    [-5, -1],
    [-5, -2]
  ],

  S: [
    [-6, -3],
    [-7, -2]
  ],

  SW: [
    [-5, -3],
    [-6, -1]
  ],

  W: [
    [-4, -2],
    [-4, -3]
  ],

  NW: [
    [-1, 0],
    [-1, -1]
  ]
};

function setSprite(name, frame = 0) {
  const frames = spriteSets[name] || spriteSets.idle;
  const [x, y] = frames[frame % frames.length];

  neko.style.backgroundPosition =
    `${x * SPRITE}px ${y * SPRITE}px`;
}

function setState(text) {
  statusEl.textContent = text;
  stateEl.textContent = text;
}

/*
 * Put the cat at the exact center of the game world.
 *
 * Browsers do not allow JavaScript to physically move the user's
 * OS cursor to the center, so the initial target is centered instead.
 */
function centerCatAndTarget() {
  cat.x = world.clientWidth / 2;
  cat.y = world.clientHeight / 2;

  mouse.x = cat.x;
  mouse.y = cat.y;
}

window.addEventListener("resize", () => {
  if (!mouse.moved) {
    centerCatAndTarget();
  }

  clampCat();
});

world.addEventListener("mousemove", (event) => {
  const rect = world.getBoundingClientRect();

  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;

  mouse.active = true;
  mouse.moved = true;

  /*
   * Any genuine mouse movement wakes the cat.
   */
  if (idleAnimation) {
    resetIdleAnimation();
  }

  idleTime = 0;
});

world.addEventListener("mouseleave", () => {
  mouse.active = false;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    enterNearestDoor();
  }
});

/*
 * Click reaction.
 *
 * Every click wakes the cat. If the user clicks repeatedly,
 * the original scratchSelf/face-washing animation is triggered.
 */
world.addEventListener("click", (event) => {
  const rect = world.getBoundingClientRect();

  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
  mouse.active = true;
  mouse.moved = true;

  idleTime = 0;

  const now = performance.now();

  clickTimes = clickTimes.filter(
    (time) => now - time < 4500
  );

  clickTimes.push(now);

  if (clickTimes.length >= 5) {
    clickTimes = [];
    startIdleAnimation("scratchSelf");
    clickReactionUntil = now + 1200;
    return;
  }

  /*
   * A single click produces the alert reaction.
   * The actual oneko alert sprite is one frame.
   */
  idleAnimation = null;
  idleAnimationFrame = 0;
  setSprite("alert", 0);
  clickReactionUntil = now + 450;
  setState("귀찮아한다");
});

closeEvent.addEventListener("click", () => {
  eventBox.hidden = true;
});

function clampCat() {
  const half = 16;

  cat.x = Math.max(
    half,
    Math.min(world.clientWidth - half, cat.x)
  );

  cat.y = Math.max(
    half,
    Math.min(world.clientHeight - half, cat.y)
  );
}

function updateMovement(dt) {
  /*
   * Special animation has priority.
   */
  if (idleAnimation) {
    updateIdleAnimation();
    return;
  }

  /*
   * Click reaction briefly overrides movement.
   */
  if (performance.now() < clickReactionUntil) {
    setState("귀찮아한다");
    return;
  }

  const dx = mouse.x - cat.x;
  const dy = mouse.y - cat.y;
  const distance = Math.hypot(dx, dy);

  /*
   * Much slower than the previous version.
   */
  const stopDistance = 18;

  if (!mouse.active || distance <= stopDistance) {
    idleTime += dt;

    /*
     * After a few seconds of doing nothing, begin the original
     * oneko-style idle/sleep behavior.
     */
    if (idleTime > 5) {
      maybeStartIdleAnimation();
    } else {
      setSprite("idle", 0);
      setState("귀찮아한다");
    }

    return;
  }

  /*
   * Moving toward the cursor.
   */
  idleTime = 0;

  const nx = dx / distance;
  const ny = dy / distance;

  const step = Math.min(
    distance - stopDistance,
    cat.speed * dt
  );

  cat.x += nx * step;
  cat.y += ny * step;

  clampCat();

  updateDirection(nx, ny);

  /*
   * Original two-frame running animation.
   * Deliberately slow so it does not look like a fast GIF.
   */
  walkingTimer += dt;

  if (walkingTimer >= 0.12) {
    walkingTimer = 0;
    walkingFrame++;
  }

  setSprite(
    cat.direction,
    walkingFrame
  );

  setState("뛴다");
}

function updateDirection(nx, ny) {
  if (nx > 0 && ny < -0.35) {
    cat.direction = "NE";
  } else if (nx > 0 && ny > 0.35) {
    cat.direction = "SE";
  } else if (nx < 0 && ny < -0.35) {
    cat.direction = "NW";
  } else if (nx < 0 && ny > 0.35) {
    cat.direction = "SW";
  } else if (nx > 0) {
    cat.direction = "E";
  } else if (nx < 0) {
    cat.direction = "W";
  } else if (ny < 0) {
    cat.direction = "N";
  } else {
    cat.direction = "S";
  }
}

function maybeStartIdleAnimation() {
  /*
   * Don't start a new animation while one is already running.
   */
  if (idleAnimation) return;

  /*
   * Randomly choose sleeping or face washing.
   * Sleeping is much more common.
   */
  const roll = Math.random();

  if (roll < 0.82) {
    startIdleAnimation("sleeping");
  } else {
    startIdleAnimation("scratchSelf");
  }
}

function startIdleAnimation(type) {
  idleAnimation = type;
  idleAnimationFrame = 0;
  walkingFrame = 0;
}

function resetIdleAnimation() {
  idleAnimation = null;
  idleAnimationFrame = 0;
  walkingFrame = 0;
  walkingTimer = 0;
}

function updateIdleAnimation() {
  /*
   * Sleeping:
   * tired frame first, then the two sleeping frames.
   * This follows the original oneko state sequence.
   */
  if (idleAnimation === "sleeping") {
    if (idleAnimationFrame < 8) {
      setSprite("tired", 0);
      setState("자려고 한다");
    } else {
      const frame =
        Math.floor(idleAnimationFrame / 4);

      setSprite("sleeping", frame);
      setState("잔다");
    }

    idleAnimationFrame++;

    /*
     * Keep sleeping for a while, then wake naturally.
     */
    if (idleAnimationFrame > 192) {
      resetIdleAnimation();
      idleTime = 0;
    }

    return;
  }

  /*
   * Face washing.
   */
  if (idleAnimation === "scratchSelf") {
    const frame = Math.floor(
      idleAnimationFrame / 3
    );

    setSprite("scratchSelf", frame);
    setState("세수한다");

    idleAnimationFrame++;

    if (idleAnimationFrame > 12) {
      resetIdleAnimation();
      idleTime = 0;
    }
  }
}

function render() {
  neko.style.left =
    `${Math.round(cat.x - 16)}px`;

  neko.style.top =
    `${Math.round(cat.y - 16)}px`;
}

function updateNearestDoor() {
  let closest = null;
  let closestDistance = Infinity;

  for (const door of doors) {
    door.classList.remove("near");

    const rect = door.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();

    const x =
      rect.left -
      worldRect.left +
      rect.width / 2;

    const y =
      rect.top -
      worldRect.top +
      rect.height / 2;

    const distance = Math.hypot(
      cat.x - x,
      cat.y - y
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = door;
    }
  }

  nearestDoor =
    closestDistance <= 82
      ? closest
      : null;

  if (nearestDoor) {
    nearestDoor.classList.add("near");
  }
}

function enterNearestDoor() {
  if (!nearestDoor) return;

  const type =
    nearestDoor.dataset.event;

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
    ${
      link
        ? `<a class="event-link"
             href="${link}">
             OPEN PROJECTS →
           </a>`
        : ""
    }
  `;

  eventBox.hidden = false;
}

function loop(now) {
  /*
   * dt is measured in roughly 60fps units.
   * This keeps movement consistent across monitors.
   */
  const dt = Math.min(
    (now - lastTime) / 16.6667,
    2
  );

  lastTime = now;

  updateMovement(dt);
  updateNearestDoor();
  render();

  requestAnimationFrame(loop);
}

/*
 * Initial position = center.
 */
centerCatAndTarget();
setSprite("sleeping", 0);
render();

requestAnimationFrame(loop);
