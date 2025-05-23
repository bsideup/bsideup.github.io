const gameArea = document.getElementById('gameArea');
const characterElement = document.getElementById('character');
const pipesContainer = document.getElementById('pipesContainer');
const chartContainer = document.getElementById('chartContainer');
const scoreDisplay = document.getElementById('scoreDisplay');
const gameOverMessageElement = document.createElement('div');
gameOverMessageElement.id = 'game-over-message';
document.body.appendChild(gameOverMessageElement);

const GAME_AREA_BASE_WIDTH = 800; // Base width for game logic
const GAME_AREA_BASE_HEIGHT = 500; // Base height for game logic (changed to rectangular)

const GRAVITY = 24 * 100;
const JUMP_STRENGTH = -8 * 100;
const PIPE_SPEED = 2 * 100; // pixels per second
const PIPE_WIDTH = 80;
const PIPE_GAP = 250; // Vertical gap between pipes (adjusted for new height)
const PIPE_HORIZONTAL_GAP = 400; // Horizontal gap between pipes

let characterState = {
    x: GAME_AREA_BASE_WIDTH / 3,
    y: GAME_AREA_BASE_HEIGHT / 2, // Adjusted initial Y for new height
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

let currentScale = 1; // Global variable to store the current scale factor for CSS transform

// Chart data
let chartData = [];
const MAX_DATA_POINTS = 100;
const CHART_LINE_COLOR = '#629E51';
const CHART_DISPLAY_WIDTH = 300;

function getGameAreaWidth() {
    return GAME_AREA_BASE_WIDTH; // Game logic operates on base width
}
function getGameAreaHeight() {
    return GAME_AREA_BASE_HEIGHT; // Game logic operates on base height
}

function generateChartData() {
    if (chartData.length >= MAX_DATA_POINTS) {
        chartData.shift();
    }
    const mappedY = characterState.y;
    chartData.push(mappedY); // Store actual Y position
}

function drawChart() {
    chartContainer.innerHTML = ''; // Clear previous chart elements

    // Draw grid lines - based on base game area dimensions
    for (let i = 0; i <= 10; i++) {
        let y = (GAME_AREA_BASE_HEIGHT / 10) * i;
        const hGridLine = document.createElement('div');
        hGridLine.className = 'grid-line horizontal-grid-line';
        hGridLine.style.top = `${y}px`;
        hGridLine.style.left = '0px';
        chartContainer.appendChild(hGridLine);
    }
    for (let i = 0; i <= 8; i++) {
        let x = (GAME_AREA_BASE_WIDTH / 8) * i;
        const vGridLine = document.createElement('div');
        vGridLine.className = 'grid-line vertical-grid-line';
        vGridLine.style.left = `${x}px`;
        vGridLine.style.top = '0px';
        chartContainer.appendChild(vGridLine);
    }

    // Draw chart line - based on base game area dimensions
    const chartRightX = characterState.x;
    const chartStartX = 0;

    if (chartData.length > 1) {
        const dataPointsToDisplay = Math.min(MAX_DATA_POINTS, chartData.length);
        const startIndex = Math.max(0, chartData.length - dataPointsToDisplay);

        for (let i = startIndex + 1; i < chartData.length; i++) {
            const x1 = (i - 1 - startIndex) * (chartRightX / dataPointsToDisplay);
            const y1 = chartData[i-1];
            const x2 = (i - startIndex) * (chartRightX / dataPointsToDisplay);
            const y2 = chartData[i];

            const segment = document.createElement('div');
            segment.className = 'chart-line-segment';
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1);
            
            segment.style.width = `${length}px`;
            segment.style.left = `${x1}px`;
            segment.style.top = `${y1}px`;
            segment.style.transform = `rotate(${angle}rad)`;
            segment.style.transformOrigin = '0 0';
            segment.style.backgroundColor = CHART_LINE_COLOR;
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
}

function updatePipes(dt) {
    for (let i = pipes.length - 1; i >= 0; i--) {
        let pState = pipes[i];
        pState.x -= PIPE_SPEED * dt;

        pState.topElement.style.left = `${pState.x}px`;
        pState.bottomElement.style.left = `${pState.x}px`;

        // Collision detection - uses fixed pixel values
        if (
            characterState.x < pState.x + PIPE_WIDTH &&
            characterState.x + characterState.width > pState.x &&
            (characterState.y < pState.topHeight || characterState.y + characterState.height > getGameAreaHeight() - pState.bottomHeight)
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

    // Prevent character from going off screen (bottom) - uses fixed GAME_AREA_HEIGHT
    if (characterState.y + characterState.height > getGameAreaHeight()) {
        characterState.y = getGameAreaHeight() - characterState.height;
        characterState.velocityY = 0;
        endGame("Stop-the-world pause!");
    }
    // Prevent character from going off screen (top) - uses fixed GAME_AREA_HEIGHT
    if (characterState.y < 0) {
        characterState.y = 0;
        characterState.velocityY = 0;
        endGame("java.lang.OutOfMemoryError");
    }

    updatePipes(dt);

    // Generate new pipes based on horizontal gap - uses fixed values
    if (gameStarted && (pipes.length === 0 || pipes[pipes.length - 1].x <= getGameAreaWidth() - PIPE_HORIZONTAL_GAP)) {
        let gameH = getGameAreaHeight();
        let topHeight = Math.random() * (gameH - PIPE_GAP - 100) + 50; // Use base offsets
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
    drawChart();
    drawCharacter();
    scoreDisplay.textContent = 'GC cycles: ' + score;
}

function generatePun(score) {
    if (score < 50) {
        const badGCPuns = [
            "Looks like you're stuck in a Full GC pause!",
            "Your performance is like a Stop-the-World collector!",
            "You're more like a Serial GC, single-threaded and slow!",
            "Did you just hit an OutOfMemoryError?",
            "Your GC cycles are as low as a CMS collector's throughput!",
            "You're not collecting, you're just... pausing.",
            "Is that a PermGen space issue I see?",
            "You're running on fumes, like a JVM without enough heap!",
            "Your game is as fragmented as a heap after too many minor GCs!",
            "You're the old generation that just won't clear out!"
        ];
        return badGCPuns[Math.floor(Math.random() * badGCPuns.length)];
    } else {
        const goodGCPuns = [
            "You're the Shenandoah of this world! Fast and concurrent!",
            "Your performance is as smooth as ZGC!",
            "You're a true Garbage Collector virtuoso, like a G1 in action!",
            "You're so efficient, you must be using generational GC!",
            "Your score is as high as a well-tuned JVM's throughput!",
            "You're collecting like a pro, no pauses in sight!",
            "You're optimizing memory like a champ!",
            "You're the future of garbage collection!",
            "Your game is as clean as a freshly swept heap!",
            "You're a concurrent marker and a concurrent collector!"
        ];
        return goodGCPuns[Math.floor(Math.random() * goodGCPuns.length)];
    }
}

let currentGameOverMessage = "";

function endGame(message) {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    currentGameOverMessage = message;
    const punMessage = generatePun(score); // Generate pun based on current score
    gameOverMessageElement.innerHTML = `
        <div class="game-over-content">
            <span class="pun-message">${punMessage}</span>
            <span>Click or Space to Restart</span>
            <span>Share your score on socials! :)</span>
        </div>
    `;
    gameOverMessageElement.classList.add('visible'); // Add visible class
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

    characterState.x = (GAME_AREA_BASE_WIDTH / 3); // Set character X on restart
    characterState.y = (GAME_AREA_BASE_HEIGHT / 2); // Adjusted afterdeath Y position to match initial
    characterState.velocityY = 0;
    score = 0;
    gameOver = false;
    gameStarted = false;
    frame = 0;
    chartData = [];
    gameOverMessageElement.classList.remove('visible'); // Remove visible class

    // Re-initialize chart data
    for (let i = 0; i < MAX_DATA_POINTS; i++) {
         chartData.push(GAME_AREA_BASE_HEIGHT / 2); // Initialize with character's initial position relative to new base height
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

document.addEventListener('click', handleInput);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        handleInput();
    }
});

function gameLoop(currentTime) {
    if (gameOver && !gameStarted) {
        gameOverMessageElement.classList.add('visible');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return; // Stop the loop
    }

    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (isNaN(dt) || dt < 0 || dt > 1) {
    }

    if (!gameOver) {
        update(dt);
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        gameOverMessageElement.classList.add('visible');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

// Scaling function
function resizeGame() {
    const gameWrapper = document.getElementById('gameWrapper');
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate scale factors for both width and height
    const scaleX = viewportWidth / GAME_AREA_BASE_WIDTH;
    const scaleY = viewportHeight / GAME_AREA_BASE_HEIGHT;

    // Use the minimum scale factor to ensure the game fits within the viewport while maintaining aspect ratio
    currentScale = Math.min(scaleX, scaleY);
    
    // Apply scale to gameArea
    gameArea.style.transform = `scale(${currentScale})`;
    
    // Adjust gameWrapper's background to fill the entire viewport
    gameWrapper.style.backgroundColor = '#202226'; // Ensure background covers full viewport
}


// Initial setup
function initializeGame() {
    characterState.width = 40; // Fixed width
    characterState.height = 40; // Fixed height
    characterState.velocityY = 0; // Reset velocity

    drawCharacter();
    
    // Initial chart data generation - store relative to base height
    for (let i = 0; i < MAX_DATA_POINTS; i++) {
         chartData.push(GAME_AREA_BASE_HEIGHT / 2); // Adjusted initial chart data for new height
    }
    drawChart();
    scoreDisplay.textContent = 'GC cycles: 0';
    gameOverMessageElement.classList.remove('visible');

    lastPipeX = getGameAreaWidth(); // Initialize lastPipeX when game starts

    // Call resizeGame initially and on window resize
    resizeGame();
    window.addEventListener('resize', resizeGame);
}

window.addEventListener('load', () => {
    setTimeout(initializeGame, 100); 
});
