// Debug Fighter - A developer's journey from freelancer to CEO!
// Fight bugs and errors while climbing the corporate ladder

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0a0a1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Game variables
let player;
let cursors;
let features = []; // Changed from bugs to features
let bugs = []; // Now bugs are created randomly when pushing code
let projectiles = []; // Player "git push" bullets
let powerups = []; // Power-ups: cash, tutorials, food
let score = 0;
let health = 100;
let cash = 0; // New stat!
let intellect = 0; // New stat!
let scoreText;
let healthText;
let cashText; // New UI
let intellectText; // New UI
let graphics;
let spawnTimer = 0;
let spawnDelay = 2000;
let powerupSpawnTimer = 0;
let powerupSpawnDelay = 8000; // Spawn powerup every 8 seconds
let bugSpawnChance = 0.3; // 30% chance to spawn bug on each git push
let featureTimeout = 10000; // 10 seconds before client gets angry
let globalFeatureTimer = 10000; // Shared timer for ALL features
let gameOver = false;
let attackKey;
let isAttacking = false;
let attackCooldown = 0;
let showingIntro = true;
let introStep = 0;
let introTimer = 0;
let introTexts = [];
let showingStartScreen = true;
let startScreenTexts = [];
let musicPlaying = false;
let musicInterval = null;

// Career/Level system
let currentLevel = 0;
let levelScore = 0;
let levelTargets = [400, 600, 800, 1000, 1200, 1500]; // Points needed per level
let clients = [];
let clientCallTimer = 0;
let clientCallInterval = 15000; // Clients call every 15 seconds
let levelText;
let clientsContainer = [];
let messageBubble = null; // Reusable message bubble for client complaints
let messageBubbleTimer = 0;
let promotionBubble = null; // Separate bubble for promotions
let promotionBubbleTimer = 0;

// Career progression (for story)
const careerPath = [
  { title: 'FREELANCER', desc: 'Working from a coffee shop...', clients: 4 },
  { title: 'JUNIOR DEV', desc: 'First tech job, learning the ropes', clients: 3 },
  { title: 'SENIOR DEV', desc: 'Leading projects, mentoring juniors', clients: 2 },
  { title: 'TECH LEAD', desc: 'Architecting solutions, managing teams', clients: 2 },
  { title: 'CTO', desc: 'Driving technical vision', clients: 1 },
  { title: 'CEO', desc: 'The Unicorn Developer!', clients: 1 }
];

// Clients/Projects for each level
const clientNames = [
  // Freelancer - Real clients
  ['Sarah (E-commerce)', 'Mike (Blog)', 'Alex (Portfolio)', 'Emma (Landing)'],
  // Junior Dev - Projects at first company
  ['Authentication System', 'Payment Gateway', 'User Dashboard'],
  // Senior Dev - Major features
  ['Mobile App', 'Microservices'],
  // Tech Lead - Strategic projects
  ['Cloud Migration', 'Platform Redesign'],
  // CTO - Company-wide initiatives
  ['Tech Strategy'],
  // CEO - Business goals
  ['IPO Launch']
];

// Labels for UI
const levelLabels = [
  'CLIENTS',      // Freelancer
  'PROJECTS',     // Junior Dev
  'FEATURES',     // Senior Dev
  'INITIATIVES',  // Tech Lead
  'STRATEGY',     // CTO
  'GOALS'         // CEO
];

