const gameArea = document.getElementById('gameArea');
const characterElement = document.getElementById('character');
const pipesContainer = document.getElementById('pipesContainer');
const chartContainer = document.getElementById('chartContainer');
const scoreDisplay = document.getElementById('scoreDisplay');
const gameOverMessageElement = document.createElement('div');
gameOverMessageElement.id = 'game-over-message';
document.body.appendChild(gameOverMessageElement);

const initialBanner = document.getElementById('initialBanner');
const pauseButton = document.getElementById('pauseButton');
const pauseIcon = document.getElementById('pauseIcon');
const playIcon = document.getElementById('playIcon');

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
let isPaused = false; // New state variable for pause
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
    if (gameOver || !gameStarted || isPaused) { // Add isPaused to condition
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

    // Check for good pun display
    const currentScoreTier = Math.floor(score / 5);
    if (score > 0 && currentScoreTier > lastPunScoreTier) {
        lastPunScoreTier = currentScoreTier;
        const goodPun = generatePun('good', score);
        punBannerElement.textContent = goodPun;
        punBannerElement.classList.add('visible');

        // Hide the banner after 3 seconds
        setTimeout(() => {
            punBannerElement.classList.remove('visible');
        }, 3000);
    }

    frame++;
}

function draw() {
    drawChart();
    drawCharacter();
    scoreDisplay.textContent = 'GC cycles: ' + score;
}

function generatePun(type, score = 0) {
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
        "You're the old generation that just won't clear out!",
        "Heap's a mess, just like your score!",
        "Garbage in, garbage out... and you're out!",
        "Failed to allocate more memory for your win!",
        "Looks like a memory leak in your gameplay!",
        "Your object graph is too complex for this game!",
        "Stuck in a permanent generation space!",
        "Did you forget to deallocate your mistakes?",
        "Your game just crashed with a StackOverflowError!",
        "Too many short-lived objects, just like your game!",
        "You've been promoted to the old generation... of losers!",
        "Your performance is as bad as a JVM with default settings!",
        "You're not just losing, you're creating garbage!",
        "Time for a major GC, because your game is full!",
        "Your score is null, just like your chances!",
        "Looks like you've hit the young generation ceiling!",
        "You're experiencing high GC overhead!",
        "Your game is suffering from excessive minor collections!",
        "Did you forget to clear your cache of bad moves?",
        "Your game is as slow as a synchronized block!",
        "You're not just losing, you're causing a memory crisis!",
        "Consider this a 'stop-the-world' moment for your ego!",
        "Your game is fragmented, just like your hopes!",
        "You've been de-referenced from the winner's list!",
        "Looks like a 'concurrent mode failure' for your score!",
        "Your game is as inefficient as manual memory management!",
        "Did you forget to optimize your jumps?",
        "You're stuck in a 'concurrent mark phase' of losing!",
        "Your score is a 'weak reference' to success!",
        "You're not just losing, you're causing a 'heap dump' of despair!",
        "Consider this a 'concurrent sweep phase' of your dreams!",
        "Your game is as unoptimized as a 'finalizer' queue!",
        "You've been 'unreachable' from victory!",
        "Looks like a 'metaspace' overflow for your skills!",
        "Your game is as 'dirty' as a heap before a full GC!",
        "You're not just losing, you're causing a 'GC log' of shame!",
        "Consider this a 'concurrent pre-clean phase' of your defeat!",
        "Your game is as 'stale' as an old object in the heap!",
        "You've been 'evacuated' from the game!",
        "Looks like a 'card table' overflow for your strategy!",
        "Your game is as 'unmarked' as an object ready for collection!",
        "You're not just losing, you're causing a 'GC pause' in reality!",
        "Consider this a 'concurrent remark phase' of your failure!",
        "Your game is as 'unpinned' as a bad memory address!",
        "You've been 'reclaimed' by the game over screen!"
    ];

    const goodGCPuns = [
        "Optimizing memory like a champ!",
        "Collecting like a pro, no pauses in sight!",
        "We have the next Shenandoah!",
        "Performance as smooth as ZGC!",
        "A true Garbage Collector virtuoso, like a G1 in action!",
        "So efficient, must be using generational GC!",
        "Score as high as a well-tuned JVM's throughput!",
        "The future of garbage collection is here!",
        "Game as clean as a freshly swept heap!",
        "A concurrent marker and a concurrent collector!",
        "You're a memory management master!",
        "Your heap is perfectly defragmented!",
        "Achieving peak performance, like a JIT compiler!",
        "Your object allocation is flawless!",
        "No memory leaks in your game!",
        "You're a low-latency champion!",
        "Garbage collection? What garbage collection?",
        "Your game is running on all cylinders!",
        "You're a true JVM whisperer!",
        "Mastering the art of memory reclamation!",
        "Your throughput is off the charts!",
        "You're a concurrent superstar!",
        "Making memory management look easy!",
        "You're my 'ë'!",
        "Your game is a work of art, efficiently crafted!",
        "You're the envy of all other garbage collectors!",
        "Flawless execution, minimal pauses!",
        "Your memory footprint is tiny!",
        "You're a memory optimization wizard!",
        "The ultimate garbage collector!",
        "Your game is a testament to efficient design!",
        "You're a memory maestro!",
        "Achieving maximum utilization!",
        "No wasted bytes in your game!",
        "You're a memory efficiency expert!",
        "The pinnacle of garbage collection!",
        "Your game is a lean, mean, memory machine!",
        "You're a memory architect!",
        "Building a perfect heap, one jump at a time!",
        "Your game is a symphony of efficiency!",
        "The gold standard of memory management!",
        "You're a memory virtuoso!",
        "Achieving optimal performance with ease!",
        "Your game is a marvel of memory optimization!",
        "The ultimate memory manager!",
        "You're a memory legend!",
        "Building a legacy of efficient gameplay!",
        "Your game is a masterpiece of memory control!",
        "The true champion of garbage collection!",
        "You're a memory god!",
        "Achieving immortality through efficient memory!",
    ];

    if (type === 'bad') {
        return badGCPuns[Math.floor(Math.random() * badGCPuns.length)];
    } else if (type === 'good') {
        let newPunIndex;
        do {
            newPunIndex = Math.floor(Math.random() * goodGCPuns.length);
        } while (newPunIndex === lastGoodPunIndex && goodGCPuns.length > 1); // Ensure not the same as last, if there's more than one pun
        lastGoodPunIndex = newPunIndex;
        return goodGCPuns[newPunIndex];
    }
    return ""; // Should not happen
}

