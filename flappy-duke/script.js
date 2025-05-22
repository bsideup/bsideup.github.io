const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const characterImg = new Image();
characterImg.src = 'CloudSurf.png';

const GRAVITY = 24 * 100; /* Adjusted gravity */
const JUMP_STRENGTH = -8 * 100; /* Increased jump strength */
const PIPE_SPEED = 2 * 100;
const PIPE_WIDTH = 80;
const PIPE_GAP = 250; // Gap between upper and lower pipes

const INITIAL_X = 200; // Static position ~200px from the left

let character = {
    x: INITIAL_X,
    y: canvas.height / 3, /* Adjusted initial position */
    width: 40,  /* Further reduced width for smaller hitbox */
    height: 40, /* Further reduced height for smaller hitbox */
    velocityY: 0
};

let pipes = [];
let score = 0;
let gameOver = false;
let gameStarted = false; /* New variable to control game start */
let frame = 0;
let animationFrameId = null; // Store animation frame ID
let lastTime = 0; // Store the time of the last frame

// Grafana-like chart background
let chartData = [];
const MAX_DATA_POINTS = 100;
const CHART_LINE_COLOR = '#629E51'; // Grafana green
const CHART_LINE_WIDTH = 2;

function generateChartData() {
    if (chartData.length >= MAX_DATA_POINTS) {
        chartData.shift();
    }
    // Map character's y-position to a value suitable for the chart
    // Lower y (higher on screen) should mean lower memory usage for correct representation
    const mappedY = character.y;
    // Scale mappedY to fit the canvas height for the graph
    const scaledY = (mappedY / canvas.height) * canvas.height;
    chartData.push(scaledY);
}

function drawChart() {
    // Draw grid lines (Grafana style) across the full canvas width
    ctx.strokeStyle = '#333'; // Darker grey for grid
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        let y = (canvas.height / 10) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Vertical grid lines (time-based, less frequent) across the full canvas width
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) { // Roughly every 100px
        let x = (canvas.width / 8) * i;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    ctx.stroke();

    // Draw chart line following the character, positioned to the left of Duke
    ctx.beginPath();
    ctx.strokeStyle = CHART_LINE_COLOR;
    ctx.lineWidth = CHART_LINE_WIDTH;

    const chartDisplayWidth = 300; // Fixed width for the chart display
    const chartRightX = character.x; // The right edge of the chart is at the character's x
    const chartStartX = chartRightX - chartDisplayWidth; // Calculate the starting x-position

    if (chartData.length > 0) {
        // Calculate the starting index for drawing based on the number of data points
        const startIndex = Math.max(0, chartData.length - MAX_DATA_POINTS);

        // Calculate the x-position for the first data point
        const firstDataPointX = chartStartX + (chartDisplayWidth / MAX_DATA_POINTS) * startIndex;
        ctx.moveTo(firstDataPointX, chartData[startIndex]);

        for (let i = startIndex + 1; i < chartData.length; i++) {
            const dataIndex = i - startIndex;
            const x = chartStartX + dataIndex * (chartDisplayWidth / MAX_DATA_POINTS);
            ctx.lineTo(x, chartData[i]);
        }
    }
    ctx.stroke();

    // Draw Y-axis labels (simplified) - Keep static for now
    ctx.fillStyle = '#E0E0E0'; // Light grey for labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('100%', 30, 30);
    ctx.fillText('50%', 30, canvas.height / 2);
    ctx.fillText('0%', 30, canvas.height - 30);

    // Draw X-axis label (simplified) - Keep static for now
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'bottom';
    // ctx.fillText('Time', canvas.width / 2, canvas.height - 10);
}

function drawCharacter() {
    ctx.drawImage(characterImg, character.x, character.y, character.width, character.height);
}

function drawPipes() {
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];

        // Upper pipe
        ctx.fillStyle = '#EAB839'; // Grafana yellow/orange
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);

        // Lower pipe
        ctx.fillRect(p.x, canvas.height - p.bottom, PIPE_WIDTH, p.bottom);
    }
}

