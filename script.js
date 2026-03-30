// Game Variables
let gameState = {
    score: 0,
    lives: 3,
    wave: 1,
    lastWave: 1,
    gameActive: false,
    difficulty: 'normal',
    soundEnabled: true,
    musicEnabled: true,
    timeSurvived: 0,
    highScore: localStorage.getItem('cosmicQuestHighScore') ? parseInt(localStorage.getItem('cosmicQuestHighScore')) : 0,
    dashKeybind: ' ',  // Space bar by default
    gameMode: 'normal'  // 'normal' or 'mirror'
};

let playerPos = { x: 400, y: 550 };
let playerInvincibleUntil = 0;  // Timestamp when invincibility ends
let lastDashTime = 0;  // Cooldown tracking
let isDashing = false;  // Current dash state
let dashEndTime = 0;  // When dash ends
let dashVelocity = { x: 0, y: 0 };  // Dash direction and speed
const enemies = [];
const enemyBullets = [];
let gameStartTime = 0;
let lastEnemySpawn = 0;
let lastBulletFire = {};

const keys = {};
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 30;

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function startGame() {
    gameState.gameActive = true;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.wave = 1;
    gameState.lastWave = 1;
    gameState.timeSurvived = 0;
    playerPos = { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT - 50 };
    playerInvincibleUntil = 0;  // Reset invincibility
    lastDashTime = 0;  // Reset dash cooldown
    isDashing = false;  // Reset dash state
    dashEndTime = 0;
    dashVelocity = { x: 0, y: 0 };
    enemies.length = 0;
    enemyBullets.length = 0;
    lastEnemySpawn = 0;
    lastBulletFire = {};
    
    // Update dash key display in game screen
    const dashKeyDisplay = document.getElementById('dashKeyDisplay');
    if (dashKeyDisplay) {
        dashKeyDisplay.textContent = gameState.dashKeybind === ' ' ? 'SPACE' : gameState.dashKeybind.toUpperCase();
    }
    
    // Show appropriate canvas based on game mode
    const normalCanvas = document.getElementById('gameCanvas');
    const mirrorContainer = document.getElementById('gameMirrorContainer');
    
    if (gameState.gameMode === 'mirror') {
        normalCanvas.style.display = 'none';
        mirrorContainer.style.display = 'flex';
        // Clear mirror mode containers
        document.getElementById('enemies-container-mirror').innerHTML = '';
        document.getElementById('bullets-container-mirror-left').innerHTML = '';
        document.getElementById('bullets-container-mirror-right').innerHTML = '';
    } else {
        normalCanvas.style.display = 'flex';
        mirrorContainer.style.display = 'none';
    }
    
    // Clear DOM elements from previous game
    document.getElementById('enemies-container').innerHTML = '';
    document.getElementById('bullets-container').innerHTML = '';
    
    // Clear all held keys from previous game
    for (let key in keys) {
        keys[key] = false;
    }
    
    updateUI();
    showScreen('gameScreen');
    gameStartTime = Date.now();
    gameLoop();
}

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
}

function showControls() {
    showScreen('controlsScreen');
}

function showSettings() {
    showScreen('settingsScreen');
}

function backToStart() {
    gameState.gameActive = false;
    document.getElementById('enemies-container').innerHTML = '';
    document.getElementById('bullets-container').innerHTML = '';
    showScreen('startScreen');
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('wave').textContent = gameState.wave;
}

