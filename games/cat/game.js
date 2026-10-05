const world = document.getElementById("world");
const cat = document.getElementById("cat");
const statusText = document.getElementById("status");
const doors = [...document.querySelectorAll(".door")];

const eventBox = document.getElementById("event-box");
const eventContent = document.getElementById("event-content");
const closeEvent = document.getElementById("close-event");

const keys = {};

const catState = {
    x: 100,
    y: 120,
    speed: 3,
    direction: 1
};

let nearestDoor = null;

window.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;

    if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === " "
    ) {
        event.preventDefault();
    }

    if (event.key === "Enter") {
        enterNearestDoor();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

closeEvent.addEventListener("click", () => {
    eventBox.classList.add("hidden");
});

function moveCat() {
    let dx = 0;
    let dy = 0;

    if (keys["arrowleft"] || keys["a"]) dx -= 1;
    if (keys["arrowright"] || keys["d"]) dx += 1;
    if (keys["arrowup"] || keys["w"]) dy -= 1;
    if (keys["arrowdown"] || keys["s"]) dy += 1;

    const moving = dx !== 0 || dy !== 0;

    if (!moving) {
        cat.classList.remove("walking");
        return;
    }

    cat.classList.add("walking");

    // 대각선 이동이 더 빨라지지 않도록 정규화
    const length = Math.hypot(dx, dy);

    dx /= length;
    dy /= length;

    catState.x += dx * catState.speed;
    catState.y += dy * catState.speed;

    if (dx !== 0) {
        catState.direction = dx > 0 ? 1 : -1;
    }

    const worldWidth = world.clientWidth;
    const worldHeight = world.clientHeight;

    const marginX = 45;
    const marginY = 50;

    catState.x = Math.max(marginX, Math.min(worldWidth - marginX, catState.x));
    catState.y = Math.max(marginY, Math.min(worldHeight - marginY, catState.y));
}

function updateCatVisual() {
    cat.style.left = `${catState.x}px`;
    cat.style.top = `${catState.y}px`;

    const scale = catState.direction === 1 ? 1 : -1;
    cat.style.transform = `translate(-50%, -50%) scaleX(${scale})`;
}

function getDoorCenter(door) {
    const worldRect = world.getBoundingClientRect();
    const rect = door.getBoundingClientRect();

    return {
        x: rect.left - worldRect.left + rect.width / 2,
        y: rect.top - worldRect.top + rect.height / 2
    };
}

function findNearestDoor() {
    let closest = null;
    let closestDistance = Infinity;

    for (const door of doors) {
        const center = getDoorCenter(door);

        const distance = Math.hypot(
            catState.x - center.x,
            catState.y - center.y
        );

        if (distance < closestDistance) {
            closestDistance = distance;
            closest = door;
        }
    }

    for (const door of doors) {
        door.classList.remove("near");
    }

    if (closest && closestDistance < 100) {
        closest.classList.add("near");
        return closest;
    }

    return null;
}

function updateStatus() {
    nearestDoor = findNearestDoor();

    if (nearestDoor) {
        statusText.textContent = "ENTER";
    } else {
        statusText.textContent = "EXPLORE";
    }
}

function enterNearestDoor() {
    if (!nearestDoor) return;

    const eventType = nearestDoor.dataset.event;

    triggerEvent(eventType);
}

function triggerEvent(type) {
    if (type === "about") {
        eventContent.innerHTML = `
            <h2 class="event-title">ABOUT</h2>
            <p class="event-text">
                The cat discovered the room where exercise040 begins.
                Maybe there is more to this website than the page itself.
            </p>
        `;
    }

    if (type === "projects") {
        eventContent.innerHTML = `
            <h2 class="event-title">PROJECTS</h2>
            <p class="event-text">
                Behind this door are experiments, machine learning,
                quantitative research, and software projects.
            </p>
            <a class="event-link" href="../../index.html#projects">
                OPEN PROJECTS →
            </a>
        `;
    }

    if (type === "secret") {
        eventContent.innerHTML = `
            <h2 class="event-title">???</h2>
            <p class="event-text">
                You found something that was not supposed to be here.
                The cat stares at the door for a moment.
            </p>
        `;
    }

    eventBox.classList.remove("hidden");
}

function gameLoop() {
    moveCat();
    updateCatVisual();
    updateStatus();

    requestAnimationFrame(gameLoop);
}

updateCatVisual();
gameLoop();
