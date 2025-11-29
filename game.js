const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let score = 0; 
// --- NEW GLOBAL GAME STATE ---
let gameOver = false;
// -----------------------------

// Background music (unchanged)
function handleBackgroundMusic() {
    const gameMusic = new Audio('sound/The Knave (Arlecchino) Full Boss Theme Genshin Impact 4.6 OST.mp3');
    gameMusic.loop = true;
    gameMusic.volume = 0.4;
    gameMusic.play().catch(() => {
        document.addEventListener("click", () => gameMusic.play(), { once: true });
    });
}
handleBackgroundMusic();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Images 
const runImg = new Image(); runImg.src = "images/furinarun.png";
const scaredImg = new Image(); scaredImg.src = "images/furinascare.png";
const knaveImg = new Image(); knaveImg.src = "images/knave1.png";
// NEW IMAGE FOR LOW HP STATE
const knave2Img = new Image(); knave2Img.src = "images/knave2.png"; 
// NEW IMAGE FOR GAME OVER
const cryImg = new Image(); cryImg.src = "images/furinacry.png"; 
const primo = new Image(); primo.src = "images/primo.png";

// Audio
const scream = new Audio("sound/furinas-scream-jp.mp3");
const kv1 = new Audio("sound/arlecchino-voice2.mp3");
const skill = new Audio("sound/arlecchino_skill.mp3");
const snap = new Audio("sound/arlecchino_snap.mp3");
const stop = new Audio("sound/furina-stop-that.mp3");
const dare = new Audio("sound/furina_how_dare_you.mp3"); 
// --- NEW: Primogem Collection Sounds ---
const collect1 = new Audio("sound/furina-yoo-hoo.mp3"); 
const collect2 = new Audio("sound/furina-jaja-n-audio.mp3"); 

// --- UPDATED: Array of loaded Audio objects for cloning ---
const COLLECT_AUDIO_OBJECTS = [collect1, collect2]; 
// ----------------------------------------------------------


// --- UPDATED: Random Sound Function with Cloning ---
function playRandomCollectSound() {
    // 4 elements total: 2 sounds + 2 chances for silence (4 total)
    const options = [...COLLECT_AUDIO_OBJECTS, null, null]; 
    const randomIndex = Math.floor(Math.random() * options.length);
    const soundToPlay = options[randomIndex];
    
    if (soundToPlay) {
        // Fix: Clone the audio node to play instantly without waiting for the previous one to finish/reset.
        const clone = soundToPlay.cloneNode(true);
        clone.currentTime = 0;
        clone.play().catch(() => {});
    }
}
// ----------------------------------------------------


// Fixed Furina x position (This will now be the starting x-position)
const FIXED_X = 200;

// NEW CONSTANTS FOR VISUAL SIZE (used in draw method)
const VISUAL_WIDTH = 200;
const VISUAL_HEIGHT = 200;

const GAME_OVER_VISUAL_SIZE = 300; 
const KNIGHT_SPEED = 2; // Speed for centering effect

// --- NEW GLOBAL STATE FLAG ---
let knavePhaseTwoTriggered = false;
// -----------------------------

// --- NEW GLOBAL ARRAY FOR PRIMOGEMS ---
let primogems = []; 
// --------------------------------------


class primogem{
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.img = primo;
        this.speed = 3; // Inherit weapon speed
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
    
    update() {
        if (gameOver) return;
        this.x -= this.speed;
    }

    // A simple AABB collision check function for reusability:
    static checkCollision(p, obj) {
         if (p.x < obj.x + obj.width &&
            p.x + p.width > obj.x &&
            p.y < obj.y + obj.height &&
            p.y + p.height > obj.y) {
            return true;
        }
        return false;
    }
}

class Furina {
    constructor(y) {
        this.x = FIXED_X;
        this.y = y;
        this.ysp = 0;
        this.gravity = 0.2; 
        this.jumpStrength = -5;
    
        this.width = 50; // Hitbox width (kept small)
        this.height = 50; // Hitbox height (kept small)
        
        this.hp = 100;

        this.img = runImg;
        this.canSpawn = false;
        this.isScreaming = false;
    }

    draw() {
        let currentVisualWidth = VISUAL_WIDTH;
        let currentVisualHeight = VISUAL_HEIGHT;
        
        // Use 300x300 size when game over
        if (gameOver) {
            currentVisualWidth = GAME_OVER_VISUAL_SIZE;
            currentVisualHeight = GAME_OVER_VISUAL_SIZE;
        }

        // We offset the draw position so the small hitbox (this.x, this.y) remains in the center of the large image
        const drawX = this.x - (currentVisualWidth - this.width) / 2;
        const drawY = this.y - (currentVisualHeight - this.height) / 2;

        ctx.drawImage(this.img, drawX, drawY, currentVisualWidth, currentVisualHeight);
    }