function updatePlayerPosition() {
    const speed = 6;
    
    // Check for dash input
    if (keys[gameState.dashKeybind] && !isDashing && Date.now() - lastDashTime > 2000) {
        // Calculate dash direction based on current movement input
        let dashDirX = 0;
        let dashDirY = 0;
        
        if (keys['ArrowUp'] || keys['w'] || keys['W']) dashDirY = -1;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) dashDirY = 1;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) dashDirX = -1;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) dashDirX = 1;
        
        // If no direction input, dash in last movement direction or forward
        if (dashDirX === 0 && dashDirY === 0) {
            dashDirY = -1;  // Default dash upward
        }
        
        // Normalize diagonal movement
        const magnitude = Math.sqrt(dashDirX * dashDirX + dashDirY * dashDirY);
        dashDirX /= magnitude;
        dashDirY /= magnitude;
        
        // Start dash (0.3 second dash duration to travel ~300 units)
        const dashSpeed = 1000;  // pixels per second
        const dashDuration = 300;  // milliseconds
        isDashing = true;
        dashEndTime = Date.now() + dashDuration;
        dashVelocity = { x: dashDirX * dashSpeed, y: dashDirY * dashSpeed };
        lastDashTime = Date.now();
        playerInvincibleUntil = dashEndTime + 100;  // Extend invincibility past dash end
        
        if (gameState.soundEnabled) {
            playSound('dash');
        }
    }
    
    // Apply dash movement
    if (isDashing) {
        if (Date.now() < dashEndTime) {
            const deltaTime = 1 / 60;  // Assuming 60 FPS
            playerPos.x += dashVelocity.x * deltaTime;
            playerPos.y += dashVelocity.y * deltaTime;
            // Clamp during dash to prevent going out of bounds
            playerPos.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, playerPos.x));
            playerPos.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, playerPos.y));
        } else {
            isDashing = false;
            dashVelocity = { x: 0, y: 0 };
        }
    }
    
    // Normal movement (reduced when dashing)
    if (!isDashing) {
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            playerPos.y = Math.max(0, playerPos.y - speed);
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            playerPos.y = Math.min(GAME_HEIGHT - PLAYER_SIZE, playerPos.y + speed);
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            playerPos.x = Math.max(0, playerPos.x - speed);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            playerPos.x = Math.min(GAME_WIDTH - PLAYER_SIZE, playerPos.x + speed);
        }
    }
    
    // Keep player in bounds (already done during dash, so only for normal movement)
    if (!isDashing) {
        playerPos.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, playerPos.x));
        playerPos.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, playerPos.y));
    }
    
    // Update visual position using top (consistent with bullets)
    const player = document.getElementById('player');
    player.style.left = playerPos.x + 'px';
    player.style.top = playerPos.y + 'px';
    
    // Visual feedback: different opacity for dashing
    if (isDashing) {
        player.style.opacity = 0.7;
    } else if (isPlayerInvincible()) {
        const blinkRate = 100;  // Blink every 100ms
        const blinkPhase = Math.floor((playerInvincibleUntil - Date.now()) / blinkRate) % 2;
        player.style.opacity = blinkPhase === 0 ? 0.5 : 1;
    } else {
        player.style.opacity = 1;
    }
}

function spawnEnemy() {
    const isOmni = Math.random() < 0.2; // 20% chance for burst enemy
    const isSeeker = gameState.wave > 0 && gameState.wave % 3 === 0 && Math.random() < 0.15; // 15% chance for seeker every 3 waves
    
    const enemy = {
        id: Date.now() + Math.random(),
        x: Math.random() * (GAME_WIDTH - ENEMY_SIZE),
        y: Math.random() * (GAME_HEIGHT * 0.4),
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 1 + 0.5,
        element: null,
        lastShot: 0,
        isOmni: isOmni,
        isSeeker: isSeeker
    };
    
    const enemyEl = document.createElement('div');
    if (isSeeker) {
        enemyEl.className = 'enemy enemy-seeker';
    } else if (isOmni) {
        enemyEl.className = 'enemy enemy-burst';
    } else {
        enemyEl.className = 'enemy';
    }
    
    enemyEl.style.left = enemy.x + 'px';
    enemyEl.style.top = enemy.y + 'px';
    document.getElementById('enemies-container').appendChild(enemyEl);
    enemy.element = enemyEl;
    
    enemies.push(enemy);
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Bounce off walls
        if (enemy.x <= 0 || enemy.x >= GAME_WIDTH - ENEMY_SIZE) {
            enemy.vx *= -1;
        }
        if (enemy.y <= 0 || enemy.y >= GAME_HEIGHT * 0.6) {
            enemy.vy *= -1;
        }
        
        // Keep within bounds
        enemy.x = Math.max(0, Math.min(GAME_WIDTH - ENEMY_SIZE, enemy.x));
        enemy.y = Math.max(0, Math.min(GAME_HEIGHT * 0.6, enemy.y));
        
        // Update position
        enemy.element.style.left = enemy.x + 'px';
        enemy.element.style.top = enemy.y + 'px';
        
        // Fire bullets
        const now = Date.now();
        const shootInterval = enemy.isSeeker ?
            (gameState.difficulty === 'easy' ? 1800 : gameState.difficulty === 'hard' ? 900 : 1300) :
            enemy.isOmni ? 
            (gameState.difficulty === 'easy' ? 2000 : gameState.difficulty === 'hard' ? 1000 : 1500) :
            (gameState.difficulty === 'easy' ? 1500 : gameState.difficulty === 'hard' ? 600 : 1000);
        
        if (now - (lastBulletFire[enemy.id] || 0) > shootInterval) {
            fireEnemyBullet(enemy);
            lastBulletFire[enemy.id] = now;
        }
    });
}