function create() {
  const scene = this;
  graphics = this.add.graphics();
  
  // Create player (developer character) - PURE MANUAL PHYSICS
  player = {
    x: 400,
    y: 300,
    width: 20,
    height: 30,
    speed: 200,
    color: 0x00ff00,
    facing: 1,
    vx: 0,
    vy: 0
  };
  
  cursors = scene.input.keyboard.createCursorKeys();
  attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  
  // Start screen - any key to begin
  scene.input.keyboard.on('keydown', function startGame(e) {
    if (showingStartScreen) {
      showingStartScreen = false;
      scene.input.keyboard.off('keydown', startGame);
      
      // Destroy all start screen texts
      for (let txt of startScreenTexts) {
        if (txt && txt.destroy) {
          txt.destroy();
        }
      }
      startScreenTexts = [];
      
      // Start background music
      startMusic(scene);
      
      playTone(scene, 600, 0.15);
    }
  });
  
  // Skip intro with SPACE (only during intro, not start screen)
  scene.input.keyboard.on('keydown-SPACE', () => {
    if (!showingStartScreen && showingIntro && introStep < 10) {
      // RADICAL CLEANUP - kill all tweens and destroy all text objects
      scene.tweens.killAll();
      
      // Get all children and destroy text objects (except UI texts)
      const children = scene.children.list.slice();
      for (let child of children) {
        if (child.type === 'Text' && child !== scoreText && child !== healthText && child !== cashText && child !== intellectText && child !== levelText) {
          child.destroy();
        }
      }
      
      introTexts = [];
      introStep = 10;
      introTimer = 0;
      showingIntro = false;
      
      // Initialize level system NOW that intro is done
      initLevel(scene);
      
      scene.add.text(400, 30, 'DEBUG FIGHTER', {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: '#ff00ff',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      
      scene.add.text(16, 584, 'ARROWS: Move | SPACE: Attack', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#666666',
        align: 'left'
      }).setOrigin(0, 1);
    }
  });
  
  scoreText = scene.add.text(16, 16, 'SCORE: 0', {
    fontSize: '18px',
    fontFamily: 'monospace',
    color: '#00ff00'
  });
  
  healthText = scene.add.text(140, 16, 'HP: 100', {
    fontSize: '18px',
    fontFamily: 'monospace',
    color: '#ff0000'
  });
  
  cashText = scene.add.text(784, 16, '💰 $0', {
    fontSize: '18px',
    fontFamily: 'monospace',
    color: '#ffff00'
  }).setOrigin(1, 0);
  
  intellectText = scene.add.text(784, 40, '🧠 0', {
    fontSize: '18px',
    fontFamily: 'monospace',
    color: '#00ffff'
  }).setOrigin(1, 0);
  
  levelText = scene.add.text(16, 40, '', {
    fontSize: '16px',
    fontFamily: 'monospace',
    color: '#ffff00'
  });
  
  // DON'T initialize level system here - wait until intro ends
  // initLevel(scene);
  
  playTone(scene, 440, 0.1);
}

function update(time, delta) {
  const scene = this;
  
  if (showingStartScreen) {
    drawStartScreen(this, time);
    return;
  }
  
  if (showingIntro) {
    updateIntro(this, delta);
    return;
  }
  
  if (gameOver) return;
  
  // Manual physics - reset velocity
  player.vx = 0;
  player.vy = 0;
  
  // Keyboard input
  if (cursors.left.isDown) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (cursors.right.isDown) {
    player.vx = player.speed;
    player.facing = 1;
  }
  
  if (cursors.up.isDown) {
    player.vy = -player.speed;
  } else if (cursors.down.isDown) {
    player.vy = player.speed;
  }
  
  // Update position with delta time
  player.x += player.vx * (delta / 1000);
  player.y += player.vy * (delta / 1000);
  
  // Manual bounds checking
  if (player.x < 0) player.x = 0;
  if (player.x > 800 - player.width) player.x = 800 - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y > 600 - player.height) player.y = 600 - player.height;
  
  if (attackCooldown > 0) {
    attackCooldown -= delta;
  }
  
  if (Phaser.Input.Keyboard.JustDown(attackKey) && attackCooldown <= 0) {
    performAttack(this);
    attackCooldown = 300;
  }
  
  // Update projectiles (GIT PUSH!)
  let featuresCompleted = 0;
  
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.x += proj.vx * (delta / 1000);
    proj.y += proj.vy * (delta / 1000);
    
    // Remove if out of bounds
    if (proj.x < 0 || proj.x > 800 || proj.y < 0 || proj.y > 600) {
      projectiles.splice(i, 1);
      continue;
    }
    
    // Check collision with FEATURES
    for (let j = features.length - 1; j >= 0; j--) {
      const feature = features[j];
      const dx = (feature.x + feature.size / 2) - proj.x;
      const dy = (feature.y + feature.size / 2) - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < feature.size / 2 + proj.size) {
        // Hit! Reduce feature health
        feature.health--;
        projectiles.splice(i, 1);
        
        // IMPORTANT: Each git push has a chance to spawn a BUG!
        if (Math.random() < bugSpawnChance) {
          spawnBugAtPosition(this, feature.x, feature.y);
        }
        
        if (feature.health <= 0) {
          // Feature completed! Client is HAPPY!
          features.splice(j, 1);
          featuresCompleted++;
          playTone(this, 900, 0.15);
          
          // RESET GLOBAL TIMER when you complete a feature!
          globalFeatureTimer = featureTimeout;
          
          // Show happy client message!
          showClientSatisfied(this, feature.name);
        } else {
          // Just damaged
          playTone(this, 700, 0.08);
        }
        break;
      }
    }
    
    // Also check collision with BUGS (can destroy bugs too)
    for (let j = bugs.length - 1; j >= 0; j--) {
      const bug = bugs[j];
      const dx = (bug.x + bug.size / 2) - proj.x;
      const dy = (bug.y + bug.size / 2) - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < bug.size / 2 + proj.size) {
        // Destroyed a bug
        bugs.splice(j, 1);
        projectiles.splice(i, 1);
        playTone(this, 600, 0.08);
        score += 5; // Small bonus for killing bugs
        scoreText.setText('SCORE: ' + score);
        break;
      }
    }
  }
  
  // Update score for completed features
  if (featuresCompleted > 0) {
    score += featuresCompleted * 40; // 40 points per feature!
    levelScore += featuresCompleted * 40;
    scoreText.setText('SCORE: ' + score);
    // DON'T call updateLevelProgress here - causes crash
    // We'll check progress at the end of update instead
  }
  
  // Spawn features
  spawnTimer += delta;
  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnFeature(this); // Changed to spawn features
    if (spawnDelay > 800) {
      spawnDelay -= 50;
    }
  }
  
  // Spawn powerups!
  powerupSpawnTimer += delta;
  if (powerupSpawnTimer >= powerupSpawnDelay) {
    powerupSpawnTimer = 0;
    spawnPowerup(this);
  }
  
  // Update powerups and check collision with player
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    
    // Check if player touches powerup
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const dist = Math.sqrt((px - powerup.x) ** 2 + (py - powerup.y) ** 2);
    
    if (dist < player.width / 2 + powerup.size) {
      // Collected!
      if (powerup.type === 'cash') {
        cash += 50;
        if (cashText) cashText.setText('💰 $' + cash);
        showPowerupMessage(this, 'mmm migajas', '#ffff00');
      } else if (powerup.type === 'intellect') {
        intellect += 10;
        if (intellectText) intellectText.setText('🧠 ' + intellect);
        showPowerupMessage(this, 'nuevo tuto de youtube', '#00ffff');
      } else if (powerup.type === 'food') {
        health = Math.min(100, health + 25);
        if (healthText) healthText.setText('HP: ' + health);
        showPowerupMessage(this, 'ñam ñam', '#ff00ff');
      }
      
      // Remove powerup
      powerups.splice(i, 1);
    }
  }
  
  // Update GLOBAL FEATURE TIMER (only if there are features!)
  if (features.length > 0) {
    globalFeatureTimer -= delta;
    
    if (globalFeatureTimer <= 0) {
      // Timeout! Client gets angry and you lose health
      health -= 15; // Timeout penalty!
      healthText.setText('HP: ' + Math.max(0, health));
      playTone(this, 150, 0.3);
      
      // Don't show message - it causes crashes
      // The red timer bar is enough visual feedback!
      
      // Reset timer for next cycle
      globalFeatureTimer = featureTimeout;
      
      if (health <= 0) {
        endGame(this);
      }
    }
  } else {
    // No features? Keep timer ready
    globalFeatureTimer = featureTimeout;
  }
  
  // Features don't need individual updates - they're static!

  
  // Update BUGS (spawned from git pushes - THEY CHASE YOU!)
  for (let i = bugs.length - 1; i >= 0; i--) {
    const bug = bugs[i];
    
    const dx = player.x - bug.x;
    const dy = player.y - bug.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      bug.x += (dx / dist) * bug.speed * (delta / 1000);
      bug.y += (dy / dist) * bug.speed * (delta / 1000);
    }
    
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const bx = bug.x + bug.size / 2;
    const by = bug.y + bug.size / 2;
    const collDist2 = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
    
    if (collDist2 < (player.width + bug.size) / 2) {
      health -= 10; // Bugs do more damage!
      healthText.setText('HP: ' + Math.max(0, health));
      bugs.splice(i, 1);
      playTone(this, 150, 0.15);
      
      // Don't call showClientCall here - bugs are already the punishment!
      
      if (health <= 0) {
        endGame(this);
      }
    }
  }
  
  // Update level progress at the END, safely
  if (!showingStartScreen && !showingIntro && !gameOver) {
    updateLevelProgress(this);
  }
  
  // Update message bubble timer
  if (messageBubbleTimer > 0) {
    messageBubbleTimer -= delta;
    if (messageBubbleTimer <= 0 && messageBubble) {
      messageBubble.setVisible(false);
    }
  }
  
  // Update promotion bubble timer
  if (promotionBubbleTimer > 0) {
    promotionBubbleTimer -= delta;
    if (promotionBubbleTimer <= 0 && promotionBubble) {
      promotionBubble.setVisible(false);
    }
  }
  
  drawGame();
}

