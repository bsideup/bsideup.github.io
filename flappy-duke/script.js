const gameArea = document.getElementById('gameArea');
const characterElement = document.getElementById('character');
const pipesContainer = document.getElementById('pipesContainer');
const chartContainer = document.getElementById('chartContainer');
const scoreDisplay = document.getElementById('scoreDisplay');
const gameOverMessageElement = document.createElement('div');
gameOverMessageElement.id = 'game-over-message';
document.body.appendChild(gameOverMessageElement);

const GRAVITY = 24 * 100;
const JUMP_STRENGTH = -8 * 100;
const PIPE_SPEED = 2 * 100; // pixels per second
const PIPE_WIDTH = 80;
const PIPE_GAP = 300;
const PIPE_HORIZONTAL_GAP = 400; // Static horizontal gap between pipes
const GAME_AREA_HEIGHT = 800; // Fixed height

let characterState = {
    x: 0, // Will be set dynamically in initializeGame
    y: GAME_AREA_HEIGHT / 3,
    width: 40,
    height: 40,
    velocityY: 0
};

let pipes = []; // Array to store pipe DOM elements and their state
let score = 0;
let gameOver = false;
let gameStarted = false;
let frame = 0;
let animationFrameId = null;
let lastTime = 0;
let lastPipeX = 0; // To keep track of the last pipe's x position

// Chart data
let chartData = [];
const MAX_DATA_POINTS = 100;
const CHART_LINE_COLOR = '#629E51';
const CHART_DISPLAY_WIDTH = 300; // Fixed width for the chart display

function getGameAreaWidth() {
    return gameArea.offsetWidth;
}
// GAME_AREA_HEIGHT is a constant

function generateChartData() {
    if (chartData.length >= MAX_DATA_POINTS) {
        chartData.shift();
    }
    const mappedY = characterState.y;
    // Ensure scaledY calculation uses GAME_AREA_HEIGHT and handles potential division by zero if needed, though GAME_AREA_HEIGHT is constant.
    const scaledY = (mappedY / GAME_AREA_HEIGHT) * GAME_AREA_HEIGHT; 
    chartData.push(scaledY);
}

function drawChart() {
    chartContainer.innerHTML = ''; // Clear previous chart elements

    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
        let y = (GAME_AREA_HEIGHT / 10) * i;
        const hGridLine = document.createElement('div');
        hGridLine.className = 'grid-line horizontal-grid-line';
        hGridLine.style.top = `${y}px`;
        hGridLine.style.left = '0px';
        chartContainer.appendChild(hGridLine);
    }
    for (let i = 0; i <= 8; i++) {
        let x = (getGameAreaWidth() / 8) * i; // Use dynamic width
        const vGridLine = document.createElement('div');
        vGridLine.className = 'grid-line vertical-grid-line';
        vGridLine.style.left = `${x}px`;
        vGridLine.style.top = '0px';
        chartContainer.appendChild(vGridLine);
    }

    // Draw chart line
    const chartRightX = characterState.x;
    const chartStartX = 0; // Always start at x=0 as per user feedback

    if (chartData.length > 1) {
        // Calculate the number of data points to display based on CHART_DISPLAY_WIDTH
        const dataPointsToDisplay = Math.min(MAX_DATA_POINTS, chartData.length);
        const startIndex = Math.max(0, chartData.length - dataPointsToDisplay);

        for (let i = startIndex + 1; i < chartData.length; i++) {
            // Calculate x positions relative to chartStartX and scale to CHART_DISPLAY_WIDTH
            // The line should extend from x=0 to characterState.x
            const x1 = (i - 1 - startIndex) * (chartRightX / dataPointsToDisplay);
            const y1 = chartData[i-1];
            const x2 = (i - startIndex) * (chartRightX / dataPointsToDisplay);
            const y2 = chartData[i];

            // Create a div for each line segment (can be optimized)
            const segment = document.createElement('div');
            segment.className = 'chart-line-segment';
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1);
            
            segment.style.width = `${length}px`;
            segment.style.left = `${x1}px`;
            segment.style.top = `${y1}px`;
            segment.style.transform = `rotate(${angle}rad)`;
            segment.style.transformOrigin = '0 0';
            segment.style.backgroundColor = CHART_LINE_COLOR; // Already in CSS, but for clarity
            chartContainer.appendChild(segment);
        }
    }
}