function fireEnemyBullet(enemy) {
    if (enemy.isOmni) {
        // 8-directional burst
        const directions = [
            { vx: 0, vy: 3 },      // down
            { vx: 2.1, vy: 2.1 },  // down-right
            { vx: 3, vy: 0 },      // right
            { vx: 2.1, vy: -2.1 }, // up-right
            { vx: 0, vy: -3 },     // up
            { vx: -2.1, vy: -2.1 }, // up-left
            { vx: -3, vy: 0 },     // left
            { vx: -2.1, vy: 2.1 }  // down-left
        ];
        
        directions.forEach(dir => {
            const bullet = {
                x: enemy.x + ENEMY_SIZE / 2 - 4,
                y: enemy.y + ENEMY_SIZE / 2,
                vx: dir.vx,
                vy: dir.vy,
                element: null,
                isBurst: true
            };
            
            const bulletEl = document.createElement('div');
            bulletEl.className = 'enemy-bullet enemy-bullet-burst';
            bulletEl.style.left = bullet.x + 'px';
            bulletEl.style.top = bullet.y + 'px';
            document.getElementById('bullets-container').appendChild(bulletEl);
            bullet.element = bulletEl;
            
            enemyBullets.push(bullet);
        });
    } else if (enemy.isSeeker) {
        // Seeking bullet - aim at player (all in same coordinate system now)
        const dx = playerPos.x - enemy.x;
        const dy = playerPos.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 2.5; // Slightly slower than regular bullets
        
        const bullet = {
            x: enemy.x + ENEMY_SIZE / 2 - 3,
            y: enemy.y + ENEMY_SIZE,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            element: null,
            isSeeker: true
        };
        
        const bulletEl = document.createElement('div');
        bulletEl.className = 'enemy-bullet enemy-bullet-seeker';
        bulletEl.style.left = bullet.x + 'px';
        bulletEl.style.top = bullet.y + 'px';
        document.getElementById('bullets-container').appendChild(bulletEl);
        bullet.element = bulletEl;
        
        enemyBullets.push(bullet);
    } else {
        // Regular bullet - aim at player (all in same coordinate system now)
        const dx = playerPos.x - enemy.x;
        const dy = playerPos.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 3.5;
        
        const bullet = {
            x: enemy.x + ENEMY_SIZE / 2 - 4,
            y: enemy.y + ENEMY_SIZE,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            element: null
        };
        
        const bulletEl = document.createElement('div');
        bulletEl.className = 'enemy-bullet';
        bulletEl.style.left = bullet.x + 'px';
        bulletEl.style.top = bullet.y + 'px';
        document.getElementById('bullets-container').appendChild(bulletEl);
        bullet.element = bulletEl;
        
        enemyBullets.push(bullet);
    }
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        // Skip if already collided (prevent multi-hit)
        if (bullet.hasCollided) {
            bullet.element.remove();
            enemyBullets.splice(i, 1);
            continue;
        }
        
        // Seeking bullets track the player slightly
        if (bullet.isSeeker) {
            const dx = playerPos.x - bullet.x;
            const dy = playerPos.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const trackingForce = 0.1; // How much to adjust direction toward player
                bullet.vx += (dx / distance) * trackingForce;
                bullet.vy += (dy / distance) * trackingForce;
                
                // Cap speed to prevent too fast tracking
                const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                if (currentSpeed > 3.5) {
                    bullet.vx = (bullet.vx / currentSpeed) * 3.5;
                    bullet.vy = (bullet.vy / currentSpeed) * 3.5;
                }
            }
        }
        
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove if off screen
        if (bullet.y > GAME_HEIGHT) {
            bullet.element.remove();
            enemyBullets.splice(i, 1);
            continue;
        }
        
        // Update position
        bullet.element.style.left = bullet.x + 'px';
        bullet.element.style.top = bullet.y + 'px';
        
        // Check collision with player (only if not invincible)
        if (gameState.gameActive && !isPlayerInvincible() && checkCollision(bullet, playerPos, 8)) {
            bullet.hasCollided = true;  // Mark as collided to prevent multi-hit
            hitPlayer();
        }
    }
}