function drawStartScreen(scene, time) {
  graphics.clear();
  graphics.fillStyle(0x0a0a1a, 1);
  graphics.fillRect(0, 0, 800, 600);
  
  // Create texts only once
  if (startScreenTexts.length === 0) {
    // Title
    const title = scene.add.text(400, 200, 'DEBUG FIGHTER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle
    const subtitle = scene.add.text(400, 280, 'A Developer\'s Journey', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ffff',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Pulsing "Press Any Key" text
    const startText = scene.add.text(400, 400, 'PRESS ANY KEY TO START', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    // Animate the pulsing text
    scene.tweens.add({
      targets: startText,
      alpha: { from: 1, to: 0.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Credits
    const credits = scene.add.text(400, 500, 'Arrow Keys: Move | Space: Attack', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666'
    }).setOrigin(0.5);
    
    startScreenTexts.push(title, subtitle, startText, credits);
  }
}

function updateIntro(scene, delta) {
  introTimer += delta;
  
  graphics.clear();
  graphics.fillStyle(0x0a0a1a, 1);
  graphics.fillRect(0, 0, 800, 600);
  
  // Wait for texts to finish appearing before checking for fade out
  const allTextsReady = introTexts.length > 0 && introTexts.every(t => t.alpha >= 0.9 || !t.active);
  
  // Step progression with fade out
  if (introTimer > 2000 && introStep === 0 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 1; introTimer = 0; });
    return;
  }
  if (introTimer > 2500 && introStep === 1 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 2; introTimer = 0; });
    return;
  }
  if (introTimer > 2500 && introStep === 2 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 3; introTimer = 0; });
    return;
  }
  if (introTimer > 2500 && introStep === 3 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 4; introTimer = 0; });
    return;
  }
  if (introTimer > 3500 && introStep === 4 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 5; introTimer = 0; });
    return;
  }
  if (introTimer > 2500 && introStep === 5 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 6; introTimer = 0; });
    return;
  }
  if (introTimer > 3000 && introStep === 6 && allTextsReady) { 
    fadeOutIntro(scene, () => { introStep = 10; });
    return;
  }
  
  // Story sequence with animations (only create when array is empty)
  if (introStep === 0 && introTexts.length === 0) {
    createIntroText(scene, 'THE YEAR IS 2025...', 300, 0x00ffff, 28);
  } else if (introStep === 1 && introTexts.length === 0) {
    createIntroText(scene, 'You are a FREELANCER', 250, 0x00ff00, 24);
    createIntroText(scene, 'Working from coffee shops', 300, 0x888888, 18, 200);
    createIntroText(scene, 'Armed only with HTML, CSS & JS', 340, 0x888888, 18, 400);
  } else if (introStep === 2 && introTexts.length === 0) {
    createIntroText(scene, 'The tech world is full of BUGS', 250, 0xff0000, 24);
    createIntroText(scene, 'NullPointerExceptions...', 300, 0xff6666, 18, 200);
    createIntroText(scene, 'Memory Leaks...', 330, 0xff6666, 18, 400);
    createIntroText(scene, 'Syntax Errors...', 360, 0xff6666, 18, 600);
  } else if (introStep === 3 && introTexts.length === 0) {
    createIntroText(scene, 'Your mission:', 260, 0xffff00, 24);
    createIntroText(scene, 'Climb the corporate ladder', 310, 0xffffff, 20, 200);
    createIntroText(scene, 'From FREELANCER to CEO', 350, 0x00ffff, 20, 400);
  } else if (introStep === 4 && introTexts.length === 0) {
    createCareerPathAnimated(scene);
  } else if (introStep === 5 && introTexts.length === 0) {
    createIntroText(scene, 'Defeat the bugs', 260, 0xff00ff, 24);
    createIntroText(scene, 'Level up your skills', 310, 0xff00ff, 24, 200);
    createIntroText(scene, 'Become the UNICORN DEVELOPER', 360, 0xffff00, 24, 400);
  } else if (introStep === 6 && introTexts.length === 0) {
    const txt = scene.add.text(400, 300, 'Press SPACE to begin your journey', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00ff00',
      alpha: 0
    }).setOrigin(0.5);
    
    scene.tweens.add({
      targets: txt,
      alpha: 1,
      y: 300,
      duration: 500,
      ease: 'Power2'
    });
    
    scene.tweens.add({
      targets: txt,
      alpha: { from: 1, to: 0.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    introTexts.push(txt);
  } else if (introStep === 10) {
    // RADICAL CLEANUP - destroy ALL text objects in the scene
    scene.tweens.killAll();
    
    // Get all children and destroy text objects (except UI texts)
    const children = scene.children.list.slice();
    for (let child of children) {
      if (child.type === 'Text' && child !== scoreText && child !== healthText && child !== cashText && child !== intellectText && child !== levelText) {
        child.destroy();
      }
    }
    
    introTexts = [];
    showingIntro = false;
    
    // Initialize level system NOW that intro is done
    initLevel(scene);
    
    scene.add.text(400, 30, 'DEBUG FIGHTER', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    scene.add.text(400, 570, 'ARROWS: Move | SPACE: Attack', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666',
      align: 'center'
    }).setOrigin(0.5);
    
    // Initialize level system
    initLevel(scene);
    
    introStep = 11;
  }
}

function createIntroText(scene, text, y, color, size, delay = 0) {
  const txt = scene.add.text(400, y + 50, text, {
    fontSize: size + 'px',
    fontFamily: 'monospace',
    color: '#' + color.toString(16).padStart(6, '0'),
    alpha: 0
  }).setOrigin(0.5);
  
  scene.tweens.add({
    targets: txt,
    alpha: 1,
    y: y,
    duration: 800,
    delay: delay,
    ease: 'Power2'
  });
  
  introTexts.push(txt);
}

function fadeOutIntro(scene, callback) {
  if (introTexts.length === 0) {
    callback();
    return;
  }
  
  // Kill ALL tweens to stop any delayed animations
  scene.tweens.killAll();
  
  for (let txt of introTexts) {
    // Immediately destroy without fade animation to avoid conflicts
    if (txt && txt.destroy) {
      txt.destroy();
    }
  }
  
  introTexts = [];
  callback();
}

function createCareerPathAnimated(scene) {
  const startY = 180;
  
  const title = scene.add.text(400, startY - 20 + 50, 'YOUR CAREER PATH:', {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: '#ffff00',
    alpha: 0
  }).setOrigin(0.5);
  
  scene.tweens.add({
    targets: title,
    alpha: 1,
    y: startY - 20,
    duration: 600,
    ease: 'Power2'
  });
  
  introTexts.push(title);
  
  const colors = [0x888888, 0x00ff00, 0x00ffff, 0xff00ff, 0xff9900, 0xffff00];
  
  for (let i = 0; i < careerPath.length; i++) {
    const step = careerPath[i];
    const y = startY + 30 + i * 45;
    const delay = i * 150 + 200;
    
    const num = scene.add.text(150, y + 50, (i + 1) + '.', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#666666',
      alpha: 0
    });
    
    const titleTxt = scene.add.text(200, y + 50, step.title, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#' + colors[i].toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      alpha: 0
    });
    
    const desc = scene.add.text(200, y + 20 + 50, step.desc, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
      alpha: 0
    });
    
    scene.tweens.add({
      targets: [num, titleTxt, desc],
      alpha: 1,
      y: '-=50',
      duration: 600,
      delay: delay,
      ease: 'Power2'
    });
    
    introTexts.push(num, titleTxt, desc);
  }
}