const punBannerElement = document.createElement('div');
punBannerElement.id = 'pun-banner';
document.body.appendChild(punBannerElement);

let currentGameOverMessage = "";
let lastPunScoreTier = -1; // To track when to show a new good pun
let lastGoodPunIndex = -1; // To track the index of the last good pun shown

function endGame(message) {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    isPaused = false; // Ensure game is not paused when game over
    pauseButton.classList.remove('visible'); // Hide pause button on game over
    currentGameOverMessage = message;
    
    const badPun = generatePun('bad');

    gameOverMessageElement.innerHTML = `
        <div class="game-over-content">
            <span class="pun-message">${badPun}</span>
            <span>Click or Space to Restart</span>
            <span>Share your score on socials! :)</span>
        </div>
    `;
    gameOverMessageElement.classList.add('visible'); // Add visible class
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Stop the game loop
        animationFrameId = null;
    }
    // Hide pun banner if it's visible
    punBannerElement.classList.remove('visible');
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
    isPaused = false; // Reset pause state
    frame = 0;
    chartData = [];
    lastPunScoreTier = -1; // Reset for new game
    lastGoodPunIndex = -1; // Reset for new game
    gameOverMessageElement.classList.remove('visible'); // Remove visible class
    pauseButton.classList.remove('visible'); // Hide pause button on restart

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

function togglePause() {
    console.log('togglePause called. isPaused:', isPaused); // Debugging line
    if (gameOver || !gameStarted) return; // Cannot pause if game is over or not started
    isPaused = !isPaused;
    if (isPaused) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        pauseIcon.classList.add('hidden');
        playIcon.classList.remove('hidden');
    } else {
        lastTime = performance.now(); // Reset lastTime to prevent large dt on resume
        gameLoop(lastTime);
        pauseIcon.classList.remove('hidden');
        playIcon.classList.add('hidden');
    }
}

function handleInput(event) { // Accept event object
    // Check if the click originated from the pause button or its children
    if (pauseButton.contains(event.target)) {
        // If it's the pause button, let its own event listener handle it
        // and prevent this global handler from processing it as a jump/start/restart
        event.stopPropagation();
        event.preventDefault();
        return; 
    }

    if (gameOver) {
        restartGame();
    } else if (!gameStarted) {
        gameStarted = true;
        initialBanner.style.opacity = '0';
        initialBanner.style.visibility = 'hidden';
        pauseButton.classList.add('visible'); // Show pause button when game starts
        characterState.velocityY = JUMP_STRENGTH;
        lastTime = performance.now(); // Initialize lastTime here
        lastPipeX = getGameAreaWidth(); // Initialize lastPipeX when game starts
        if (!animationFrameId) { // Only start a new loop if one isn't already running
            gameLoop(lastTime);
        }
    } else if (isPaused) { // If paused, unpause the game
        togglePause();
    } else { // Otherwise, perform the jump
        characterState.velocityY = JUMP_STRENGTH;
    }
}

document.addEventListener('click', handleInput);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        handleInput(e); // Pass event object for consistency
    } else if (e.code === 'KeyP') { // Handle 'P' key for pause
        togglePause();
    }
});

function gameLoop(currentTime) {
    if (gameOver) { // If game is over, ensure game over message is visible and stop loop
        gameOverMessageElement.classList.add('visible');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    if (isPaused) { // If paused, do not update or draw, but keep loop running
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Basic sanity check for dt, can happen if tab is inactive for a long time
    if (isNaN(dt) || dt < 0 || dt > 1) {
        // If dt is too large, reset it to a small value to prevent character from falling through pipes
        // This can happen if the tab is in the background and then brought to foreground
        lastTime = currentTime; // Reset lastTime to current time
        animationFrameId = requestAnimationFrame(gameLoop); // Request next frame immediately
        return; // Skip this frame's update
    }

    update(dt);
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
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
    pauseButton.classList.remove('visible'); // Ensure pause button is hidden initially

    lastPipeX = getGameAreaWidth(); // Initialize lastPipeX when game starts

    // Call resizeGame initially and on window resize
    resizeGame();
    window.addEventListener('resize', resizeGame);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        initializeGame();
        pauseButton.addEventListener('click', togglePause); // Move click listener here
    }, 100); 
});