function drawCharacter() {
    characterElement.style.left = `${characterState.x}px`;
    characterElement.style.top = `${characterState.y}px`;
    characterElement.style.width = `${characterState.width}px`;
    characterElement.style.height = `${characterState.height}px`;
}

function createPipeElement(x, height, isTop) {
    const pipeElement = document.createElement('div');
    pipeElement.className = 'pipe';
    pipeElement.style.left = `${x}px`;
    pipeElement.style.width = `${PIPE_WIDTH}px`;
    pipeElement.style.height = `${height}px`;
    if (isTop) {
        pipeElement.style.top = '0px';
    } else {
        pipeElement.style.bottom = '0px';
    }
    pipesContainer.appendChild(pipeElement);
    return pipeElement;
}

function drawPipes() {
    // Pipes are now DOM elements, their position is updated in the updatePipes function
    // This function could be used if we needed to redraw all pipes from state, but it's handled by updatePipes
}

function updatePipes(dt) {
    for (let i = pipes.length - 1; i >= 0; i--) {
        let pState = pipes[i];
        pState.x -= PIPE_SPEED * dt;

        pState.topElement.style.left = `${pState.x}px`;
        pState.bottomElement.style.left = `${pState.x}px`;

        // Collision detection
        if (
            characterState.x < pState.x + PIPE_WIDTH &&
            characterState.x + characterState.width > pState.x &&
            (characterState.y < pState.topHeight || characterState.y + characterState.height > GAME_AREA_HEIGHT - pState.bottomHeight)
        ) {
            if (characterState.y < pState.topHeight) {
                endGame("java.lang.OutOfMemoryError");
            } else {
                endGame("Stop-the-world pause!");
            }
            return; // Stop further processing if game over
        }

        // Check if pipe is off screen
        if (pState.x + PIPE_WIDTH < 0) {
            pipesContainer.removeChild(pState.topElement);
            pipesContainer.removeChild(pState.bottomElement);
            pipes.splice(i, 1);
            if (!gameOver) { // Only increment score if game is not over
                score++;
            }
        }
    }
}


function update(dt) {
    if (gameOver || !gameStarted) {
        return;
    }

    // Update character
    characterState.velocityY += GRAVITY * dt;
    characterState.y += characterState.velocityY * dt;

    // Prevent character from going off screen (bottom)
    if (characterState.y + characterState.height > GAME_AREA_HEIGHT) {
        characterState.y = GAME_AREA_HEIGHT - characterState.height;
        characterState.velocityY = 0;
        endGame("Stop-the-world pause!");
    }
    // Prevent character from going off screen (top)
    if (characterState.y < 0) {
        characterState.y = 0;
        characterState.velocityY = 0;
        endGame("java.lang.OutOfMemoryError");
    }

    updatePipes(dt);

    // Generate new pipes based on horizontal gap
    // Only generate if game has started and there's enough space from the last pipe
    if (gameStarted && (pipes.length === 0 || pipes[pipes.length - 1].x <= getGameAreaWidth() - PIPE_HORIZONTAL_GAP)) {
        let gameH = GAME_AREA_HEIGHT; // Use fixed height
        let topHeight = Math.random() * (gameH - PIPE_GAP - 100) + 50;
        let bottomHeight = gameH - topHeight - PIPE_GAP;
        
        const newPipeX = getGameAreaWidth(); // New pipes always start from the right edge
        const topPipeElement = createPipeElement(newPipeX, topHeight, true);
        const bottomPipeElement = createPipeElement(newPipeX, bottomHeight, false);

        pipes.push({
            x: newPipeX,
            topHeight: topHeight,
            bottomHeight: bottomHeight,
            topElement: topPipeElement,
            bottomElement: bottomPipeElement
        });
        lastPipeX = newPipeX; // Update lastPipeX after generating a new pipe
    }

    // Update chart data
    if (frame % 5 === 0) {
        generateChartData();
    }

    frame++;
}

function draw() {
    // Clear relevant containers if needed (pipesContainer is managed by adding/removing)
    // chartContainer.innerHTML = ''; // Done in drawChart

    drawChart();
    // Pipes are drawn/updated via DOM manipulation in updatePipes and createPipeElement
    drawCharacter();

    scoreDisplay.textContent = 'GC cycles: ' + score;

    if (gameOver) {
        gameOverMessageElement.style.display = 'block';
    } else {
        gameOverMessageElement.style.display = 'none';
    }
}