function spawnFeature(scene) {
  // Features spawn at random positions (but STATIC - not on edges)
  const x = 100 + Math.random() * 600; // Keep away from edges
  const y = 100 + Math.random() * 400;
  
  // Different feature types
  const types = [
    { name: 'LOGIN', color: 0x00ffff, size: 24 },
    { name: 'CART', color: 0x00ff00, size: 26 },
    { name: 'SEARCH', color: 0xffff00, size: 22 },
    { name: 'PAYMENT', color: 0xff00ff, size: 28 }
  ];
  
  const type = types[Math.floor(Math.random() * types.length)];
  
  features.push({
    x: x,
    y: y,
    size: type.size,
    color: type.color,
    name: type.name,
    health: 5, // Features need 5 hits!
    maxHealth: 5
    // No individual timer - using global timer!
  });
}

function spawnPowerup(scene) {
  // Spawn powerups randomly on the map
  const x = 100 + Math.random() * 600;
  const y = 100 + Math.random() * 400;
  
  // 3 types of powerups
  const types = [
    { type: 'cash', emoji: '💰', color: 0xffff00, size: 18 },
    { type: 'intellect', emoji: '🧠', color: 0x00ffff, size: 18 },
    { type: 'food', emoji: '🍕', color: 0xff00ff, size: 18 }
  ];
  
  const powerupType = types[Math.floor(Math.random() * types.length)];
  
  powerups.push({
    x: x,
    y: y,
    size: powerupType.size,
    color: powerupType.color,
    type: powerupType.type,
    emoji: powerupType.emoji
  });
}

function spawnBugAtPosition(scene, x, y) {
  // Spawn a bug at a specific position (when git push creates bugs!)
  const types = [
    { name: 'BUG', color: 0xff0000, size: 12, speed: 60 },
    { name: 'NULL', color: 0xff6600, size: 14, speed: 55 },
    { name: 'LEAK', color: 0xff3300, size: 10, speed: 70 }
  ];
  
  const type = types[Math.floor(Math.random() * types.length)];
  
  bugs.push({
    x: x + (Math.random() - 0.5) * 30, // Spawn near the feature
    y: y + (Math.random() - 0.5) * 30,
    size: type.size,
    speed: type.speed,
    color: type.color,
    name: type.name
  });
}

function performAttack(scene) {
  // Shoot a projectile! (GIT PUSH!)
  playTone(scene, 600, 0.1);
  
  const projectile = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    vx: player.facing * 400, // Speed in direction player is facing
    vy: 0,
    size: 5,
    color: 0x00ffff
  };
  
  projectiles.push(projectile);
}

function initLevel(scene) {
  currentLevel = 0;
  levelScore = 0;
  clients = [];
  
  const level = careerPath[currentLevel];
  const clientList = clientNames[currentLevel];
  
  for (let i = 0; i < level.clients; i++) {
    clients.push({
      name: clientList[i],
      satisfied: false,
      pointsNeeded: Math.floor(levelTargets[currentLevel] / level.clients)
    });
  }
  
  updateLevelProgress(scene);
  drawClientList(scene);
}

function updateLevelProgress(scene) {
  // Safety check - don't run during intro/start screen
  if (!scene || showingStartScreen || showingIntro) return;
  if (!levelText || clients.length === 0) return;
  
  const level = careerPath[currentLevel];
  const target = levelTargets[currentLevel];
  const progress = Math.floor((levelScore / target) * 100);
  
  levelText.setText(`${level.title} | ${levelScore}/${target} (${progress}%)`);
  levelText.setVisible(true);
  
  const pointsPerClient = Math.floor(target / level.clients);
  for (let i = 0; i < clients.length; i++) {
    if (!clients[i].satisfied && levelScore >= pointsPerClient * (i + 1)) {
      clients[i].satisfied = true;
      // DON'T show visual - just update UI and play sound
      drawClientList(scene);
      playTone(scene, 800, 0.3);
    }
  }
  
  if (levelScore >= target) {
    levelUp(scene);
  }
}

function drawClientList(scene) {
  // Safety check - don't run during intro/start screen
  if (!scene || showingStartScreen || showingIntro) return;
  if (clients.length === 0) return;
  
  const startX = 600;
  const startY = 80;
  const label = levelLabels[currentLevel];
  
  // Create texts ONLY if container is empty (first time only)
  if (clientsContainer.length === 0) {
    // Create title
    const title = scene.add.text(startX, startY, label + ':', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffff00',
      fontStyle: 'bold'
    });
    clientsContainer.push(title);
    
    // Create text objects - create MAX we might need (6 clients max in game)
    for (let i = 0; i < 6; i++) {
      const y = startY + 25 + i * 30;
      const txt = scene.add.text(startX, y, '', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff6600'
      });
      txt.setVisible(false); // Hide by default
      clientsContainer.push(txt);
    }
  }
  
  // Update existing texts
  if (clientsContainer[0]) {
    clientsContainer[0].setText(label + ':');
  }
  
  // Update and show/hide client texts based on current level
  for (let i = 0; i < 6; i++) {
    const txtIndex = i + 1;
    if (!clientsContainer[txtIndex]) continue;
    
    if (i < clients.length) {
      const client = clients[i];
      const statusIcon = client.satisfied ? '✓' : (currentLevel === 0 ? '📞' : '⏳');
      const color = client.satisfied ? '#00ff00' : '#ff6600';
      
      clientsContainer[txtIndex].setText(`${statusIcon} ${client.name}`);
      clientsContainer[txtIndex].setColor(color);
      clientsContainer[txtIndex].setVisible(true);
    } else {
      // Hide unused text objects
      clientsContainer[txtIndex].setVisible(false);
    }
  }
}