function update(dt) {
    if (gameOver || !gameStarted) return;

    // Update character
    character.velocityY += GRAVITY * dt;
    character.y += character.velocityY * dt;

    // Prevent character from going off screen
    if (character.y + character.height > canvas.height) {
        character.y = canvas.height - character.height;
        character.velocityY = 0;
        endGame("Stop-the-world pause!");
    }
    if (character.y < 0) {
        character.y = 0;
        character.velocityY = 0;
        endGame("java.lang.OutOfMemoryError");
    }

    // Update pipes
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= PIPE_SPEED * dt;

        // Collision detection
        if (character.x < p.x + PIPE_WIDTH &&
            character.x + character.width > p.x &&
            (character.y < p.top || character.y + character.height > canvas.height - p.bottom)) {
            
            if (character.y < p.top) {
                endGame("java.lang.OutOfMemoryError");
            } else {
                endGame("Stop-the-world pause!");
            }
        }

        // Check if pipe is off screen
        if (p.x + PIPE_WIDTH < 0) {
            pipes.shift(); // Remove pipe
            score++; // Increment score when pipe passes
        }
    }

    // Generate new pipes (only after game starts and with a delay for the first pipe)
    if (gameStarted && frame % 150 === 0 && frame > 0) {
        let topHeight = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        let bottomHeight = canvas.height - topHeight - PIPE_GAP;
        pipes.push({
            x: canvas.width,
            top: topHeight,
            bottom: bottomHeight
        });
    }

    // Update chart data with character's y position
    if (frame % 5 === 0) { // Update chart data more frequently
        generateChartData();
    }

    frame++;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawChart(); // Draw Grafana chart background
    drawPipes();
    drawCharacter();

    // Display legend on the right side
    const legendStartX = canvas.width - 180; // Starting x-position for the legend
    const legendWidth = 160; // Estimated width of the legend area
    const legendStartY = 10; // Starting y-position for the legend background
    const legendHeight = 120; // Estimated height of the legend area
    const legendLineHeight = 25; // Vertical spacing between legend items

    // Draw semi-transparent background for the legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Dark grey with 80% opacity
    ctx.fillRect(legendStartX - 10, legendStartY, legendWidth + 20, legendHeight); // Add some padding

    ctx.fillStyle = '#E0E0E0'; // Light grey for legend text
    ctx.font = '16px Arial';
    ctx.textAlign = 'left'; // Align text to the left for labels
    ctx.textBaseline = 'top';

    ctx.fillText('Legend:', legendStartX, 20);

    // Memory Usage legend item
    ctx.fillStyle = CHART_LINE_COLOR;
    ctx.fillRect(legendStartX, 20 + legendLineHeight, 15, 15); // Color box
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('Memory Usage', legendStartX + 25, 20 + legendLineHeight); // Text label

    // Pipes legend item
    ctx.fillStyle = '#EAB839';
    ctx.fillRect(legendStartX, 20 + 2 * legendLineHeight, 15, 15); // Color box
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('Pipes', legendStartX + 25, 20 + 2 * legendLineHeight); // Text label

    // GC cycles score
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText('GC cycles: ' + score, legendStartX, 20 + 3 * legendLineHeight);

    if (gameOver) {
        document.getElementById('game-over-message').style.display = 'block';
    } else {
        document.getElementById('game-over-message').style.display = 'none';
    }
}

let gameOverMessage = "";
const gameOverMessageElement = document.createElement('div');
gameOverMessageElement.id = 'game-over-message';
document.body.appendChild(gameOverMessageElement);


function endGame(message) {
    gameOver = true;
    gameOverMessage = message;
    gameOverMessageElement.innerHTML = `
        ${gameOverMessage}<br>
        <span style="font-size: 20px;">Click or Space to Restart</span>
    `;
}

function restartGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    character.x = INITIAL_X; // Reset character x position
    character.y = canvas.height / 3; /* Consistent initial position */
    character.velocityY = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false; /* Reset gameStarted on restart */
    frame = 0;
    chartData = []; // Reset chart data on restart
    // Re-initialize chart data for a fresh start
    for (let i = 0; i < MAX_DATA_POINTS; i++) {
        generateChartData();
    }
    gameLoop();
}

canvas.addEventListener('click', () => {
    if (gameOver) {
        restartGame();
    } else if (!gameStarted) {
        gameStarted = true;
        character.velocityY = JUMP_STRENGTH;
    } else {
        character.velocityY = JUMP_STRENGTH;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameOver) {
            restartGame();
        } else if (!gameStarted) {
            gameStarted = true;
            character.velocityY = JUMP_STRENGTH;
        } else {
            character.velocityY = JUMP_STRENGTH;
        }
    }
});

function gameLoop(currentTime) {
    const dt = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    update(dt);
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Initial chart data generation
for (let i = 0; i < MAX_DATA_POINTS; i++) {
    generateChartData();
}

characterImg.onload = () => {
    gameLoop();
};