let currentGameOverMessage = "";

function endGame(message) {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    currentGameOverMessage = message;
    gameOverMessageElement.innerHTML = `
        ${currentGameOverMessage}<br>
        <span style="font-size: 20px;">Click or Space to Restart</span><br>
        <span style="font-size: 16px;">Share your score on socials! :)</span>
    `;
    gameOverMessageElement.style.display = 'block'; // Ensure it's visible
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Stop the game loop
        animationFrameId = null;
    }
}

function restartGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    lastPipeX = getGameAreaWidth(); // Initialize lastPipeX on restart

    // Clear existing pipes from DOM and array
    pipes.forEach(p => {
        if (p.topElement.parentNode === pipesContainer) pipesContainer.removeChild(p.topElement);
        if (p.bottomElement.parentNode === pipesContainer) pipesContainer.removeChild(p.bottomElement);
    });
    pipes = [];

    characterState.x = getGameAreaWidth() / 3; // Set character X on restart
    characterState.y = GAME_AREA_HEIGHT / 3;
    characterState.velocityY = 0;
    score = 0;
    gameOver = false;
    gameStarted = false;
    frame = 0;
    chartData = [];
    gameOverMessageElement.style.display = 'none';

    // Re-initialize chart data
    for (let i = 0; i < MAX_DATA_POINTS; i++) {
        // Initialize with character's initial position
        chartData.push(GAME_AREA_HEIGHT / 3); 
    }
    
    // Ensure character is reset visually
    drawCharacter();
    scoreDisplay.textContent = 'GC cycles: 0';

    lastTime = performance.now(); // Reset lastTime for dt calculation
    gameLoop(lastTime);
}

function handleInput() {
    if (gameOver) {
        restartGame();
    } else if (!gameStarted) {
        gameStarted = true;
        characterState.velocityY = JUMP_STRENGTH;
        lastTime = performance.now(); // Initialize lastTime here
        lastPipeX = getGameAreaWidth(); // Initialize lastPipeX when game starts
        if (!animationFrameId) { // Only start a new loop if one isn't already running
            gameLoop(lastTime);
        }
    } else {
        characterState.velocityY = JUMP_STRENGTH;
    }
}

gameArea.addEventListener('click', handleInput);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        handleInput();
    }
});

function gameLoop(currentTime) {
    if (gameOver && !gameStarted) {
        // This state can happen after a restart if the game ends immediately.
        // Ensure the game over message is shown and animation stops.
        gameOverMessageElement.style.display = 'block';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return; // Stop the loop
    }

    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // It's crucial that dt is a valid number. If currentTime or lastTime is undefined/NaN, dt can be problematic.
    if (isNaN(dt) || dt < 0 || dt > 1) { // dt > 1 might indicate a very long pause or issue
        // Potentially reset lastTime or handle this scenario.
        // If it's the very first frame after a restart and lastTime wasn't set by handleInput, dt could be large.
    }


    if (!gameOver) {
        update(dt); // Pass valid dt
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        gameOverMessageElement.style.display = 'block';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

// Initial setup
function initializeGame() {
    characterState.x = getGameAreaWidth() / 3; // Set initial X based on game area width
    characterState.y = GAME_AREA_HEIGHT / 3; // Set initial Y based on actual height
    drawCharacter(); // Position character initially
    
    // Initial chart data generation
    for (let i = 0; i < MAX_DATA_POINTS; i++) {
         chartData.push(GAME_AREA_HEIGHT / 3); // Initialize with character's initial position
    }
    drawChart(); // Draw initial chart state
    scoreDisplay.textContent = 'GC cycles: 0';
    gameOverMessageElement.style.display = 'none'; // Ensure it's hidden initially

    // Don't start gameLoop immediately, wait for user input.
    // Display a "Click or Space to Start" message or similar if desired.
    // For now, it starts on first click/space.
}

// Call initializeGame once the DOM is ready and image is notionally "loaded" (not waiting for image anymore)
// We need to ensure gameArea has dimensions.
window.addEventListener('load', () => {
    // A small delay to ensure layout is complete, especially for offsetHeight
    setTimeout(initializeGame, 100); 
});

// If CloudSurf.png is essential for character appearance, ensure it's handled.
// Since it's a background image in CSS, it will load asynchronously.
// For this DOM version, we don't need an explicit characterImg.onload.