function showClientCall(scene) {
  // Safety check
  if (!scene || showingStartScreen || showingIntro) return;
  
  const unsatisfied = clients.filter(c => !c.satisfied);
  if (unsatisfied.length === 0) return;
  
  // Play annoying phone sound
  playTone(scene, 400, 0.15);
  
  // Messages in Spanish by career level - more variety!
  const messagesByLevel = [
    // FREELANCER - Clientes imposibles (memes)
    [
      '📱 ¿DÓNDE ESTÁ MI PÁGINA? 😡',
      '📱 "Hazlo como Facebook" - Presupuesto: $50 💀',
      '📱 Mi sobrino de 12 sabe HTML... 🙄',
      '📱 ¿Por qué tan caro? Solo son clicks 🤦',
      '� "Rápido y barato" - Escoge uno ⚠️',
      '📱 Cambios: Rediseño completo 😱',
      '📱 "En Wix es gratis" - Entonces úsalo 🚪',
      '📱 3am: "Una preguntita rápida..." 😴',
      '📱 Quiero Netflix. Tengo $100 �',
      '📱 "Cópialo igualito a Amazon" 💸',
      '📱 No me gusta el azul... todo azul 🎨',
      '📱 ¿Puedes hacerlo trabajar en IE6? 🦕'
    ],
    // JUNIOR DEV - Caos diario
    [
      '📱 "Works on my machine" - QA furioso �️',
      '📱 Olvidaste el await... otra vez �',
      '📱 Git push --force en main 💥',
      '📱 HOTFIX: Agregaste 47 bugs nuevos �',
      '📱 "Solo son 2 líneas" - 2000 líneas 📝',
      '📱 Merge conflict de 500 archivos 😰',
      '📱 npm install = 30 minutos ⏰',
      '📱 "Funciona en dev" - Prod en llamas 🔥',
      '📱 Stack Overflow caído = Pánico �',
      '📱 Producción un viernes 5pm 🎲',
      '📱 console.log() en 847 lugares 🤡',
      '📱 JIRA: 42 tickets sin asignar 📊'
    ],
    // SENIOR DEV - Mentorías infinitas
    [
      '📱 "¿Diferencia entre var, let, const?" 💭',
      '📱 Junior usó jQuery en React 😵',
      '📱 "¿Qué es this?" - Buena pregunta 🤔',
      '📱 Callback hell de 12 niveles 🌀',
      '📱 "¿Por qué no usar eval()?" �',
      '📱 Hardcodeó las credenciales 🔑',
      '📱 != vs !== - La conversación eterna ♾️',
      '📱 "No necesitamos TypeScript" 🙈',
      '📱 Subió node_modules a git �',
      '📱 "¿SQL Injection qué es eso?" 💉',
      '📱 Copió código de 2009 🦖',
      '📱 "Los comentarios son para débiles" �'
    ],
    // TECH LEAD - Arquitectura y política
    [
      '📱 "¿Por qué no Kubernetes?" 🐳',
      '📱 PM: "¿Cuánto falta?" Yo: "Sí" �',
      '📱 Microservicios = Macro problemas 🏗️',
      '📱 Technical debt = Monte Everest 🏔️',
      '📱 Sprint planning: 4 horas 💤',
      '📱 Retrospectiva: Nadie habla 🤐',
      '📱 "Estimación" - Multiplica x3 📈',
      '📱 Legacy code de 2001 llamando �',
      '📱 "Reescribir desde cero" - No. 🛑',
      '📱 Standup: 45 minutos de pie �',
      '📱 Bus factor = 1 (tú) 🚌',
      '📱 Documentación: "Ver código" �'
    ],
    // CTO - Reuniones eternas
    [
      '📱 "Blockchain revolucionará todo" �',
      '📱 CEO: "Como Uber pero para X" 🚗',
      '📱 Board: "¿Por qué gastamos tanto?" �',
      '📱 "IA resolverá el problema" - No 🤖',
      '📱 Reunión sobre reuniones 🔄',
      '📱 "Solo necesitamos más devs" �',
      '📱 Investor: "¿Cuándo IPO?" 📊',
      '📱 "Migrar todo a la nube" - $$$$ ☁️',
      '📱 Technical excellence vs. "Ship it" ⚖️',
      '📱 "NoSQL es el futuro" - Era 2015 �️'
    ],
    // CEO - El apocalipsis
    [
      '¡TODO ESTÁ EN FUEGO! �🔥🔥',
      '📱 Crisis de relaciones públicas 📰',
      '📱 Competidor levantó $100M 😱',
      '📱 TechCrunch: Review negativo 💔',
      '📱 Usuario #1 canceló suscripción 👋',
      '📱 Server en llamas literalmente 🔥',
      '📱 "Rocket ship" = Titanic 🚢',
      '📱 Inversionistas retirándose 💸',
      '📱 ¡El competidor nos superó! 🏃',
      '📱 Reunión con la junta YA! 🚨',
      '📱 AWS: Factura de $50,000 💸',
      '📱 Hackeo masivo - CNN llamando 📰',
      '📱 "Pivot" #47 esta semana 🔄',
      '📱 Inversores: "No hay tracción" 📉'
    ]
  ];
  
  // Create message bubble if it doesn't exist
  if (!messageBubble) {
    messageBubble = scene.add.text(400, 560, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff0000',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 },
      align: 'center'
    }).setOrigin(0.5).setVisible(false);
  }
  
  // Pick random message from current level
  const levelMessages = messagesByLevel[currentLevel] || messagesByLevel[0];
  const randomMsg = levelMessages[Math.floor(Math.random() * levelMessages.length)];
  
  // Show the message
  messageBubble.setText(randomMsg);
  messageBubble.setVisible(true);
  messageBubbleTimer = 2000; // Show for 2 seconds
  
  // Take damage
  health -= 10;
  if (health < 0) health = 0;
}

function showClientSatisfied(scene, clientName) {
  // Safety check
  if (!scene || showingStartScreen || showingIntro) return;
  
  // Play happy sound
  playTone(scene, 800, 0.3);
  
  // Positive messages in Spanish!
  const celebrationMessages = [
    '¡Excelente trabajo! ⭐',
    '¡Perfecto! 🎉',
    '¡Cliente feliz! 😊',
    'Deploy exitoso! 🚀',
    '¡Bug resuelto! ✅',
    '¡Gran trabajo! 👏',
    '¡Código limpio! 💯',
    '¡PR aprobado! ✨'
  ];
  
  // Create or show message bubble
  if (!messageBubble) {
    messageBubble = scene.add.text(400, 560, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ff00',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 },
      align: 'center'
    }).setOrigin(0.5).setVisible(false);
  }
  
  const randomMsg = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
  messageBubble.setText(randomMsg);
  messageBubble.setColor('#00ff00'); // Green for positive
  messageBubble.setVisible(true);
  messageBubbleTimer = 1500; // Show for 1.5 seconds
}