    update() {
        if (gameOver) {
            this.ysp = 0; 
            this.gravity = 0;
            return;
        }
        
        this.ysp += this.gravity;
        this.y += this.ysp;

        if (this.y + this.height > canvas.height) { this.y = canvas.height - this.height; this.ysp = 0; }
        if (this.y < 0) { this.y = 0; this.ysp = 0; }
    }

    jump() {
        if (gameOver) return; 
        this.ysp = this.jumpStrength;
    }

    playStartSequence(callback) {
        kv1.currentTime = 0;
        kv1.play().catch(() => {});
        kv1.addEventListener("ended", () => {
            this._playScreamOnce(() => {
                this.canSpawn = true;
                if (callback) callback();
            });
        }, { once: true });
    }

    playScreamOnHit() {
        this._playScreamOnce();
    }

    _playScreamOnce(afterCallback) {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.img = scaredImg;
        scream.currentTime = 0;
        scream.play().catch(() => {});
        scream.addEventListener("ended", () => {
            this.img = runImg;
            this.isScreaming = false;
            if (afterCallback) afterCallback();
        }, { once: true });
    }

    reduceHP(amount) {
        if (gameOver) return;
        
        this.hp -= amount;
        
        if (this.hp <= 0) {
            this.hp = 0;
            startGameOverSequence(); // Trigger the game over event
            return; 
        }
        
        this.x -= 15; 
        
        this.playScreamOnHit();
    }
}

class Weapon {
    constructor(x, topHeight, gap) {
        this.x = x;
        this.width = 80; // HITBOX width 
        this.topHeight = topHeight;
        this.gap = gap;
        this.speed = 3;
    }

    draw() {
        // --- REVERTED TO FILL RECTANGLE ---
        ctx.fillStyle = "crimson"; 
        // top pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        // bottom pipe
        const bottomY = this.topHeight + this.gap;
        ctx.fillRect(this.x, bottomY, this.width, canvas.height - bottomY);
        // ------------------------------------
    }

    update() {
        if (gameOver) return;
        this.x -= this.speed;
    }
}

class Knave {
    constructor() {
        this.x = FIXED_X - 200; 
        this.y = canvas.height / 2;
        this.width = 150;
        this.height = 150;
        this.img = knaveImg;
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
    
    centerUpdate() {
        const targetX = canvas.width / 2 + this.width / 2; // Target right of center
        if (Math.abs(this.x - targetX) > KNIGHT_SPEED) {
            this.x += (this.x < targetX ? KNIGHT_SPEED : -KNIGHT_SPEED);
        }
        const targetY = canvas.height / 2 - this.height / 2;
         if (Math.abs(this.y - targetY) > KNIGHT_SPEED) {
            this.y += (this.y < targetY ? KNIGHT_SPEED : -KNIGHT_SPEED);
        }
    }
}

// create objects
const player = new Furina(canvas.height / 2);
const enemy = new Knave();

// weapons array
let weapons = [];
let weaponTimer = 0;
const weaponInterval = 120; // frames between pipes
const weaponGap = 200; // vertical gap
const minTop = 30; // min top height buffer
const maxTopBuffer = 50; // bottom buffer so gap doesn't go to exact edge
// --- NEW: Primogem spawning logic ---
const primogemSpawnChance = 0.5; // 50% chance a primogem spawns when a weapon does
// ------------------------------------

// Start Sequence
player.playStartSequence(() => {
    console.log("start seq done; weapons will spawn now");
});

// input: space to jump
document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        player.jump();
        e.preventDefault();
    }
});
document.addEventListener("touchstart", (e) => {
    player.jump();
    e.preventDefault();
});

// robust rectangle collision check against top and bottom pipes
function checkCollision(f, w) {
    const horizontalBuffer = 10; 
    const fx1 = f.x + horizontalBuffer;
    const fx2 = f.x + f.width - horizontalBuffer;
    const fy1 = f.y;
    const fy2 = f.y + f.height;

    const topX1 = w.x;
    const topX2 = w.x + w.width; 
    const topY2 = w.topHeight;

    const bottomX1 = w.x;
    const bottomX2 = w.x + w.width; 
    const bottomY1 = w.topHeight + w.gap;
    const bottomY2 = canvas.height;

    const hitTop = fx1 < topX2 && fx2 > topX1 && fy1 < topY2 && fy2 > 0;
    const hitBottom = fx1 < bottomX2 && fx2 > bottomX1 && fy1 < bottomY2 && fy2 > bottomY1;

    return hitTop || hitBottom;
}

/**
 * Handles the one-time transition when the player's HP drops to 50 or below.
 */
