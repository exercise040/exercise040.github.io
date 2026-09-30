const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const statusElement = document.getElementById("status");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const paddle = {
    width: 110,
    height: 12,
    x: WIDTH / 2 - 55,
    y: HEIGHT - 32,
    speed: 8
};

const ball = {
    radius: 7,
    x: WIDTH / 2,
    y: HEIGHT - 50,
    dx: 4,
    dy: -4
};

const brickConfig = {
    rows: 6,
    columns: 10,
    width: 66,
    height: 20,
    gap: 8,
    top: 55,
    left: 29
};

let bricks = [];
let score = 0;
let lives = 3;
let running = false;
let gameOver = false;
let keys = {};

function createBricks() {
    bricks = [];

    for (let row = 0; row < brickConfig.rows; row++) {
        for (let column = 0; column < brickConfig.columns; column++) {
            bricks.push({
                x: brickConfig.left + column * (brickConfig.width + brickConfig.gap),
                y: brickConfig.top + row * (brickConfig.height + brickConfig.gap),
                width: brickConfig.width,
                height: brickConfig.height,
                alive: true
            });
        }
    }
}

function resetBall() {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT - 50;

    const direction = Math.random() < 0.5 ? -1 : 1;
    ball.dx = direction * 4;
    ball.dy = -4;
}

function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    running = false;

    paddle.x = WIDTH / 2 - paddle.width / 2;

    createBricks();
    resetBall();
    updateHud();
    setStatus("PRESS SPACE TO START");
}

function updateHud() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

function setStatus(text) {
    statusElement.textContent = text;
}

function drawBackground() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

function drawPaddle() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    bricks.forEach((brick) => {
        if (!brick.alive) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    });
}

function draw() {
    drawBackground();
    drawBricks();
    drawPaddle();
    drawBall();
}

function movePaddle() {
    if (keys.ArrowLeft || keys.a || keys.A) {
        paddle.x -= paddle.speed;
    }

    if (keys.ArrowRight || keys.d || keys.D) {
        paddle.x += paddle.speed;
    }

    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
}

function circleRectangleCollision(circle, rectangle) {
    const closestX = Math.max(
        rectangle.x,
        Math.min(circle.x, rectangle.x + rectangle.width)
    );

    const closestY = Math.max(
        rectangle.y,
        Math.min(circle.y, rectangle.y + rectangle.height)
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= WIDTH) {
        ball.dx *= -1;
        ball.x = Math.max(ball.radius, Math.min(WIDTH - ball.radius, ball.x));
    }

    if (ball.y - ball.radius <= 0) {
        ball.dy *= -1;
        ball.y = ball.radius;
    }

    if (ball.dy > 0 && circleRectangleCollision(ball, paddle)) {
        const hitPosition =
            (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);

        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        ball.dx = hitPosition * speed * 0.85;
        ball.dy = -Math.sqrt(
            Math.max(1, speed * speed - ball.dx * ball.dx)
        );

        ball.y = paddle.y - ball.radius;
    }

    for (const brick of bricks) {
        if (!brick.alive) continue;

        if (circleRectangleCollision(ball, brick)) {
            brick.alive = false;
            ball.dy *= -1;
            score += 10;
            updateHud();
            break;
        }
    }

    if (ball.y - ball.radius > HEIGHT) {
        lives--;
        updateHud();

        if (lives <= 0) {
            running = false;
            gameOver = true;
            setStatus("GAME OVER — PRESS R");
        } else {
            running = false;
            resetBall();
            setStatus("PRESS SPACE TO CONTINUE");
        }
    }

    if (bricks.every((brick) => !brick.alive)) {
        running = false;
        gameOver = true;
        setStatus("YOU WIN — PRESS R");
    }
}

function update() {
    if (!running) return;

    movePaddle();
    updateBall();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
    keys[event.key] = true;

    if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === " "
    ) {
        event.preventDefault();
    }

    if (event.key === " ") {
        if (!gameOver) {
            running = !running;
            setStatus(running ? "PLAYING" : "PAUSED");
        }
    }

    if (event.key === "r" || event.key === "R") {
        resetGame();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
});

resetGame();
loop();