function showPowerupMessage(scene, message, color) {
  if (!scene) return;
  
  // Create or show message bubble
  if (!messageBubble) {
    messageBubble = scene.add.text(400, 560, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: color,
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 15, y: 10 },
      align: 'center'
    }).setOrigin(0.5).setVisible(false);
  }
  
  messageBubble.setText(message);
  messageBubble.setColor(color);
  messageBubble.setVisible(true);
  messageBubbleTimer = 1000; // Show for 1 second
}

function levelUp(scene) {
  if (!scene) return;
  
  currentLevel++;
  
  if (currentLevel >= careerPath.length) {
    winGame(scene);
    return;
  }
  
  levelScore = 0;
  clients = [];
  
  const level = careerPath[currentLevel];
  const clientList = clientNames[currentLevel];
  
  for (let i = 0; i < level.clients; i++) {
    clients.push({
      name: clientList[i],
      satisfied: false,
      pointsNeeded: Math.floor(levelTargets[currentLevel] / level.clients)
    });
  }
  
  // Play promotion sound
  playTone(scene, 1000, 0.5);
  
  // Create promotion bubble if it doesn't exist
  if (!promotionBubble) {
    promotionBubble = scene.add.text(400, 300, '', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffff00',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 20, y: 15 },
      align: 'center',
      stroke: '#ff00ff',
      strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);
  }
  
  // Promotion messages in Spanish!
  const promotionMessages = [
    '¡ASCENDIDO! 🎉\n' + level.title,
    '¡PROMOCIÓN! 🚀\n' + level.title,
    '¡NIVEL UP! ⭐\n' + level.title,
    '¡FELICITACIONES! 🎊\n' + level.title,
    '¡NUEVO CARGO! 💼\n' + level.title
  ];
  
  const randomPromo = promotionMessages[Math.floor(Math.random() * promotionMessages.length)];
  promotionBubble.setText(randomPromo);
  promotionBubble.setVisible(true);
  promotionBubbleTimer = 3000; // Show for 3 seconds
  
  // Update client list
  drawClientList(scene);
}