function handlePhaseTransition() {
    if (player.hp <= 50 && !knavePhaseTwoTriggered) {
        knavePhaseTwoTriggered = true; 
        
        enemy.img = knave2Img;
        
        snap.currentTime = 0;
        snap.play().catch(() => {});
        
        snap.addEventListener("ended", () => {
            stop.currentTime = 0;
            stop.play().catch(() => {});
        }, { once: true });
    }
    
    // Always use the knave2Img if the phase has been triggered
    if (knavePhaseTwoTriggered) {
        enemy.img = knave2Img;
    } else {
        enemy.img = knaveImg;
    }
}

/**
 * Triggers the end sequence when player HP hits 0.
 */
function startGameOverSequence() {
    if (gameOver) return;
    
    gameOver = true;
    
    // 1. Save Score to Session Storage
    sessionStorage.setItem('finalScore', score);

    // 2. Remove all weapons and primogems
    weapons = [];
    primogems = [];
    
    // 3. Play Audio Sequence: skill > dare
    skill.currentTime = 0;
    skill.play().catch(() => {
        console.error("Failed to play skill audio.");
    });
    
    // Ensure dare plays right after skill ends
    skill.addEventListener("ended", () => {
        dare.currentTime = 0;
        dare.play().catch(() => {
             console.error("Failed to play dare audio."); 
        });
    }, { once: true });
    
    // 4. Display crying image for game over
    player.img = cryImg; 
}


// game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    handlePhaseTransition();
    
    // --- GAME OVER LOGIC ---
    if (gameOver) {
        // 1. Center Knave
        enemy.centerUpdate();
        
        // 2. Center Furina
        const playerTargetX = canvas.width / 2 - player.width / 2 - GAME_OVER_VISUAL_SIZE / 2; 
        const playerTargetY = canvas.height / 2 - player.height / 2;
        
        if (Math.abs(player.x - playerTargetX) > KNIGHT_SPEED) {
            player.x += (player.x < playerTargetX ? KNIGHT_SPEED : -KNIGHT_SPEED);
        }
        if (Math.abs(player.y - playerTargetY) > KNIGHT_SPEED) {
             player.y += (player.y < playerTargetY ? KNIGHT_SPEED : -KNIGHT_SPEED);
        }

        // 3. Draw Game Over Text
        ctx.fillStyle = "red";
        ctx.font = "bold 72px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 150);
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2); // Show final score
        ctx.textAlign = "left"; // Reset alignment
    }
    // -----------------------
    
    // draw enemy behind player
    enemy.draw();

    // player update & draw
    player.update();
    player.draw();

    
    if (player.canSpawn && !gameOver) { // Only spawn if game is NOT over
        weaponTimer++;
        if (weaponTimer >= weaponInterval) {
            weaponTimer = 0;

            const maxTopHeight = canvas.height - weaponGap - maxTopBuffer;
            const topHeight = Math.max(minTop, Math.random() * maxTopHeight);
            const newWeapon = new Weapon(canvas.width, topHeight, weaponGap);
            weapons.push(newWeapon);
            
            // Primogem Spawning Logic
            if (Math.random() < primogemSpawnChance) {
                // Calculate position exactly in the middle of the gap
                const primoX = newWeapon.x + newWeapon.width / 2 - 10; // Center in the pipe x, -10 for primogem width/2
                const primoY = newWeapon.topHeight + newWeapon.gap / 2 - 10; // Center in the gap y, -10 for primogem height/2
                primogems.push(new primogem(primoX, primoY));
            }
        }
    }

    // Primogem Update and Collection Loop
    for (let i = primogems.length - 1; i >= 0; i--) {
        const p = primogems[i];
        
        if (!gameOver) { 
            p.update();
            
            // Check collision with player
            if (primogem.checkCollision(p, player)) {
                score++; // Increase score
                playRandomCollectSound(); // Play random sound or silence (using cloning fix)
                primogems.splice(i, 1); // Remove collected primogem
                continue;
            }
        }
        
        p.draw(); 

        // remove off-screen primogems
        if (p.x + p.width < -50) {
            primogems.splice(i, 1);
        }
    }
    
    // Weapon Update and Collision Loop
    for (let i = weapons.length - 1; i >= 0; i--) {
        const w = weapons[i];
        
        // IMPORTANT: Only update/check collision if game is NOT over
        if (!gameOver) { 
            w.update();
            if (checkCollision(player, w)) {
                player.reduceHP(10);
                weapons.splice(i, 1); 
                continue;
            }
        }
        
        w.draw(); // Draw using the red fillRect

        // remove off-screen weapons
        if (w.x + w.width < -50) {
            weapons.splice(i, 1);
        }
    }

    // Draw HP and Score
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText(`HP: ${player.hp}`, canvas.width - 150, 40);
    ctx.fillText(`Score: ${score}`, canvas.width - 150, 70); 

    requestAnimationFrame(gameLoop);
}

gameLoop();