function checkCollision(bullet, player, bulletSize) {
    // Player y is now in visual space (CSS top property, 0=top, 600=bottom)
    // No coordinate conversion needed anymore
    
    // Small padding for slight leniency (matched to bullet size)
    const hitboxPadding = 3;
    const playerLeft = player.x - hitboxPadding;
    const playerRight = player.x + PLAYER_SIZE + hitboxPadding;
    const playerTop = player.y - hitboxPadding;
    const playerBottom = player.y + PLAYER_SIZE + hitboxPadding;
    
    // AABB collision detection
    const bulletLeft = bullet.x;
    const bulletRight = bullet.x + bulletSize;
    const bulletTop = bullet.y;
    const bulletBottom = bullet.y + bulletSize;
    
    // Check if rectangles overlap
    const isColliding = !(bulletRight < playerLeft ||      // bullet is to the left
                         bulletLeft > playerRight ||        // bullet is to the right
                         bulletBottom < playerTop ||        // bullet is above
                         bulletTop > playerBottom);         // bullet is below
    
    return isColliding;
}

function isPlayerInvincible() {
    return Date.now() < playerInvincibleUntil;
}

function hitPlayer() {
    gameState.lives--;
    gameState.score = Math.max(0, gameState.score - 20);  // Increased penalty to 20 points
    playerInvincibleUntil = Date.now() + 1500;  // 1.5 second invincibility frames
    updateUI();
    
    if (gameState.soundEnabled) {
        playSound('hit');
    }
    
    if (gameState.lives <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameState.gameActive = false;
    
    // Update high score if needed
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('cosmicQuestHighScore', gameState.highScore);
    }
    
    // Show death screen
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('highScore').textContent = gameState.highScore;
    document.getElementById('finalWave').textContent = gameState.wave;
    
    showScreen('deathScreen');
}

function playSound(type) {
    // Simple beep sounds using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    const oscillator = audioContext.createOscillator();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'shoot') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'hit') {
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'dash') {
        oscillator.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    }
}

function gameLoop() {
    if (!gameState.gameActive) return;
    
    // Increase difficulty over time
    gameState.timeSurvived = (Date.now() - gameStartTime) / 1000;
    
    // Spawn enemies progressively
    const enemyCount = Math.min(1 + Math.floor(gameState.timeSurvived / 10), 
                                gameState.difficulty === 'easy' ? 3 : 
                                gameState.difficulty === 'hard' ? 8 : 5);
    
    // Faster enemy spawn based on difficulty
    const spawnInterval = gameState.difficulty === 'easy' ? 1000 : 
                         gameState.difficulty === 'hard' ? 500 : 800;
    
    if (enemies.length < enemyCount && (Date.now() - lastEnemySpawn > spawnInterval || enemies.length === 0)) {
        spawnEnemy();
        lastEnemySpawn = Date.now();
        gameState.wave = Math.ceil(enemies.length / 2);
    }
    
    // Award points for survival - 1 point per second
    const survivalScore = Math.floor(gameState.timeSurvived * 1);
    if (survivalScore > gameState.score) {
        gameState.score = survivalScore;
    }
    
    // Update wave based on score
    gameState.wave = Math.max(gameState.wave, 1 + Math.floor(gameState.score / 50));
    
    // Award life for every wave passed
    if (gameState.wave > gameState.lastWave) {
        gameState.lives++;
        gameState.lastWave = gameState.wave;
        updateUI();
    }
    
    updatePlayerPosition();
    updateEnemies();
    updateEnemyBullets();
    updateUI();
    
    // Update dash cooldown display
    const dashCooldownDisplay = document.getElementById('dashCooldownDisplay');
    if (dashCooldownDisplay) {
        const timeSinceLastDash = Date.now() - lastDashTime;
        const cooldownRemaining = Math.max(0, 2000 - timeSinceLastDash);
        if (cooldownRemaining > 0) {
            dashCooldownDisplay.textContent = `(${(cooldownRemaining / 1000).toFixed(1)}s)`;
        } else {
            dashCooldownDisplay.textContent = '(Ready!)';
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Settings
document.getElementById('soundToggle').addEventListener('change', (e) => {
    gameState.soundEnabled = e.target.checked;
});

document.getElementById('musicToggle').addEventListener('change', (e) => {
    gameState.musicEnabled = e.target.checked;
});

document.getElementById('difficulty').addEventListener('change', (e) => {
    gameState.difficulty = e.target.value;
});

document.getElementById('dashKeybind').addEventListener('keydown', (e) => {
    e.preventDefault();
    gameState.dashKeybind = e.key;
    const displayKey = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
    document.getElementById('dashKeybind').value = displayKey;
    // Update the game screen display if it exists
    const dashKeyDisplay = document.getElementById('dashKeyDisplay');
    if (dashKeyDisplay) {
        dashKeyDisplay.textContent = displayKey;
    }
});

document.getElementById('gameMode').addEventListener('change', (e) => {
    gameState.gameMode = e.target.value;
});

// Initialize
window.addEventListener('load', () => {
    showScreen('startScreen');
});