function winGame(scene) {
  gameOver = true;
  stopMusic();
  
  const overlay = scene.add.graphics();
  overlay.fillStyle(0xffff00, 0.95);
  overlay.fillRect(0, 0, 800, 600);
  
  const winText = scene.add.text(400, 250, 'UNICORN DEVELOPER!', {
    fontSize: '64px',
    fontFamily: 'monospace',
    color: '#ff00ff',
    stroke: '#000000',
    strokeThickness: 6,
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  scene.add.text(400, 350, 'You conquered the tech world!', {
    fontSize: '24px',
    fontFamily: 'monospace',
    color: '#000000'
  }).setOrigin(0.5);
  
  scene.add.text(400, 400, `Final Score: ${score}`, {
    fontSize: '28px',
    fontFamily: 'monospace',
    color: '#00ff00',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  scene.add.text(400, 500, 'Press R to Restart', {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: '#666666'
  }).setOrigin(0.5);
  
  scene.tweens.add({
    targets: winText,
    scale: { from: 1, to: 1.1 },
    duration: 1000,
    yoyo: true,
    repeat: -1
  });
  
  scene.input.keyboard.once('keydown-R', () => {
    scene.scene.restart();
    resetGame();
  });
}

function drawGame() {
  graphics.clear();
  
  // Draw background based on current level
  drawBackground();
  
  // Draw player (improved developer character)
  drawPlayer();
  
  // Draw projectiles (git push bullets!)
  for (let proj of projectiles) {
    graphics.fillStyle(proj.color, 1);
    graphics.fillCircle(proj.x, proj.y, proj.size);
    
    // Git icon effect
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(proj.x - 2, proj.y - 2, 1);
    graphics.fillCircle(proj.x + 2, proj.y - 2, 1);
    graphics.fillCircle(proj.x, proj.y + 2, 1);
  }
  
  // Draw FEATURES (improved with details!)
  for (let feature of features) {
    drawFeature(feature);
  }
  
  // Draw GLOBAL TIMER BAR at top of screen
  if (features.length > 0) {
    const timerBarWidth = 300;
    const timerBarHeight = 12;
    const timerBarX = 250;
    const timerBarY = 20;
    const timerPercent = globalFeatureTimer / featureTimeout;
    const timerColor = timerPercent > 0.5 ? 0x0088ff : (timerPercent > 0.25 ? 0xff8800 : 0xff0000);
    
    graphics.fillStyle(0x000000, 0.7);
    graphics.fillRect(timerBarX - 2, timerBarY - 2, timerBarWidth + 4, timerBarHeight + 4);
    
    graphics.fillStyle(timerColor, 1);
    graphics.fillRect(timerBarX, timerBarY, timerBarWidth * timerPercent, timerBarHeight);
    
    graphics.lineStyle(2, 0xffffff, 0.8);
    graphics.strokeRect(timerBarX - 2, timerBarY - 2, timerBarWidth + 4, timerBarHeight + 4);
  }
  
  // Draw POWERUPS
  for (let powerup of powerups) {
    const pulse = Math.sin(Date.now() / 200) * 2 + 22;
    graphics.fillStyle(powerup.color, 0.4);
    graphics.fillCircle(powerup.x, powerup.y, pulse);
    
    graphics.lineStyle(2, powerup.color, 0.9);
    graphics.strokeCircle(powerup.x, powerup.y, pulse);
    
    graphics.fillStyle(powerup.color, 0.8);
    graphics.fillCircle(powerup.x, powerup.y, 12);
    
    graphics.lineStyle(0);
    if (powerup.type === 'cash') {
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(powerup.x - 1, powerup.y - 6, 2, 12);
      graphics.fillRect(powerup.x - 4, powerup.y - 4, 8, 2);
      graphics.fillRect(powerup.x - 4, powerup.y + 2, 8, 2);
    } else if (powerup.type === 'intellect') {
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(powerup.x - 5, powerup.y - 3, 10, 2);
      graphics.fillRect(powerup.x - 5, powerup.y + 1, 10, 2);
    } else if (powerup.type === 'food') {
      graphics.fillStyle(0x000000, 1);
      graphics.beginPath();
      graphics.moveTo(powerup.x, powerup.y - 6);
      graphics.lineTo(powerup.x - 6, powerup.y + 6);
      graphics.lineTo(powerup.x + 6, powerup.y + 6);
      graphics.closePath();
      graphics.fillPath();
    }
  }
  
  // Draw BUGS (improved with antenna!)
  for (let bug of bugs) {
    drawBug(bug);
  }
}

function drawBackground() {
  // Background based on career level
  if (currentLevel === 0) {
    // Freelancer - Home/bedroom
    graphics.fillStyle(0x2a1a3a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Window
    graphics.fillStyle(0x4a5a8a, 1);
    graphics.fillRect(650, 80, 120, 140);
    graphics.lineStyle(3, 0x1a2a4a, 1);
    graphics.strokeRect(650, 80, 120, 140);
    graphics.lineTo(710, 80);
    graphics.lineTo(710, 220);
    graphics.strokePath();
    
    // Bed
    graphics.fillStyle(0x5a3a4a, 1);
    graphics.fillRect(50, 450, 150, 80);
    graphics.fillStyle(0x4a2a3a, 1);
    graphics.fillRect(50, 430, 150, 20);
    
  } else if (currentLevel === 1) {
    // Junior - Small office
    graphics.fillStyle(0x2a3a4a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Desk
    graphics.fillStyle(0x6a4a2a, 1);
    graphics.fillRect(600, 480, 180, 15);
    graphics.fillRect(610, 495, 10, 80);
    graphics.fillRect(760, 495, 10, 80);
    
    // Monitor
    graphics.fillStyle(0x1a1a2a, 1);
    graphics.fillRect(640, 420, 100, 60);
    graphics.fillStyle(0x2a4a6a, 1);
    graphics.fillRect(645, 425, 90, 50);
    
  } else if (currentLevel === 2) {
    // Mid-level - Office with cubicle
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Cubicle walls
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillRect(0, 300, 150, 300);
    graphics.fillRect(750, 0, 50, 600);
    
    // Plant
    graphics.fillStyle(0x2a5a2a, 1);
    graphics.fillCircle(80, 380, 25);
    graphics.fillStyle(0x4a3a2a, 1);
    graphics.fillRect(75, 400, 10, 40);
    
  } else if (currentLevel === 3) {
    // Senior - Bigger office
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Window view
    graphics.fillStyle(0x6a8aaa, 1);
    graphics.fillRect(550, 60, 220, 200);
    graphics.fillStyle(0x8aaacc, 0.5);
    graphics.fillRect(555, 65, 105, 95);
    graphics.fillRect(665, 65, 105, 95);
    graphics.fillRect(555, 165, 105, 90);
    graphics.fillRect(665, 165, 105, 90);
    
    // Bookshelf
    graphics.fillStyle(0x4a2a1a, 1);
    graphics.fillRect(50, 200, 100, 200);
    for (let i = 0; i < 4; i++) {
      graphics.fillStyle(0x3a1a0a, 1);
      graphics.fillRect(50, 200 + i * 50, 100, 3);
    }
    
  } else if (currentLevel === 4) {
    // Lead - Corner office
    graphics.fillStyle(0x5a5a6a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Large windows
    graphics.fillStyle(0x7aaacc, 1);
    graphics.fillRect(500, 50, 280, 250);
    graphics.fillStyle(0x9accee, 0.4);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        graphics.fillRect(505 + i * 90, 55 + j * 120, 85, 115);
      }
    }
    
    // Conference table
    graphics.fillStyle(0x3a2a1a, 1);
    graphics.fillRect(100, 450, 250, 100);
    
  } else {
    // CTO/CEO - Executive suite
    graphics.fillStyle(0x6a6a7a, 1);
    graphics.fillRect(0, 0, 800, 600);
    
    // Floor-to-ceiling windows
    graphics.fillStyle(0x8accee, 1);
    graphics.fillRect(450, 0, 350, 400);
    graphics.fillStyle(0xaaddff, 0.3);
    for (let i = 0; i < 4; i++) {
      graphics.fillRect(455 + i * 85, 5, 80, 390);
    }
    
    // Luxury desk
    graphics.fillStyle(0x2a1a0a, 1);
    graphics.fillRect(550, 480, 220, 20);
    graphics.fillRect(560, 500, 15, 80);
    graphics.fillRect(745, 500, 15, 80);
    
    // Awards/trophies
    graphics.fillStyle(0xffdd00, 1);
    graphics.fillCircle(120, 180, 15);
    graphics.fillRect(115, 195, 10, 30);
    graphics.fillCircle(200, 180, 15);
    graphics.fillRect(195, 195, 10, 30);
  }
  
  // Floor
  graphics.fillStyle(0x1a1a2a, 0.3);
  graphics.fillRect(0, 550, 800, 50);
}

function drawPlayer() {
  // Body (hoodie style)
  graphics.fillStyle(player.color, 1);
  graphics.fillRect(player.x, player.y, player.width, player.height);
  
  // Hood/hair
  graphics.fillStyle(0x2a2a2a, 1);
  graphics.fillRect(player.x + 2, player.y, player.width - 4, 6);
  
  // Face
  graphics.fillStyle(0xffcc99, 1);
  graphics.fillRect(player.x + 4, player.y + 6, player.width - 8, 10);
  
  // Eyes
  graphics.fillStyle(0x000000, 1);
  const eyeOffset = player.facing > 0 ? 12 : 4;
  graphics.fillRect(player.x + eyeOffset, player.y + 8, 2, 2);
  
  // Laptop (when not moving)
  if (player.vx === 0 && player.vy === 0) {
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillRect(player.x + 4, player.y + player.height - 6, 12, 4);
    graphics.fillStyle(0x2a4a6a, 1);
    graphics.fillRect(player.x + 5, player.y + player.height - 5, 10, 2);
  }
  
  // Arms
  graphics.fillStyle(0xffcc99, 1);
  graphics.fillRect(player.x, player.y + 12, 3, 8);
  graphics.fillRect(player.x + player.width - 3, player.y + 12, 3, 8);
}

function drawFeature(feature) {
  // Feature document/task
  graphics.fillStyle(0xeeeeee, 1);
  graphics.fillRect(feature.x, feature.y, feature.size, feature.size);
  
  // Border
  graphics.lineStyle(2, feature.color, 1);
  graphics.strokeRect(feature.x, feature.y, feature.size, feature.size);
  
  // Lines (like code/text)
  graphics.lineStyle(0);
  graphics.fillStyle(feature.color, 0.6);
  for (let i = 0; i < 3; i++) {
    graphics.fillRect(feature.x + 4, feature.y + 6 + i * 5, feature.size - 8, 2);
  }
  
  // Checkbox/icon
  graphics.fillStyle(0x888888, 1);
  graphics.fillCircle(feature.x + 8, feature.y + feature.size - 8, 4);
  
  // Health bar
  const barWidth = feature.size;
  const barHeight = 3;
  const healthPercent = feature.health / feature.maxHealth;
  
  graphics.fillStyle(0x000000, 1);
  graphics.fillRect(feature.x, feature.y - 10, barWidth, barHeight);
  
  const healthColor = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.25 ? 0xffff00 : 0xff0000);
  graphics.fillStyle(healthColor, 1);
  graphics.fillRect(feature.x, feature.y - 10, barWidth * healthPercent, barHeight);
}

function drawBug(bug) {
  // Bug body (insect-like)
  graphics.fillStyle(bug.color, 1);
  graphics.fillEllipse(bug.x + bug.size/2, bug.y + bug.size/2, bug.size/2, bug.size/3);
  
  // Head
  graphics.fillCircle(bug.x + bug.size/2, bug.y + 4, 4);
  
  // Antennae
  graphics.lineStyle(1, bug.color, 1);
  graphics.beginPath();
  graphics.moveTo(bug.x + bug.size/2 - 2, bug.y + 2);
  graphics.lineTo(bug.x + bug.size/2 - 4, bug.y - 3);
  graphics.strokePath();
  graphics.beginPath();
  graphics.moveTo(bug.x + bug.size/2 + 2, bug.y + 2);
  graphics.lineTo(bug.x + bug.size/2 + 4, bug.y - 3);
  graphics.strokePath();
  
  // Eyes (angry!)
  graphics.lineStyle(0);
  graphics.fillStyle(0xff0000, 1);
  graphics.fillRect(bug.x + bug.size/2 - 3, bug.y + 3, 2, 2);
  graphics.fillRect(bug.x + bug.size/2 + 1, bug.y + 3, 2, 2);
  
  // Legs
  graphics.lineStyle(1, bug.color, 1);
  for (let i = 0; i < 3; i++) {
    const legY = bug.y + 8 + i * 3;
    graphics.beginPath();
    graphics.moveTo(bug.x + 2, legY);
    graphics.lineTo(bug.x - 2, legY + 3);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(bug.x + bug.size - 2, legY);
    graphics.lineTo(bug.x + bug.size + 2, legY + 3);
    graphics.strokePath();
  }
}

function endGame(scene) {
  gameOver = true;
  playTone(scene, 220, 0.5);
  
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.8);
  overlay.fillRect(0, 0, 800, 600);
  
  const gameOverText = scene.add.text(400, 250, 'DEBUG FAILED', {
    fontSize: '56px',
    fontFamily: 'monospace',
    color: '#ff0000',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5);
  
  scene.tweens.add({
    targets: gameOverText,
    scale: { from: 1, to: 1.05 },
    duration: 800,
    yoyo: true,
    repeat: -1
  });
  
  scene.add.text(400, 340, 'BUGS DEFEATED: ' + Math.floor(score / 10), {
    fontSize: '28px',
    fontFamily: 'monospace',
    color: '#00ffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5);
  
  scene.add.text(400, 380, 'FINAL SCORE: ' + score, {
    fontSize: '28px',
    fontFamily: 'monospace',
    color: '#00ff00',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5);
  
  const restartText = scene.add.text(400, 450, 'Press R to Restart', {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: '#ffff00'
  }).setOrigin(0.5);
  
  scene.tweens.add({
    targets: restartText,
    alpha: { from: 1, to: 0.3 },
    duration: 600,
    yoyo: true,
    repeat: -1
  });
  
  scene.input.keyboard.once('keydown-R', () => {
    scene.scene.restart();
    resetGame();
  });
}

function resetGame() {
  features = []; // Reset features
  bugs = []; // Reset bugs
  projectiles = [];
  score = 0;
  health = 100;
  spawnTimer = 0;
  spawnDelay = 2000;
  globalFeatureTimer = featureTimeout; // Reset global timer!
  gameOver = false;
  attackCooldown = 0;
  isAttacking = false;
  showingStartScreen = true;
  showingIntro = true;
  introStep = 0;
  introTimer = 0;
  introTexts = [];
  startScreenTexts = [];
  currentLevel = 0;
  levelScore = 0;
  clients = [];
  clientCallTimer = 0;
  clientsContainer = [];
  stopMusic();
}

function startMusic(scene) {
  if (musicPlaying) return;
  musicPlaying = true;
  
  const ctx = scene.sound.context;
  
  // More varied melody with different sections
  const melody = [
    // Section A - Upbeat intro
    523, 659, 784, 659, 523, 659, 784, 880,
    // Section B - Descending
    784, 659, 587, 523, 494, 440, 523, 587,
    // Section C - Dramatic rise
    392, 440, 494, 523, 587, 659, 698, 784,
    // Section D - Resolution
    880, 784, 659, 587, 523, 440, 392, 349,
    // Section E - Variation
    659, 523, 659, 784, 880, 784, 659, 523,
    // Section F - Bridge
    440, 494, 523, 587, 659, 587, 523, 494,
    // Section G - Climax
    784, 880, 988, 880, 784, 659, 523, 440,
    // Section H - Return home
    523, 494, 440, 392, 440, 494, 523, 587
  ];
  
  // Bass line for harmony (octave lower)
  const bass = [
    262, 262, 262, 262, 330, 330, 330, 330,
    262, 262, 262, 262, 294, 294, 294, 294,
    196, 196, 196, 196, 247, 247, 247, 247,
    294, 294, 294, 294, 262, 262, 262, 262,
    330, 330, 330, 330, 349, 349, 349, 349,
    220, 220, 220, 220, 247, 247, 247, 247,
    262, 262, 262, 262, 330, 330, 330, 330,
    262, 262, 262, 262, 294, 294, 294, 294
  ];
  
  let noteIndex = 0;
  const bpm = 140;
  const beatDuration = 60000 / bpm / 2;
  
  function playNote() {
    if (!musicPlaying) return;
    
    // Melody oscillator
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Add variation in waveform
    const waveTypes = ['square', 'triangle', 'sawtooth'];
    const section = Math.floor(noteIndex / 16) % 3;
    osc1.type = waveTypes[section];
    
    osc1.frequency.value = melody[noteIndex];
    gain1.gain.setValueAtTime(0.025, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    
    // Bass oscillator (plays every other note for rhythm)
    if (noteIndex % 2 === 0) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.type = 'triangle';
      osc2.frequency.value = bass[noteIndex];
      gain2.gain.setValueAtTime(0.015, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.2);
    }
    
    // Add percussion on certain beats
    if (noteIndex % 4 === 0) {
      const perc = ctx.createOscillator();
      const percGain = ctx.createGain();
      perc.connect(percGain);
      percGain.connect(ctx.destination);
      
      perc.type = 'square';
      perc.frequency.value = 80;
      percGain.gain.setValueAtTime(0.02, ctx.currentTime);
      percGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      perc.start(ctx.currentTime);
      perc.stop(ctx.currentTime + 0.05);
    }
    
    noteIndex = (noteIndex + 1) % melody.length;
  }
  
  playNote();
  musicInterval = setInterval(playNote, beatDuration);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function playTone(scene, frequency, duration) {
  const audioContext = scene.sound.context;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'square';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}
