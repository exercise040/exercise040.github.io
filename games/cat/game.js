const world = document.getElementById("world");
const cat = document.getElementById("cat");

const status = document.getElementById("status");

const eventBox = document.getElementById("event-box");
const eventContent = document.getElementById("event-content");
const closeEvent = document.getElementById("close-event");

const doors = [...document.querySelectorAll(".door")];


// -------------------------
// 고양이 상태
// -------------------------

const catState = {
    x: 100,
    y: 100,
    speed: 3
};


// -------------------------
// 키 상태
// -------------------------

const keys = {};

window.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

});


window.addEventListener("keyup", (event) => {

    keys[event.key.toLowerCase()] = false;

});


// -------------------------
// 이벤트 상태
// -------------------------

let eventOpen = false;


// -------------------------
// 고양이 위치
// -------------------------

function updateCatPosition() {

    if (eventOpen) {
        return;
    }


    if (
        keys["arrowleft"] ||
        keys["a"]
    ) {
        catState.x -= catState.speed;
    }


    if (
        keys["arrowright"] ||
        keys["d"]
    ) {
        catState.x += catState.speed;
    }


    if (
        keys["arrowup"] ||
        keys["w"]
    ) {
        catState.y -= catState.speed;
    }


    if (
        keys["arrowdown"] ||
        keys["s"]
    ) {
        catState.y += catState.speed;
    }


    // 월드 밖으로 나가지 못하게 한다.

    const width = world.clientWidth;
    const height = world.clientHeight;

    catState.x = Math.max(
        20,
        Math.min(width - 20, catState.x)
    );

    catState.y = Math.max(
        20,
        Math.min(height - 20, catState.y)
    );


    cat.style.left = `${catState.x}px`;
    cat.style.top = `${catState.y}px`;
}


// -------------------------
// 충돌 검사
// -------------------------

function checkDoorCollision() {

    let touchingDoor = null;


    doors.forEach((door) => {

        const rect = door.getBoundingClientRect();
        const worldRect = world.getBoundingClientRect();


        const doorX =
            rect.left -
            worldRect.left +
            rect.width / 2;

        const doorY =
            rect.top -
            worldRect.top +
            rect.height / 2;


        const distance = Math.sqrt(
            Math.pow(catState.x - doorX, 2) +
            Math.pow(catState.y - doorY, 2)
        );


        if (distance < 70) {

            door.classList.add("near");

            touchingDoor = door;

        } else {

            door.classList.remove("near");

        }

    });


    if (touchingDoor) {

        status.textContent = "DOOR";

    } else {

        status.textContent = "EXPLORE";

    }


    return touchingDoor;
}


// -------------------------
// 문 이벤트
// -------------------------

function triggerEvent(eventName) {

    eventOpen = true;

    switch (eventName) {

        case "about":

            eventContent.innerHTML = `
                <h2>Hello.</h2>

                <p>
                    The cat found the About room.
                </p>

                <p>
                    Maybe this website is not as
                    ordinary as it looks.
                </p>
            `;

            break;


        case "projects":

            eventContent.innerHTML = `
                <h2>Projects</h2>

                <p>
                    The cat discovered the
                    project room.
                </p>

                <p>
                    <a
                        href="../../index.html#projects"
                        style="color:white;"
                    >
                        View Projects →
                    </a>
                </p>
            `;

            break;


        case "secret":

            eventContent.innerHTML = `
                <h2>???</h2>

                <p>
                    You found something that
                    was not supposed to be here.
                </p>

                <p>
                    The cat looks at you.
                </p>

                <p>
                    🐈
                </p>
            `;

            break;

    }


    eventBox.classList.remove("hidden");
}


// -------------------------
// 이벤트 닫기
// -------------------------

closeEvent.addEventListener("click", () => {

    eventBox.classList.add("hidden");

    eventOpen = false;

});


// -------------------------
// 문 진입
// -------------------------

function checkForEntry() {

    const door = checkDoorCollision();

    if (!door) {
        return;
    }


    /*
     * 문에 가까워졌다고
     * 바로 이벤트를 발생시키지 않고
     *
     * Enter 키를 눌렀을 때
     * 들어가도록 한다.
     */

}


// -------------------------
// Enter 키
// -------------------------

window.addEventListener("keydown", (event) => {

    if (event.key !== "Enter") {
        return;
    }


    if (eventOpen) {
        return;
    }


    const door = checkDoorCollision();


    if (!door) {
        return;
    }


    const eventName =
        door.dataset.event;


    triggerEvent(eventName);

});


// -------------------------
// 게임 루프
// -------------------------

function gameLoop() {

    updateCatPosition();

    checkForEntry();

    requestAnimationFrame(gameLoop);
}


gameLoop();