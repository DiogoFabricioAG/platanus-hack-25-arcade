// Broke Bonez - carreras laterales con acrobacias
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#76c7ff',
  scene: { create, update }
};
const game = new Phaser.Game(config);

// Estados del juego
let gameState = 'menu'; // 'menu', 'competition', '1v1', 'gameOver', 'enterName', 'leaderboard', '1v1end', '1v1ready'
let gameMode = ''; // 'competition' o '1v1'

// Estado global
let g; // graphics
let txt; // HUD score
let speedTxt; // indicador de velocidad
let boredTimerTxt; // temporizador de aburrimiento
let dayTimeTxt; // indicador de fase del día
let curs;
let keyBoost;
let keyR;
let keyO; // Tecla de salto pequeño
// Teclas de acrobacias
let keyJ, keyK, keyL, keyU, keyI;
// Teclas de menú
let key1, key2, keyEnter;
let sceneRef; // referencia de escena para audio
let score = 0;
let gameOver = false;
let floatingTexts = []; // textos flotantes de puntos
let judgeScores = []; // calificaciones de jueces
let clouds = []; // nubes
let airParticles = []; // partículas de aire
let trickEffects = []; // efectos visuales de acrobacias

// Modo 1v1
let player1Score = 0;
let player2Score = 0;
let player1Lives = 3;
let player2Lives = 3;
let currentPlayer = 1; // 1 o 2
let turnJustStarted = false;
let previousPlayerScore = 0; // Puntuación del jugador anterior
let winner = 0; // Ganador del 1v1
let gameOverReason = ''; // Razón del game over

// Sistema de leaderboard - empieza vacío
let leaderboard = [];
let playerName = 'AAAAA'; // Nombre empieza en AAAAA
let nameChars = ['A', 'A', 'A', 'A', 'A']; // Array de caracteres individuales
let currentCharIndex = 0; // Qué letra estamos editando (0-4)
let nameInputActive = false;
// Teclas para navegación de nombre
let keyX, keyZ;

// Moto/entorno
const bike = { x: 200, y: 400, vy: 0, ang: 0, vang: 0, speed: 200, air: false, flipA: 0, flips: 0, boostT: 0, cooldown: 0, hasTakenOff: false, lastTrick: '', trickCooldown: 0 };
const phys = { g: 900, maxSpeed: 500, minSpeed: 100, accel: 120, airDrag: 0.995, rotAccel: 1.2, rotDamp: 0.92 };
const track = { base: 470, amp: 0, k: 0.006, scroll: 0 };

// Mecánica del viento
let windForce = 0; // Fuerza del viento (-1 a 1)
let windDirection = 1; // 1 = derecha, -1 = izquierda
let nextWindChange = 0; // Tiempo hasta próximo cambio de viento
let windActive = false; // Si el viento está activo
let gameTime = 0; // Tiempo total de juego en segundos

// Ciclo día/noche
let timeOfDay = 'day'; // 'day', 'afternoon', 'night'
let skyColor = 0x76c7ff; // Color del cielo (cambia con el tiempo)
let dayDuration = 45; // Segundos por fase (día, tarde, noche)

// Mecánica de aburrimiento de la afición
let lastScoreTime = 0; // Último momento en que se ganaron puntos
let crowdBoredLimit = 7; // Segundos sin ganar puntos para perder
let crowdBoredWarning = false; // Si se está mostrando advertencia

// Rampas
let ramps = [];
let nextRampWX = 600; // próxima rampa en coordenadas de mundo (x + scroll)
// Obstáculos
let drones = []; // Drones en el aire
let obstacles = []; // Obstáculos en el suelo (carros, plataformas)
let hoops = []; // Aros para pasar por el medio
let spikes = []; // Púas en el suelo
let nextDroneWX = 800;
let nextObstacleWX = 1200;
let nextHoopWX = 1500;
let nextSpikeWX = 1000; // Próxima púa
let lastTime = 0;
let scene; // referencia a la escena para crear textos
let bgMusic; // música de fondo

function create() {
  scene = this;
  g = this.add.graphics();
  // Referencia ligera a la escena sólo para audio; alternativa: pasar 'this' siempre.
  sceneRef = null; // evitamos guardar 'this' para cumplir regla; usaremos this directo en beep cuando sea necesario.
  curs = this.input.keyboard.createCursorKeys();
  keyBoost = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  
  // Teclas de acrobacias
  keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
  keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
  keyU = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
  keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  
  // Teclas de menú
  key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
  key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
  keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  
  // Teclas para navegación de nombre (J y K en vez de X y Z para arcade)
  keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
  keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
  
  // Tecla de salto pequeño
  keyO = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
  
  // Entrada de texto para nombre (ya no se usa keyboard.on)
  // this.input.keyboard.on('keydown', handleNameInput);
  
  // HUD mejorado - Panel de puntos
  this.add.rectangle(100, 22, 180, 40, 0x000000, 0.6);
  txt = this.add.text(100, 22, 'PUNTOS: 0', { 
    fontFamily: 'Arial Black', 
    fontSize: '26px', 
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 4
  });
  txt.setOrigin(0.5);
  txt.setVisible(false);
  
  // Velocímetro
  this.add.rectangle(700, 22, 160, 40, 0x000000, 0.6);
  speedTxt = this.add.text(700, 22, '200 km/h', { 
    fontFamily: 'Arial Black', 
    fontSize: '22px', 
    color: '#00FF00',
    stroke: '#000',
    strokeThickness: 3
  });
  speedTxt.setOrigin(0.5);
  speedTxt.setVisible(false);
  
  // Contador de aburrimiento (debajo de puntos)
  this.add.rectangle(100, 60, 180, 35, 0x000000, 0.6);
  boredTimerTxt = this.add.text(100, 60, 'Tiempo: 7s', { 
    fontFamily: 'Arial', 
    fontSize: '18px', 
    color: '#00FF00',
    stroke: '#000',
    strokeThickness: 3
  });
  boredTimerTxt.setOrigin(0.5);
  boredTimerTxt.setVisible(false);
  
  // Indicador de fase del día (debajo de velocidad)
  this.add.rectangle(700, 60, 160, 35, 0x000000, 0.6);
  dayTimeTxt = this.add.text(700, 60, 'Día', { 
    fontFamily: 'Arial', 
    fontSize: '18px', 
    color: '#FFDD44',
    stroke: '#000',
    strokeThickness: 3
  });
  dayTimeTxt.setOrigin(0.5);
  dayTimeTxt.setVisible(false);
  
  // Instrucciones (ocultas inicialmente)
  const instTxt1 = this.add.text(400, 16, '←/→ inclinar | ESPACIO turbo | R reiniciar', { fontFamily: 'monospace', fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
  const instTxt2 = this.add.text(400, 36, 'ACROBACIAS: J+K, K+L, J+L, U+I, J+U (en el aire)', { fontFamily: 'monospace', fontSize: '12px', color: '#ffff00', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
  instTxt1.setVisible(false);
  instTxt2.setVisible(false);
  
  // Inicializar nubes y partículas
  initClouds();
  initAirParticles();
  
  // Iniciar música de fondo
  startBackgroundMusic(this);
}

function update(t, dt) {
  if (dt > 100) dt = 16; // cap por si la pestaña se congela
  
  const s = dt / 1000;
  
  // Manejo según estado del juego
  if (gameState === 'menu') {
    handleMenuInput();
    drawMenu();
    return;
  }
  
  if (gameState === 'enterName') {
    handleNameInput();
    drawEnterName();
    return;
  }
  
  if (gameState === 'leaderboard') {
    handleLeaderboardInput();
    drawLeaderboard();
    return;
  }
  
  if (gameState === '1v1ready') {
    handle1v1ReadyInput();
    draw1v1Ready();
    return;
  }
  
  if (gameState === '1v1end') {
    handle1v1EndInput();
    draw1v1End();
    return;
  }
  
  // Juego activo
  handleRestart(this);
  if (gameOver) { 
    handleGameOver();
    draw(); 
    return; 
  }
  
  inputTilt(s);
  handleTricks.call(this, s);
  handleJump(s); // Salto pequeño con O
  applyBoost.call(this, s);
  physicsStep(s);
  updatePigeons();
  updateObstacles();
  updateHoops();
  updateSpikes(); // Actualizar púas
  checkCollisions.call(this);
  scoringStep.call(this, s);
  updateFloatingTexts(s);
  updateJudgeScores(s);
  updateClouds(s);
  updateAirParticles(s);
  updateTrickEffects(s);
  updateHUD();
  updateWind(s);
  updateDayNightCycle(s);
  checkCrowdBored.call(this, s);
  draw();
}

// ===== FUNCIONES DE MENÚ =====
function handleMenuInput() {
  if (Phaser.Input.Keyboard.JustDown(key1)) {
    startCompetitionMode();
  } else if (Phaser.Input.Keyboard.JustDown(key2)) {
    start1v1Mode();
  }
}

function startCompetitionMode() {
  gameState = 'competition';
  gameMode = 'competition';
  // Detener música anterior
  stopBackgroundMusic();
  // Selección aleatoria con 25% de probabilidad para cada una
  const rand = Math.random();
  if (rand < 0.25) selectedMelody = 0;
  else if (rand < 0.5) selectedMelody = 1;
  else if (rand < 0.75) selectedMelody = 2;
  else selectedMelody = 3;
  resetGameState();
  // Iniciar nueva música con la melodía seleccionada
  startBackgroundMusic(scene);
  txt.setVisible(true);
  speedTxt.setVisible(true);
  boredTimerTxt.setVisible(true);
  dayTimeTxt.setVisible(true);
}

function start1v1Mode() {
  gameState = '1v1';
  gameMode = '1v1';
  // Detener música anterior
  stopBackgroundMusic();
  // Selección aleatoria con 25% de probabilidad para cada una
  const rand = Math.random();
  if (rand < 0.25) selectedMelody = 0;
  else if (rand < 0.5) selectedMelody = 1;
  else if (rand < 0.75) selectedMelody = 2;
  else selectedMelody = 3;
  player1Score = 0;
  player2Score = 0;
  player1Lives = 3;
  player2Lives = 3;
  currentPlayer = 1;
  turnJustStarted = true;
  resetGameState();
  // Iniciar nueva música con la melodía seleccionada
  startBackgroundMusic(scene);
  txt.setVisible(true);
  speedTxt.setVisible(true);
  boredTimerTxt.setVisible(true);
  dayTimeTxt.setVisible(true);
}

function resetGameState() {
  score = 0;
  gameOver = false;
  bike.x = 200;
  bike.y = 400;
  bike.vy = 0;
  bike.ang = 0;
  bike.vang = 0;
  bike.speed = 200;
  bike.air = false;
  bike.flipA = 0;
  bike.flips = 0;
  bike.boostT = 0;
  bike.cooldown = 0;
  bike.hasTakenOff = false;
  bike.lastTrick = '';
  bike.trickCooldown = 0;
  bike.jumpCooldown = 0; // Cooldown para salto pequeño
  track.scroll = 0;
  ramps = [];
  nextRampWX = 600;
  drones = [];
  obstacles = [];
  hoops = [];
  spikes = []; // Resetear púas
  nextDroneWX = 800;
  nextObstacleWX = 1200;
  nextHoopWX = 1500;
  nextSpikeWX = 1000; // Resetear posición de próxima púa
  floatingTexts = [];
  judgeScores = [];
  trickEffects = [];
  txt.setText('PUNTOS: 0');
  
  // Resetear mecánica del viento
  windForce = 0;
  windDirection = 1;
  nextWindChange = 5 + Math.random() * 5; // Primer viento en 5-10 seg
  windActive = false;
  
  // Resetear ciclo día/noche
  gameTime = 0;
  timeOfDay = 'day';
  skyColor = 0x76c7ff;
  if (scene && scene.cameras && scene.cameras.main) {
    scene.cameras.main.setBackgroundColor(skyColor);
  }
  
  // Resetear mecánica de aburrimiento
  lastScoreTime = 0;
  crowdBoredWarning = false;
}

function resetBikePosition() {
  bike.x = 200;
  bike.y = 400;
  bike.vy = 0;
  bike.ang = 0;
  bike.vang = 0;
  bike.speed = 200;
  bike.air = false;
  bike.flipA = 0;
  bike.flips = 0;
  bike.boostT = 0;
  bike.hasTakenOff = false;
  track.scroll = 0;
  ramps = [];
  nextRampWX = 600;
  drones = [];
  obstacles = [];
  hoops = [];
  nextDroneWX = 800;
  nextObstacleWX = 1200;
  nextHoopWX = 1500;
}

function handleGameOver() {
  if (gameMode === 'competition') {
    // Modo competición: ir a pantalla de ingresar nombre
    gameState = 'enterName';
    playerName = 'AAAAA';
    nameChars = ['A', 'A', 'A', 'A', 'A'];
    currentCharIndex = 0;
    nameInputActive = true;
  } else if (gameMode === '1v1') {
    // Modo 1v1: quitar vida y cambiar turno
    if (currentPlayer === 1) {
      player1Lives--;
      player1Score += score;
    } else {
      player2Lives--;
      player2Score += score;
    }
    
    // Verificar si alguien perdió todas las vidas
    if (player1Lives <= 0 || player2Lives <= 0) {
      gameState = '1v1end';
    } else {
      // Cambiar de jugador - ir a pantalla de espera
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      gameState = '1v1ready';
    }
  }
}

function handleNameInput() {
  if (!nameInputActive) return;
  
  // J: avanzar letra (A->B->C...->Z->A)
  if (Phaser.Input.Keyboard.JustDown(keyX)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789';
    const currentChar = nameChars[currentCharIndex];
    const currentIndex = alphabet.indexOf(currentChar);
    const nextIndex = (currentIndex + 1) % alphabet.length;
    nameChars[currentCharIndex] = alphabet[nextIndex];
    playerName = nameChars.join('');
    beep(scene, 800, 0.05);
  }
  
  // K: retroceder letra (Z->Y->X...->A->Z)
  if (Phaser.Input.Keyboard.JustDown(keyZ)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789';
    const currentChar = nameChars[currentCharIndex];
    const currentIndex = alphabet.indexOf(currentChar);
    const prevIndex = (currentIndex - 1 + alphabet.length) % alphabet.length;
    nameChars[currentCharIndex] = alphabet[prevIndex];
    playerName = nameChars.join('');
    beep(scene, 600, 0.05);
  }
  
  // Flechas izq/der: cambiar posición del cursor
  if (Phaser.Input.Keyboard.JustDown(curs.left)) {
    currentCharIndex = (currentCharIndex - 1 + 5) % 5;
    beep(scene, 1000, 0.05);
  }
  if (Phaser.Input.Keyboard.JustDown(curs.right)) {
    currentCharIndex = (currentCharIndex + 1) % 5;
    beep(scene, 1000, 0.05);
  }
  
  // Enter: confirmar nombre
  if (Phaser.Input.Keyboard.JustDown(keyEnter)) {
    addToLeaderboard(playerName, score);
    nameInputActive = false;
    gameState = 'leaderboard';
    beep(scene, 1200, 0.2);
  }
}

function addToLeaderboard(name, points) {
  leaderboard.push({ name: name, score: points });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10); // mantener top 10
}

function handleLeaderboardInput() {
  if (Phaser.Input.Keyboard.JustDown(keyEnter)) {
    stopBackgroundMusic(); // Detener música al volver al menú
    gameState = 'menu';
    txt.setVisible(false);
    speedTxt.setVisible(false);
  }
}

function handle1v1ReadyInput() {
  if (Phaser.Input.Keyboard.JustDown(keyEnter)) {
    // Iniciar turno del siguiente jugador
    turnJustStarted = true;
    resetGameState();
    gameOver = false;
    gameState = '1v1';
    txt.setVisible(true);
    speedTxt.setVisible(true);
    boredTimerTxt.setVisible(true);
    dayTimeTxt.setVisible(true);
  }
}

function handle1v1EndInput() {
  if (Phaser.Input.Keyboard.JustDown(keyEnter)) {
    stopBackgroundMusic(); // Detener música al volver al menú
    gameState = 'menu';
    txt.setVisible(false);
    speedTxt.setVisible(false);
  }
}

  // Entrada: inclinación y control suave
function inputTilt(s) {
  const tilt = (curs.right.isDown ? 1 : 0) - (curs.left.isDown ? 1 : 0);
  if (bike.air) {
    // en aire: inclinar para acrobacias - dificultad aumenta con distancia recorrida
    const difficultyFactor = 1 + Math.min(track.scroll / 10000, 1.5); // aumenta hasta 2.5x
    const adjustedRotAccel = phys.rotAccel * difficultyFactor;
    const adjustedRotDamp = Math.max(0.85, phys.rotDamp - (track.scroll / 50000)); // más difícil frenar
    bike.vang += tilt * adjustedRotAccel * s * 60;
    bike.vang *= adjustedRotDamp;
  } else {
    // en suelo: mover a los lados y un poquito de wheelie
    const move = 220 * s * tilt;
    bike.x = Math.max(80, Math.min(720, bike.x + move));
    bike.ang += tilt * 0.01 * 60 * s;
    bike.vang *= phys.rotDamp;
  }
  }

function applyBoost(s) {
    if (bike.cooldown > 0) { bike.cooldown -= s; }
    if (bike.boostT > 0) { bike.boostT -= s; }
    if (keyBoost.isDown) {
      // aceleración continua mientras se mantiene presionado
      bike.speed = Math.min(phys.maxSpeed, bike.speed + phys.accel * s);
      bike.boostT = 0.1; // mantener efecto visual
    } else {
      // desacelerar cuando no acelera
      bike.speed = Math.max(phys.minSpeed, bike.speed - 30 * s);
    }
  }

function physicsStep(s) {
    // Avance del mundo (scroll mueve la pista)
    const speed = bike.speed;
    track.scroll += speed * s;
  updateRamps();

    // Gravedad y movimiento vertical
  const groundY = groundAt(bike.x);
  const slopeA = slopeAngleAt(bike.x);
  const wx = bike.x + track.scroll;
  const r = rampAt(wx);
  const u = r ? rampU(wx, r) : null;

    // ¿estaba en aire?
    if (bike.air) {
      bike.vy += phys.g * s;
      bike.y += bike.vy * s;
      bike.ang += bike.vang * s;
      bike.vang *= phys.airDrag;
      
      // Mecánica del viento - empuja al corredor en el aire
      if (windActive && windForce !== 0) {
        // El viento empuja horizontalmente (afecta la rotación)
        const windEffect = windForce * windDirection * 0.8; // Intensidad del viento
        bike.vang += windEffect * s;
        
        // También puede empujar ligeramente en vertical (turbulencia)
        if (Math.abs(windForce) > 0.5) {
          bike.vy += windEffect * 30 * s;
        }
      }

      // Aterrizaje
      if (bike.y >= groundY) {
        land(slopeA);
        bike.y = groundY;
        bike.vy = 0;
      }
    } else {
    // En suelo: o seguimos pegados o despegamos al final de la rampa
    const atRampLip = !!r && u >= 0.85 && !bike.hasTakenOff; // cerca del final de la rampa
    if (atRampLip) {
      // Calculamos velocidad de salida basada en la pendiente y la velocidad
      const launchAng = slopeAngleAt(bike.x); // ángulo de la rampa en la punta
      // Impulso vertical: combina ángulo con velocidad, más un mínimo base
      const vy = -Math.abs(Math.sin(launchAng)) * speed * 2.5 - 100;
      takeOff(vy);
      bike.y = groundY - 2; // separa para evitar re-colisión inmediata
      bike.hasTakenOff = true;
    } else {
      // Seguir el suelo y su pendiente
      bike.y = groundY;
      const diff = normalizeAngle(slopeA - bike.ang);
      bike.ang += diff * 0.15;
    }
  }    // Limitar ángulo para no descontrolar
    bike.ang = wrapAngle(bike.ang);
  }

// Actualizar HUD
function updateHUD() {
  if (!txt || !speedTxt || !boredTimerTxt || !dayTimeTxt) return;
  
  // Actualizar velocidad con color dinámico
  const kmh = Math.floor(bike.speed);
  let color = '#00FF00'; // Verde (velocidad baja-media)
  let fontSize = '22px';
  let stroke = '#000';
  
  if (kmh > 250) color = '#FFFF00'; // Amarillo (media)
  if (kmh > 350) {
    color = '#FFAA00'; // Naranja (rápido)
    fontSize = '24px'; // Más grande cuando va rápido
    stroke = '#FF0000'; // Borde rojo
  }
  if (kmh > 450) {
    color = '#FF0000'; // Rojo (muy rápido)
    fontSize = '26px'; // Aún más grande
    // Efecto pulsante cuando está al máximo
    const pulse = Math.sin(Date.now() / 100) * 0.2 + 1;
    fontSize = Math.floor(26 * pulse) + 'px';
  }
  
  speedTxt.setText(kmh + ' km/h');
  speedTxt.setColor(color);
  speedTxt.setFontSize(fontSize);
  speedTxt.setStroke(stroke, 3);
  
  // Actualizar contador de aburrimiento
  const timeSinceLastScore = gameTime - lastScoreTime;
  const timeRemaining = Math.max(0, crowdBoredLimit - timeSinceLastScore);
  let boredColor = '#00FF00'; // Verde (seguro)
  
  if (timeRemaining <= 3) boredColor = '#FF0000'; // Rojo (crítico)
  else if (timeRemaining <= 5) boredColor = '#FFAA00'; // Naranja (advertencia)
  
  boredTimerTxt.setText('Tiempo: ' + Math.ceil(timeRemaining) + 's');
  boredTimerTxt.setColor(boredColor);
  
  // Actualizar indicador de fase del día
  let dayPhase = '';
  let dayColor = '#FFDD44';
  const timeInPhase = gameTime % dayDuration;
  const timeToNextPhase = Math.ceil(dayDuration - timeInPhase);
  
  if (timeOfDay === 'day') {
    dayPhase = 'Día → Tarde: ' + timeToNextPhase + 's';
    dayColor = '#FFDD44'; // Amarillo
  } else if (timeOfDay === 'afternoon') {
    dayPhase = 'Tarde → Noche: ' + timeToNextPhase + 's';
    dayColor = '#FF9966'; // Naranja
  } else {
    dayPhase = 'Noche: ' + Math.floor(gameTime) + 's';
    dayColor = '#9999FF'; // Azul claro
  }
  
  dayTimeTxt.setText(dayPhase);
  dayTimeTxt.setColor(dayColor);
}

function scoringStep(s) {
    const previousScore = score;
    
    // Aire = puntos por tiempo en el aire
    if (bike.air) {
      score += Math.floor(10 * s);
      // Flips completos (360°)
      bike.flipA += bike.vang * s;
      const full = Math.floor(Math.abs(bike.flipA) / (Math.PI * 2));
      if (full > bike.flips) {
        bike.flips = full;
        const pts = 50; // Cambio: 360° = 50 puntos (antes era 150)
        score += pts;
        showFloatingText('+' + pts, bike.x, bike.y - 40);
        txt.setText('PUNTOS: ' + score);
        beep(this, 880, 0.08);
      }
    }
    
    // Actualizar tiempo si se ganaron puntos
    if (score > previousScore) {
      lastScoreTime = gameTime;
    }
    
    txt.setText('PUNTOS: ' + score);
  }

// Sistema de acrobacias especiales
function handleTricks(s) {
  // Reducir cooldown
  if (bike.trickCooldown > 0) bike.trickCooldown -= s;
  
  // Solo en el aire y con cooldown disponible
  if (!bike.air || bike.trickCooldown > 0) return;
  
  let trickName = '';
  let trickPoints = 0;
  let trickColor = 0xffffff;
  let trickPose = '';
  let trickAction = null; // Acción especial del truco
  
  // Verificar que las teclas estén presionadas (simplificado para detección)
  const jDown = keyJ.isDown;
  const kDown = keyK.isDown;
  const lDown = keyL.isDown;
  const uDown = keyU.isDown;
  const iDown = keyI.isDown;
  
  // Combo 1: K+J = "Dash Left" (teletransporte a izquierda)
  if (jDown && kDown && !lDown && !uDown && !iDown) {
    trickName = 'DASH LEFT!';
    trickPoints = 250;
    trickColor = 0xff0000;
    trickPose = 'dashleft';
    trickAction = 'dashleft';
    bike.trickCooldown = 1.5;
  }
  // Combo 2: K+L = "Dash Right" (teletransporte a derecha)
  else if (!jDown && kDown && lDown && !uDown && !iDown) {
    trickName = 'DASH RIGHT!';
    trickPoints = 200;
    trickColor = 0x00ff00;
    trickPose = 'dashright';
    trickAction = 'dashright';
    bike.trickCooldown = 1.5;
  }
  // Combo 3: J+L = "Ground Slam" (bajar rápidamente)
  else if (jDown && !kDown && lDown && !uDown && !iDown) {
    trickName = 'GROUND SLAM!';
    trickPoints = 220;
    trickColor = 0x00ffff;
    trickPose = 'groundslam';
    trickAction = 'groundslam';
    bike.trickCooldown = 1.5;
  }
  // Combo 4: K+I = "Sky Jump" (salto hacia arriba)
  else if (!jDown && kDown && !lDown && !uDown && iDown) {
    trickName = 'SKY JUMP!';
    trickPoints = 300;
    trickColor = 0xff00ff;
    trickPose = 'skyjump';
    trickAction = 'skyjump';
    bike.trickCooldown = 1.5;
  }
  
  if (trickName) {
    score += trickPoints;
    lastScoreTime = gameTime; // Actualizar tiempo de último punto
    bike.lastTrick = trickPose; // guardar pose para visualización
    
    // Ejecutar acción especial del truco
    if (trickAction === 'dashright') {
      // Mover a la derecha
      track.scroll += 80; // Avanza 80 píxeles
      showFloatingText('+' + trickPoints + ' ' + trickName + ' >>>', bike.x, bike.y - 60);
    } else if (trickAction === 'dashleft') {
      // Mover a la izquierda (retrocede)
      track.scroll = Math.max(0, track.scroll - 60); // Retrocede 60 píxeles (sin ir a negativo)
      showFloatingText('<<< ' + trickName + ' +' + trickPoints, bike.x, bike.y - 60);
    } else if (trickAction === 'groundslam') {
      // Bajar rápidamente
      bike.vy += 400; // Aumenta velocidad hacia abajo
      showFloatingText('+' + trickPoints + ' ' + trickName + ' ↓↓↓', bike.x, bike.y - 60);
    } else if (trickAction === 'skyjump') {
      // Salto hacia arriba
      bike.vy = -600; // Impulso fuerte hacia arriba
      bike.air = true; // Asegurar que está en el aire
      showFloatingText('+' + trickPoints + ' ' + trickName + ' ↑↑↑', bike.x, bike.y - 60);
    } else {
      showFloatingText('+' + trickPoints + ' ' + trickName, bike.x, bike.y - 60);
    }
    
    addTrickEffect(trickName, trickColor, trickPose);
    beep(this, 1200, 0.15);
    txt.setText('PUNTOS: ' + score);
  }
}

function addTrickEffect(name, color, pose) {
  trickEffects.push({
    name: name,
    pose: pose,
    x: bike.x,
    y: bike.y,
    color: color,
    life: 1.5,
    scale: 0
  });
}

function handleJump(s) {
  // Reducir cooldown
  if (bike.jumpCooldown > 0) {
    bike.jumpCooldown -= s;
  }
  
  // Detectar presión de la tecla O (debe estar presionada, no usar JustDown porque puede perderse)
  if (keyO && keyO.isDown && bike.jumpCooldown <= 0) {
    // Solo saltar si está en el suelo o muy cerca
    if (!bike.air || bike.y >= track.base - 5) {
      bike.vy = -450; // Impulso vertical fuerte y visible
      bike.air = true; // Asegurar que está en el aire
      bike.jumpCooldown = 10; // Cooldown de 10 segundos para evitar abuso
      beep(null, 900, 0.2); // Sonido de salto bien audible
      showFloatingText('JUMP!', bike.x, bike.y - 40); // Feedback visual
    }
  }
}

function updateTrickEffects(s) {
  for (let i = trickEffects.length - 1; i >= 0; i--) {
    const e = trickEffects[i];
    e.life -= s;
    e.scale += s * 2;
    e.y -= 30 * s;
    if (e.life <= 0) {
      trickEffects.splice(i, 1);
    }
  }
}

// Mecánica del viento
function updateWind(s) {
  gameTime += s;
  nextWindChange -= s;
  
  // Cambio de viento periódico
  if (nextWindChange <= 0) {
    // Decidir si habrá viento o no
    const willHaveWind = Math.random() < 0.4; // 40% de probabilidad
    
    if (willHaveWind) {
      windActive = true;
      windDirection = Math.random() < 0.5 ? 1 : -1; // Aleatorio izq/der
      windForce = 0.3 + Math.random() * 0.7; // Fuerza: 0.3 a 1.0
      nextWindChange = 3 + Math.random() * 4; // Duración: 3-7 segundos
    } else {
      windActive = false;
      windForce = 0;
      nextWindChange = 5 + Math.random() * 10; // Sin viento: 5-15 segundos
    }
  }
}

// Ciclo día/noche
function updateDayNightCycle(s) {
  // Cambiar fase según tiempo transcurrido
  if (gameTime < dayDuration) {
    // Día (0-45 segundos)
    timeOfDay = 'day';
    skyColor = 0x76c7ff; // Azul cielo brillante
  } else if (gameTime < dayDuration * 2) {
    // Tarde (45-90 segundos)
    timeOfDay = 'afternoon';
    // Transición gradual de azul cielo a naranja atardecer
    const progress = (gameTime - dayDuration) / dayDuration;
    skyColor = lerpColor(0x76c7ff, 0xff8844, progress);
  } else {
    // Noche (90+ segundos)
    timeOfDay = 'night';
    // Transición gradual de naranja a azul oscuro nocturno
    const progress = Math.min(1, (gameTime - dayDuration * 2) / dayDuration);
    skyColor = lerpColor(0xff8844, 0x1a1a3a, progress);
  }
  
  // Actualizar color de fondo del juego (usa scene en lugar de sceneRef)
  if (scene && scene.cameras && scene.cameras.main) {
    scene.cameras.main.setBackgroundColor(skyColor);
  }
}

// Función auxiliar para interpolar colores
function lerpColor(color1, color2, t) {
  const r1 = (color1 >> 16) & 0xFF;
  const g1 = (color1 >> 8) & 0xFF;
  const b1 = color1 & 0xFF;
  
  const r2 = (color2 >> 16) & 0xFF;
  const g2 = (color2 >> 8) & 0xFF;
  const b2 = color2 & 0xFF;
  
  const r = Math.floor(r1 + (r2 - r1) * t);
  const g = Math.floor(g1 + (g2 - g1) * t);
  const b = Math.floor(b1 + (b2 - b1) * t);
  
  return (r << 16) | (g << 8) | b;
}

// Verificar si la afición se aburre (sin puntos por 7 segundos)
function checkCrowdBored(s) {
  const timeSinceLastScore = gameTime - lastScoreTime;
  
  // Mostrar advertencia a los 5 segundos
  if (timeSinceLastScore >= 5 && timeSinceLastScore < crowdBoredLimit) {
    crowdBoredWarning = true;
  } else {
    crowdBoredWarning = false;
  }
  
  // Perder si no gana puntos en 7 segundos
  if (timeSinceLastScore >= crowdBoredLimit) {
    gameOver = true;
    gameOverReason = '¡La afición se aburrió!';
    beep(this, 150, 0.5); // Sonido de abucheo
  }
}

function takeOff(forceVy) {
    bike.air = true;
    bike.vy = forceVy;
  }

function land(slopeA) {
    // chequeo de ángulo seguro
    const diff = Math.abs(normalizeAngle(bike.ang - slopeA));
    if (diff > 0.9) {
      // caída fea => game over
      gameOver = true;
    } else if (bike.flips > 0) {
      // buen aterrizaje: bonus por aterrizaje = 50 puntos
      const pts = 50; // Cambio: aterrizaje = 50 puntos (antes era flips * 200)
      score += pts;
      lastScoreTime = gameTime; // Actualizar tiempo de último punto
      showFloatingText('+' + pts + ' LANDING', bike.x, bike.y - 40);
      showJudgeScores(bike.flips);
      playJudgeSound(this); // Sonido corto "tuuun" para los jueces
      playApplause(this);
      beep(this, 980, 0.12);
    }
    
    // Verificar si aterrizó en zona de aterrizaje (TODAS las rampas tienen zona ahora)
    const wx = bike.x + track.scroll;
    for (let r of ramps) {
      if (r.landingZone && !r.landingZone.collected) {
        const lzX = r.landingZone.x;
        const lzW = r.landingZone.w;
        // Verificar si la posición del bike está dentro de la zona
        if (wx >= lzX && wx <= lzX + lzW) {
          const bonus = 200; // Cambio: zona de aterrizaje = 200 puntos (antes 500)
          score += bonus;
          lastScoreTime = gameTime; // Actualizar tiempo de último punto
          showFloatingText('+' + bonus + ' ZONE!', bike.x, bike.y - 60);
          r.landingZone.collected = true; // Marcar como cobrado
          beep(this, 1200, 0.15); // Sonido especial para landing bonus
          break; // Solo un bonus por aterrizaje
        }
      }
    }
    
    bike.air = false;
    bike.flipA = 0;
    bike.flips = 0;
    // Suavizar orientación hacia la pendiente
    bike.ang = slopeA;
    bike.vang = 0;
    bike.hasTakenOff = false; // reset para próxima rampa
  }

  // Terreno procedural (pantalla plana que se mueve)
function groundAt(screenX) {
  const x = screenX + track.scroll;
  let y = track.base; // piso plano estilo rally
  // aporte de rampas (solo subida, sin bajada)
  for (let r of ramps) {
    const u = rampU(x, r);
    if (u >= 0 && u <= 1) {
      const height = u * r.h; // solo sube linealmente
      y -= height;
    }
  }
  return y;
}
function slopeAngleAt(screenX) {
  const x = screenX + track.scroll;
  // derivada sólo por rampa (base plana)
  let dy = 0;
  // rampa ascendente: solo pendiente de subida
  for (let r of ramps) {
    const u = rampU(x, r);
    if (u >= 0 && u <= 1) {
      const m = r.h / r.w; // pendiente constante
      dy -= m; // solo sube
    }
  }
  return Math.atan(dy);
}

// Gestión de rampas
function rampU(xWorld, r) { return (xWorld - r.x) / r.w; }
function rampAt(xWorld) {
  for (let r of ramps) { const u = rampU(xWorld, r); if (u >= 0 && u <= 1) return r; }
  return null;
}
function updateRamps() {
  // spawn si la derecha de la pantalla alcanza la próxima posición
  const rightWX = track.scroll + 800;
  if (rightWX > nextRampWX) {
    const w = 140 + Math.random() * 140;
    const h = 60 + Math.random() * 80;
    
    // TODAS las rampas tienen zona de aterrizaje (100%)
    const hasLandingZone = true; // Cambio: antes era Math.random() < 0.3
    let landingZone = null;
    
    if (hasLandingZone) {
      // Crear zona de aterrizaje después de la rampa
      const landingX = nextRampWX + w + 150 + Math.random() * 100; // 150-250 px después
      const landingW = 60 + Math.random() * 40; // Ancho: 60-100 px
      landingZone = {
        x: landingX,
        w: landingW,
        collected: false // Si ya cobró el bonus
      };
    }
    
    ramps.push({ 
      x: nextRampWX, 
      w, 
      h,
      landingZone: landingZone // null o objeto con zona de aterrizaje
    });
    nextRampWX += 700 + Math.random() * 900;
  }
  // limpiar rampas muy atrás
  const leftWX = track.scroll - 200;
  ramps = ramps.filter(r => r.x + r.w > leftWX);
}

// Generar drones (obstáculos aéreos)
function updatePigeons() {
  const rightWX = track.scroll + 800;
  if (rightWX > nextDroneWX) {
    // Drones solo en la mitad superior de la pantalla (50-250 px)
    const y = 50 + Math.random() * 200;
    const speed = 30 + Math.random() * 40; // Velocidad de rotación de hélices
    drones.push({ 
      x: nextDroneWX, 
      y: y,
      propPhase: Math.random() * Math.PI * 2,
      speed: speed
    });
    
    // Frecuencia basada en el score - empiezan raros, luego más frecuentes
    let spacing = 1800; // Muy espaciados al inicio
    if (score > 500) spacing = 1400;
    if (score > 1000) spacing = 1100;
    if (score > 2000) spacing = 900;
    if (score > 3500) spacing = 700;
    if (score > 5000) spacing = 500; // Muy frecuentes cuando tienes mucho score
    
    nextDroneWX += spacing + Math.random() * 400;
  }
  // Actualizar animación de hélices
  for (let d of drones) {
    d.propPhase += 0.2;
  }
  // Limpiar drones muy atrás
  const leftWX = track.scroll - 200;
  drones = drones.filter(d => d.x > leftWX);
}

// Generar obstáculos en el suelo (carros/plataformas)
// Generar obstáculos en el suelo (carros/plataformas)
function updateObstacles() {
  const rightWX = track.scroll + 800;
  if (rightWX > nextObstacleWX) {
    
    // Probabilidad progresiva basada en el score
    let spawnChance = 0.15; // 15% al inicio (muy raro)
    if (score > 500) spawnChance = 0.25;  // 25%
    if (score > 1000) spawnChance = 0.35; // 35%
    if (score > 2000) spawnChance = 0.45; // 45%
    if (score > 3500) spawnChance = 0.55; // 55%
    if (score > 5000) spawnChance = 0.7;  // 70% (muy frecuente)
    
    if (Math.random() < spawnChance) {
      // Buscar rampa cercana para colocar obstáculo estratégicamente
      const nearbyRamp = ramps.find(r => Math.abs(r.x - nextObstacleWX) < 300);
      
      if (nearbyRamp) {
        // Colocar carro justo después de la rampa (gap corto)
        const gap = 30 + Math.random() * 40; // Gap corto: 30-70 px
        const obstacleX = nearbyRamp.x + nearbyRamp.w + gap;
        
        // Altura variable del carro (más alto = más difícil)
        let carHeight = 35 + Math.random() * 20; // 35-55 px
        if (score > 2000) carHeight = 40 + Math.random() * 25; // Más altos con más score
        
        obstacles.push({ 
          x: obstacleX, 
          w: 100 + Math.random() * 60, // Ancho: 100-160 px (MÁS LARGOS)
          h: carHeight,
          type: 'car' // Solo carros (más interesantes visualmente)
        });
      } else {
        // Si no hay rampa cerca, colocar obstáculo solo (menos común)
        if (Math.random() < 0.3) { // 30% de chance sin rampa
          obstacles.push({ 
            x: nextObstacleWX, 
            w: 100 + Math.random() * 50, // También más largos: 100-150 px
            h: 40 + Math.random() * 20,
            type: Math.random() > 0.3 ? 'car' : 'platform'
          });
        }
      }
    }
    
    // Espaciado dinámico - más frecuentes con mayor score
    let spacing = 1000;
    if (score > 1000) spacing = 850;
    if (score > 2500) spacing = 700;
    if (score > 5000) spacing = 550;
    
    nextObstacleWX += spacing + Math.random() * 400;
  }
  // Limpiar obstáculos muy atrás
  const leftWX = track.scroll - 200;
  obstacles = obstacles.filter(o => o.x + o.w > leftWX);
}

// Generar aros (bonus de puntos)
function updateHoops() {
  const rightWX = track.scroll + 800;
  if (rightWX > nextHoopWX) {
    // Probabilidad de aparecer basada en score
    let spawnChance = 0.2; // 20% al inicio
    if (score > 1000) spawnChance = 0.3;
    if (score > 2500) spawnChance = 0.4;
    if (score > 5000) spawnChance = 0.5;
    
    if (Math.random() < spawnChance) {
      // Altura del aro (debe ser suficiente para pasar la moto)
      const hoopY = 200 + Math.random() * 150; // Entre 200-350 px de altura
      
      // Aros especiales pequeños con más puntos (después de score 7000)
      const isSpecialHoop = score >= 7000 && Math.random() < 0.25; // 25% de chance
      const hoopRadius = isSpecialHoop ? 35 : 80; // Especial: 35px, Normal: 80px (MÁS GRANDE)
      const hoopPoints = isSpecialHoop ? 1000 : 500; // Especial: 1000pts, Normal: 500pts
      
      const poleHeight = track.base - hoopY; // Altura del poste
      
      hoops.push({
        x: nextHoopWX,
        y: hoopY,
        radius: hoopRadius,
        poleHeight: poleHeight,
        passed: false, // Si ya pasó por el aro
        collected: false, // Si ya cobró el bonus
        points: hoopPoints,
        isSpecial: isSpecialHoop
      });
    }
    
    // Espaciado: aros especiales pueden aparecer más lejos
    const baseSpacing = 1200 + Math.random() * 800; // 1200-2000
    const extraSpacing = (score >= 7000 && Math.random() < 0.3) ? 1000 + Math.random() * 1500 : 0; // A veces muy lejos
    nextHoopWX += baseSpacing + extraSpacing;
  }
  
  // Limpiar aros muy atrás
  const leftWX = track.scroll - 200;
  hoops = hoops.filter(h => h.x > leftWX);
}

function updateSpikes() {
  const rightWX = track.scroll + 800;
  if (rightWX > nextSpikeWX) {
    // Probabilidad de aparición basada en score
    let spawnChance = 0.3; // 30% al inicio
    if (score > 1000) spawnChance = 0.4;
    if (score > 3000) spawnChance = 0.5;
    if (score > 5000) spawnChance = 0.6;
    
    if (Math.random() < spawnChance) {
      const spikeWidth = 20 + Math.random() * 15; // 20-35 px ancho
      spikes.push({
        x: nextSpikeWX,
        w: spikeWidth,
        collected: false
      });
    }
    
    // Espaciado entre púas
    const baseSpacing = 400 + Math.random() * 600; // 400-1000
    nextSpikeWX += baseSpacing;
  }
  
  // Limpiar púas muy atrás
  const leftWX = track.scroll - 200;
  spikes = spikes.filter(sp => sp.x > leftWX);
}

function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function normalizeAngle(a) { a = wrapAngle(a); return a; }

// Detección de colisiones con obstáculos
function checkCollisions() {
  const bikeWX = bike.x + track.scroll;
  const bikeRadius = 15; // Radio de colisión de la moto
  
  // Colisión con drones (en el aire)
  for (let i = drones.length - 1; i >= 0; i--) {
    const d = drones[i];
    const dx = bikeWX - d.x;
    const dy = bike.y - d.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < bikeRadius + 25) { // Radio del drone ~25
      // ¡Colisión con drone!
      drones.splice(i, 1); // Remover drone
      handleCrash.call(this, 'Chocaste un drone!');
      beep(this, 200, 0.3); // Sonido de choque
      return;
    }
  }
  
  // Colisión con obstáculos del suelo (solo si está en el suelo o muy cerca)
  if (!bike.air || bike.y > 400) {
    for (let o of obstacles) {
      const oLeft = o.x;
      const oRight = o.x + o.w;
      const oTop = track.base - o.h;
      
      // Verificar si la moto está en el rango horizontal del obstáculo
      if (bikeWX + bikeRadius > oLeft && bikeWX - bikeRadius < oRight) {
        // Verificar si está a la altura del obstáculo
        if (bike.y + bikeRadius > oTop) {
          handleCrash.call(this, 'Chocaste un obstaculo!');
          beep(this, 150, 0.4);
          return;
        }
      }
    }
  }
  
  // Interacción con aros
  for (let h of hoops) {
    const screenX = h.x - track.scroll;
    if (screenX < -100 || screenX > 900) continue; // Fuera de rango
    
    const dx = bikeWX - h.x;
    const dy = bike.y - h.y;
    const distToCenter = Math.hypot(dx, dy);
    
    // Verificar si está en el rango horizontal del aro
    if (Math.abs(dx) < h.radius + bikeRadius) {
      
      // 1. Choque con el POSTE (parte inferior) - NO MUERE, solo rebota/esquiva
      const poleTop = h.y;
      const poleBottom = track.base;
      const poleX = h.x;
      if (Math.abs(bikeWX - poleX) < 8 && bike.y > poleTop && bike.y < poleBottom) {
        // Está chocando con el poste - no hace nada (lo esquiva)
        continue;
      }
      
      // 2. Pasó POR DENTRO del aro - BONUS!
      if (distToCenter < h.radius && !h.collected) {
        h.collected = true;
        const points = h.points || 500; // Usa los puntos del aro
        score += points;
        lastScoreTime = gameTime; // Actualizar tiempo de último punto
        const bonusText = h.isSpecial ? '+' + points + ' SPECIAL!' : '+' + points + ' BONUS!';
        showFloatingText(bonusText, bike.x, bike.y - 50);
        beep(this, h.isSpecial ? 1200 : 880, 0.15); // Sonido más agudo para especiales
        continue;
      }
      
      // 3. Choque con el ARO (círculo) - YA NO MUERE, solo no gana puntos
      // Removido: ahora solo importa si pasa por dentro
    }
  }
  
  // Colisión con púas en el suelo
  if (!bike.air || bike.y > track.base - 20) { // Solo si está cerca del suelo
    for (let i = spikes.length - 1; i >= 0; i--) {
      const sp = spikes[i];
      const spLeft = sp.x - sp.w / 2;
      const spRight = sp.x + sp.w / 2;
      
      // Verificar si la moto está sobre la púa
      if (bikeWX + bikeRadius > spLeft && bikeWX - bikeRadius < spRight) {
        if (bike.y >= track.base - 25) { // Altura de las púas
          handleCrash.call(this, 'Tocaste una pua!');
          beep(this, 100, 0.5);
          return;
        }
      }
    }
  }
}

// Manejar crash (muerte)
function handleCrash(message) {
  if (gameMode === 'competition') {
    gameOver = true;
    gameOverReason = message;
  } else if (gameMode === '1v1') {
    // Reducir vida del jugador actual
    if (currentPlayer === 1) {
      player1Lives--;
      if (player1Lives <= 0) {
        gameState = '1v1end';
        winner = 2;
      } else {
        // Cambiar al jugador 2
        gameState = '1v1ready';
        previousPlayerScore = score;
      }
    } else {
      player2Lives--;
      if (player2Lives <= 0) {
        gameState = '1v1end';
        winner = 1;
      } else {
        // Volver al jugador 1
        gameState = '1v1ready';
        previousPlayerScore = score;
      }
    }
    resetBikePosition();
  }
}

// Textos flotantes de puntos
function showFloatingText(text, x, y) {
  floatingTexts.push({ text, x, y, life: 1.5 });
}

function updateFloatingTexts(s) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= s;
    ft.y -= 40 * s; // sube
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

// Sistema de calificaciones de jueces
function showJudgeScores(flips) {
  // Generar 3 calificaciones con personalidades únicas
  judgeScores = [];
  
  // JUEZ 2 y 3: Normales (4-10)
  const base = Math.min(10, 6 + flips * 1.5);
  
  // Juez 2
  const variation2 = Math.random() * 2 - 1;
  const score2 = Math.max(4, Math.min(10, base + variation2));
  
  // Juez 3
  const variation3 = Math.random() * 2 - 1;
  const score3 = Math.max(4, Math.min(10, base + variation3));
  
  // Promedio de los jueces normales
  const avgNormal = (score2 + score3) / 2;
  
  // JUEZ 1: El crítico extremo
  let score1;
  if (avgNormal <= 5) {
    // Si los otros dos dan notas bajas, el juez 1 da una nota ALTA (8-11) 
    score1 = 8 + Math.random() * 3;
    score1 = Math.min(11, score1); // Puede llegar a 11!
  } else {
    // Si los otros dos dan notas normales/altas, el juez 1 es muy duro (1-5)
    score1 = 1 + Math.random() * 4;
  }
  
  // Orden: Juez 1 (el crítico), Juez 2, Juez 3
  judgeScores.push({ score: score1.toFixed(1), life: 3, judge: 1 });
  judgeScores.push({ score: score2.toFixed(1), life: 3, judge: 2 });
  judgeScores.push({ score: score3.toFixed(1), life: 3, judge: 3 });
}

function updateJudgeScores(s) {
  for (let i = judgeScores.length - 1; i >= 0; i--) {
    judgeScores[i].life -= s;
    if (judgeScores[i].life <= 0) judgeScores.splice(i, 1);
  }
}

function drawJudgeScores() {
  if (!scene || judgeScores.length === 0) return;
  
  // Posición centrada en la parte superior
  const centerX = 400;
  const startY = 80;
  const spacing = 110;
  const startX = centerX - (spacing * (judgeScores.length - 1)) / 2;
  
  for (let i = 0; i < judgeScores.length; i++) {
    const js = judgeScores[i];
    const alpha = Math.min(1, js.life / 3);
    const x = startX + i * spacing;
    const scale = 1 + (1 - alpha) * 0.3; // Efecto de crecimiento al aparecer
    
    // Fondo del panel de juez con borde dorado
    g.fillStyle(0x1a1a2e, alpha * 0.95);
    g.fillRoundedRect(x - 45, startY - 35, 90, 70, 10);
    
    g.lineStyle(3, 0xFFD700, alpha);
    g.strokeRoundedRect(x - 45, startY - 35, 90, 70, 10);
    
    // Número del juez
    const judgeNum = scene.add.text(x, startY - 15, 'JUEZ ' + (i + 1), {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#AAA',
      fontWeight: 'bold'
    });
    judgeNum.setOrigin(0.5);
    judgeNum.setAlpha(alpha);
    scene.time.delayedCall(16, () => judgeNum.destroy());
    
    // Calificación grande y destacada
    const scoreText = scene.add.text(x, startY + 10, js.score, {
      fontFamily: 'Arial Black',
      fontSize: Math.floor(36 * scale) + 'px',
      color: getScoreColor(js.score),
      stroke: '#000',
      strokeThickness: 4
    });
    scoreText.setOrigin(0.5);
    scoreText.setAlpha(alpha);
    scene.time.delayedCall(16, () => scoreText.destroy());
    
    // Estrellas decorativas según puntuación
    if (js.score >= 9.5) {
      drawStars(x, startY - 30, alpha);
    }
  }
}

// Indicador visual del viento
function drawWindIndicator() {
  if (!windActive || !scene) return;
  
  // Posición en la esquina superior derecha
  const x = 700;
  const y = 30;
  
  // Fondo del indicador
  g.fillStyle(0x000000, 0.5);
  g.fillRoundedRect(x - 60, y - 15, 120, 30, 5);
  
  // Texto "VIENTO"
  const windText = scene.add.text(x - 40, y, 'WIND', {
    fontFamily: 'Arial',
    fontSize: '12px',
    color: '#FFF',
    fontWeight: 'bold'
  });
  windText.setOrigin(0, 0.5);
  scene.time.delayedCall(16, () => windText.destroy());
  
  // Flechas indicando dirección y fuerza
  const arrowCount = Math.ceil(windForce * 3); // 1-3 flechas
  const arrowX = x + 10;
  const direction = windDirection > 0 ? 1 : -1; // Derecha o izquierda
  
  for (let i = 0; i < arrowCount; i++) {
    const offset = i * 12 * direction;
    drawWindArrow(arrowX + offset, y, direction, windForce);
  }
}

function drawWindArrow(x, y, direction, intensity) {
  // Color según intensidad (amarillo débil → rojo fuerte)
  let color = 0xFFFF00;
  if (intensity > 0.6) color = 0xFF9900;
  if (intensity > 0.8) color = 0xFF0000;
  
  g.fillStyle(color, 0.8);
  
  // Triángulo apuntando en la dirección del viento
  const size = 6;
  g.beginPath();
  if (direction > 0) {
    // Flecha derecha →
    g.moveTo(x - size, y - size);
    g.lineTo(x + size, y);
    g.lineTo(x - size, y + size);
  } else {
    // Flecha izquierda ←
    g.moveTo(x + size, y - size);
    g.lineTo(x - size, y);
    g.lineTo(x + size, y + size);
  }
  g.closePath();
  g.fillPath();
}

// Advertencia de afición aburrida
function drawCrowdBoredWarning() {
  if (!crowdBoredWarning || !scene) return;
  
  const timeSinceLastScore = gameTime - lastScoreTime;
  const timeRemaining = crowdBoredLimit - timeSinceLastScore;
  
  // Efecto pulsante más intenso cuanto menos tiempo quede
  const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const urgency = 1 - (timeRemaining / 2); // 0 a 1 (más urgente al final)
  
  // Fondo semi-transparente en la parte superior
  g.fillStyle(0xff0000, 0.2 + urgency * 0.3);
  g.fillRect(0, 0, 800, 150);
  
  // Texto de advertencia con efecto pulsante
  const warningText = scene.add.text(400, 75, '¡HAZ TRUCOS O LA AFICIÓN SE ABURRIRÁ!', {
    fontFamily: 'Arial Black',
    fontSize: Math.floor((24 + urgency * 12) * pulse) + 'px',
    color: '#FF0000',
    stroke: '#FFFF00',
    strokeThickness: 4 + urgency * 3
  });
  warningText.setOrigin(0.5);
  scene.time.delayedCall(16, () => warningText.destroy());
  
  // Temporizador
  const timerText = scene.add.text(400, 110, Math.ceil(timeRemaining) + 's', {
    fontFamily: 'Arial Black',
    fontSize: Math.floor(32 * pulse) + 'px',
    color: '#FFFF00',
    stroke: '#FF0000',
    strokeThickness: 5
  });
  timerText.setOrigin(0.5);
  scene.time.delayedCall(16, () => timerText.destroy());
}

function getScoreColor(score) {
  if (score >= 9.5) return '#FFD700'; // Oro
  if (score >= 9) return '#00FF00'; // Verde brillante
  if (score >= 8) return '#00DDFF'; // Cyan
  if (score >= 7) return '#FFAA00'; // Naranja
  return '#FFFFFF'; // Blanco
}

function drawStars(x, y, alpha) {
  if (!g) return;
  // Estrellas pequeñas alrededor
  const starPositions = [
    {x: x - 35, y: y},
    {x: x + 35, y: y}
  ];
  
  for (let pos of starPositions) {
    g.fillStyle(0xFFFF00, alpha * 0.8);
    drawStar(pos.x, pos.y, 4, 6, 3);
  }
}

function drawStar(cx, cy, spikes, outerR, innerR) {
  if (!g) return;
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  g.beginPath();
  g.moveTo(cx, cy - outerR);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    g.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    g.lineTo(x, y);
    rot += step;
  }
  
  g.lineTo(cx, cy - outerR);
  g.closePath();
  g.fillPath();
}

// Sonido de aplausos
function playApplause(sc) {
  if (!sc || !sc.sound || !sc.sound.context) return;
  const ctx = sc.sound.context;
  if (!ctx.createOscillator || !ctx.createGain) return;
  
  const t0 = ctx.currentTime;
  
  // Aplausos rápidos con múltiples osciladores
  for (let i = 0; i < 15; i++) {
    const delay = i * 0.04;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 60 + Math.random() * 200;
    o.type = 'square';
    g.gain.setValueAtTime(0.12, t0 + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.06);
    o.start(t0 + delay);
    o.stop(t0 + delay + 0.06);
  }
  
  // Vítores (gritos agudos)
  for (let i = 0; i < 4; i++) {
    const delay = 0.3 + i * 0.1;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 600 + Math.random() * 600;
    o.type = 'sine';
    g.gain.setValueAtTime(0.15, t0 + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.2);
    o.start(t0 + delay);
    o.stop(t0 + delay + 0.2);
  }
}

function drawFloatingTexts() {
  if (!scene) return;
  // Crear y destruir textos dinámicamente
  for (let ft of floatingTexts) {
    const alpha = Math.max(0, ft.life / 1.5);
    const txtObj = scene.add.text(ft.x, ft.y, ft.text, { 
      fontFamily: 'monospace', 
      fontSize: '24px', 
      color: '#ffff00',
      stroke: '#000',
      strokeThickness: 3
    });
    txtObj.setOrigin(0.5);
    txtObj.setAlpha(alpha);
    scene.time.delayedCall(16, () => txtObj.destroy());
  }
}

function drawTrickEffects() {
  if (!scene) return;
  for (let e of trickEffects) {
    const alpha = Math.max(0, e.life / 1.5);
    const scale = 1 + e.scale;
    
    // Múltiples anillos de efecto expandiéndose
    g.lineStyle(6, e.color, alpha * 0.9);
    g.strokeCircle(e.x, e.y, 15 * scale);
    g.lineStyle(4, e.color, alpha * 0.6);
    g.strokeCircle(e.x, e.y, 25 * scale);
    g.lineStyle(2, e.color, alpha * 0.3);
    g.strokeCircle(e.x, e.y, 35 * scale);
    
    // Dibujar representación visual de la pose
    drawTrickPose(e.x, e.y - 40, e.pose, e.color, alpha, scale);
    
    // Texto del truco
    const txtObj = scene.add.text(e.x, e.y + 30, e.name, { 
      fontFamily: 'Arial Black', 
      fontSize: Math.floor(20 + scale * 10) + 'px', 
      color: '#' + e.color.toString(16).padStart(6, '0'),
      stroke: '#000',
      strokeThickness: 5
    });
    txtObj.setOrigin(0.5);
    txtObj.setAlpha(alpha);
    scene.time.delayedCall(16, () => txtObj.destroy());
  }
}

function drawTrickPose(x, y, pose, color, alpha, scale) {
  const s = 0.8 * scale;
  g.fillStyle(color, alpha * 0.8);
  
  if (pose === 'superman') {
    // Piloto horizontal con brazos extendidos adelante
    g.fillRect(x - 15*s, y - 3*s, 30*s, 6*s); // cuerpo
    g.fillCircle(x - 18*s, y, 4*s); // cabeza
    g.fillRect(x + 5*s, y - 10*s, 20*s, 3*s); // brazo superior
    g.fillRect(x + 5*s, y + 7*s, 20*s, 3*s); // brazo inferior
  } else if (pose === 'nohander') {
    // Sin manos - brazos levantados
    g.fillRect(x - 10*s, y, 20*s, 6*s); // cuerpo
    g.fillCircle(x - 12*s, y + 3*s, 4*s); // cabeza
    g.fillRect(x - 8*s, y - 12*s, 3*s, 12*s); // brazo izq arriba
    g.fillRect(x + 5*s, y - 12*s, 3*s, 12*s); // brazo der arriba
  } else if (pose === 'cancan') {
    // Pierna al lado
    g.fillRect(x - 10*s, y - 3*s, 20*s, 6*s); // cuerpo
    g.fillCircle(x - 12*s, y, 4*s); // cabeza
    g.fillRect(x, y + 6*s, 3*s, 12*s); // pierna vertical
    g.fillRect(x + 3*s, y + 12*s, 15*s, 3*s); // pierna horizontal
  } else if (pose === 'barhop') {
    // Salto sobre manubrio - cuerpo doblado
    g.fillCircle(x, y, 5*s); // cabeza
    g.fillRect(x - 8*s, y + 5*s, 16*s, 5*s); // cuerpo doblado
    g.fillRect(x - 6*s, y + 10*s, 4*s, 10*s); // piernas juntas
  } else if (pose === 'nacnac') {
    // Pierna cruzada atrás
    g.fillRect(x - 10*s, y - 3*s, 20*s, 6*s); // cuerpo
    g.fillCircle(x - 12*s, y, 4*s); // cabeza
    g.fillRect(x + 5*s, y + 3*s, 3*s, 10*s); // pierna derecha
    g.fillRect(x - 15*s, y + 5*s, 18*s, 3*s); // pierna cruzada
  }
}

  // Dibujo
function draw() {
    g.clear();
    drawBackground();
    drawAirParticles(); // Líneas de velocidad
    drawDrones(); // Drones voladores
    drawHoops(); // Aros de bonus
    drawTrack();
    drawObstacles(); // Obstáculos en el suelo
    drawSpikes(); // Púas en el suelo
    drawBike();
    drawTrickEffects(); // efectos visuales de acrobacias
    drawFloatingTexts();
    drawJudgeScores();
    drawWindIndicator(); // Indicador de viento
    draw1v1HUD(); // HUD específico para 1v1
    if (gameOver) drawGameOver();
  }

function drawMenu() {
  if (!g || !scene) return;
  g.clear();
  
  // Fondo degradado más dramático (oscuro arriba, brillante abajo)
  g.fillGradientStyle(0x1a0033, 0x1a0033, 0xff6600, 0xff6600, 1);
  g.fillRect(0, 0, 800, 600);
  
  // Estrellas decorativas en el fondo
  for (let i = 0; i < 30; i++) {
    const x = (i * 73) % 800;
    const y = (i * 47) % 300;
    g.fillStyle(0xffffff, 0.3 + Math.random() * 0.3);
    g.fillCircle(x, y, 1 + Math.random() * 2);
  }
  
  // Barra decorativa superior
  g.fillStyle(0x000000, 0.5);
  g.fillRect(0, 0, 800, 60);
  
  // Llamas decorativas en los laterales
  const flameTime = Date.now() / 100;
  for (let side of [-1, 1]) {
    const baseX = side === -1 ? 50 : 750;
    for (let i = 0; i < 5; i++) {
      const flameY = 200 + i * 80 + Math.sin(flameTime + i) * 10;
      const flameSize = 20 + Math.sin(flameTime * 2 + i) * 8;
      g.fillStyle(0xff6600, 0.6);
      g.fillCircle(baseX, flameY, flameSize);
      g.fillStyle(0xffaa00, 0.8);
      g.fillCircle(baseX, flameY - 5, flameSize * 0.7);
      g.fillStyle(0xffff00, 0.5);
      g.fillCircle(baseX, flameY - 10, flameSize * 0.4);
    }
  }
  
  // Sombra del título
  const titleShadow = scene.add.text(405, 105, 'BROKE BONEZ', {
    fontFamily: 'Arial Black',
    fontSize: '84px',
    color: '#000000',
    alpha: 0.5
  });
  titleShadow.setOrigin(0.5);
  scene.time.delayedCall(16, () => titleShadow.destroy());
  
  // Título principal con efecto metálico
  const title = scene.add.text(400, 100, 'BROKE BONEZ', {
    fontFamily: 'Arial Black',
    fontSize: '84px',
    color: '#FFD700',
    stroke: '#8B4513',
    strokeThickness: 10
  });
  title.setOrigin(0.5);
  scene.time.delayedCall(16, () => title.destroy());
  
  // Brillo en el título
  const titleShine = scene.add.text(400, 100, 'BROKE BONEZ', {
    fontFamily: 'Arial Black',
    fontSize: '84px',
    color: '#FFFFFF',
    alpha: 0.3
  });
  titleShine.setOrigin(0.5);
  scene.time.delayedCall(16, () => titleShine.destroy());
  
  // Subtítulo con efecto neón
  const subtitle = scene.add.text(400, 185, '⚡ EXTREME MOTORCYCLE STUNTS ⚡', {
    fontFamily: 'Arial Black',
    fontSize: '22px',
    color: '#00FFFF',
    stroke: '#0066CC',
    strokeThickness: 4
  });
  subtitle.setOrigin(0.5);
  scene.time.delayedCall(16, () => subtitle.destroy());
  
  // Calavera decorativa (símbolo del juego)
  const skull = scene.add.text(400, 230, '💀', {
    fontSize: '48px'
  });
  skull.setOrigin(0.5);
  scene.time.delayedCall(16, () => skull.destroy());
  
  // === OPCIÓN 1: COMPETICIÓN ===
  // Fondo con sombra
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(155, 295, 490, 90, 15);
  
  // Botón principal
  g.fillStyle(0xff3333, 1);
  g.fillRoundedRect(150, 290, 490, 90, 15);
  
  // Borde brillante
  g.lineStyle(5, 0xffaa00, 1);
  g.strokeRoundedRect(150, 290, 490, 90, 15);
  
  // Ícono de trofeo
  const trophy1 = scene.add.text(180, 325, '🏆', {
    fontSize: '42px'
  });
  trophy1.setOrigin(0.5);
  scene.time.delayedCall(16, () => trophy1.destroy());
  
  const opt1 = scene.add.text(400, 315, '[1] COMPETICIÓN', {
    fontFamily: 'Arial Black',
    fontSize: '32px',
    color: '#FFFF00',
    stroke: '#000',
    strokeThickness: 6
  });
  opt1.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt1.destroy());
  
  const opt1desc = scene.add.text(400, 355, '1 JUGADOR • TOP 10 • RÉCORDS', {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 3
  });
  opt1desc.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt1desc.destroy());
  
  // === OPCIÓN 2: 1 VS 1 ===
  // Fondo con sombra
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(155, 415, 490, 90, 15);
  
  // Botón principal
  g.fillStyle(0x0066ff, 1);
  g.fillRoundedRect(150, 410, 490, 90, 15);
  
  // Borde brillante
  g.lineStyle(5, 0x00ccff, 1);
  g.strokeRoundedRect(150, 410, 490, 90, 15);
  
  // Íconos de jugadores
  const player1Icon = scene.add.text(180, 445, '🏍️', {
    fontSize: '38px'
  });
  player1Icon.setOrigin(0.5);
  scene.time.delayedCall(16, () => player1Icon.destroy());
  
  const vsText = scene.add.text(615, 435, 'VS', {
    fontFamily: 'Arial Black',
    fontSize: '24px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 4
  });
  vsText.setOrigin(0.5);
  scene.time.delayedCall(16, () => vsText.destroy());
  
  const player2Icon = scene.add.text(615, 460, '🏍️', {
    fontSize: '38px'
  });
  player2Icon.setOrigin(0.5);
  scene.time.delayedCall(16, () => player2Icon.destroy());
  
  const opt2 = scene.add.text(370, 435, '[2] 1 VS 1', {
    fontFamily: 'Arial Black',
    fontSize: '32px',
    color: '#00FFFF',
    stroke: '#000',
    strokeThickness: 6
  });
  opt2.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt2.destroy());
  
  const opt2desc = scene.add.text(370, 475, '2 JUGADORES • 3 VIDAS', {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#00FFFF',
    stroke: '#000',
    strokeThickness: 3
  });
  opt2desc.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt2desc.destroy());
  
  // === INSTRUCCIONES ABAJO ===
  const instBox = scene.add.rectangle(400, 555, 600, 50, 0x000000, 0.7);
  scene.time.delayedCall(16, () => instBox.destroy());
  
  const inst = scene.add.text(400, 555, '🎮 PRESIONA 1 o 2 PARA COMENZAR 🎮', {
    fontFamily: 'Arial Black',
    fontSize: '18px',
    color: '#FFFFFF',
    stroke: '#000',
    strokeThickness: 3
  });
  inst.setOrigin(0.5);
  scene.time.delayedCall(16, () => inst.destroy());
  
  // Animación parpadeante para "PRESS START"
  const blinkAlpha = Math.sin(Date.now() / 300) * 0.5 + 0.5;
  const pressStart = scene.add.text(400, 525, '▶ SELECT YOUR MODE ◀', {
    fontFamily: 'Arial',
    fontSize: '14px',
    color: '#FFD700',
    alpha: blinkAlpha
  });
  pressStart.setOrigin(0.5);
  scene.time.delayedCall(16, () => pressStart.destroy());
}

function drawEnterName() {
  if (!g || !scene) return;
  g.clear();
  
  g.fillStyle(0x000033, 1);
  g.fillRect(0, 0, 800, 600);
  
  const title = scene.add.text(400, 120, '¡NUEVO RÉCORD!', {
    fontFamily: 'Arial Black',
    fontSize: '48px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 6
  });
  title.setOrigin(0.5);
  scene.time.delayedCall(16, () => title.destroy());
  
  const scoreText = scene.add.text(400, 200, 'PUNTOS: ' + score, {
    fontFamily: 'Arial Black',
    fontSize: '36px',
    color: '#00FF00',
    stroke: '#000',
    strokeThickness: 4
  });
  scoreText.setOrigin(0.5);
  scene.time.delayedCall(16, () => scoreText.destroy());
  
  const inst = scene.add.text(400, 270, 'INGRESA TU NOMBRE (5 LETRAS)', {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#FFF'
  });
  inst.setOrigin(0.5);
  scene.time.delayedCall(16, () => inst.destroy());
  
  // Dibujar cada letra con su caja
  const startX = 200;
  const spacing = 80;
  
  for (let i = 0; i < 5; i++) {
    const x = startX + i * spacing;
    const y = 350;
    const isActive = i === currentCharIndex;
    
    // Caja de letra
    g.fillStyle(isActive ? 0x555555 : 0x333333, 1);
    g.fillRoundedRect(x, y, 70, 90, 10);
    g.lineStyle(4, isActive ? 0xFFD700 : 0x666666, 1);
    g.strokeRoundedRect(x, y, 70, 90, 10);
    
    // Letra
    const letter = scene.add.text(x + 35, y + 45, nameChars[i], {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: isActive ? '#FFD700' : '#FFF',
      stroke: '#000',
      strokeThickness: 4
    });
    letter.setOrigin(0.5);
    scene.time.delayedCall(16, () => letter.destroy());
    
    // Indicador de posición activa
    if (isActive) {
      g.fillStyle(0xFFD700, 1);
      g.fillTriangle(x + 35 - 8, y - 15, x + 35 + 8, y - 15, x + 35, y - 5);
      g.fillTriangle(x + 35 - 8, y + 105, x + 35 + 8, y + 105, x + 35, y + 95);
    }
  }
  
  // Instrucciones
  const controls = scene.add.text(400, 480, '← → Mover | J Subir letra | K Bajar letra', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#AAA'
  });
  controls.setOrigin(0.5);
  scene.time.delayedCall(16, () => controls.destroy());
  
  const enterInst = scene.add.text(400, 520, 'Presiona ENTER para confirmar', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#00FF00'
  });
  enterInst.setOrigin(0.5);
  scene.time.delayedCall(16, () => enterInst.destroy());
}

function drawLeaderboard() {
  if (!g || !scene) return;
  g.clear();
  
  g.fillGradientStyle(0x000066, 0x000066, 0x000033, 0x000033, 1);
  g.fillRect(0, 0, 800, 600);
  
  const title = scene.add.text(400, 40, 'TOP 10 - MEJORES PILOTOS', {
    fontFamily: 'Arial Black',
    fontSize: '42px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 6
  });
  title.setOrigin(0.5);
  scene.time.delayedCall(16, () => title.destroy());
  
  // Si el leaderboard está vacío
  if (leaderboard.length === 0) {
    const emptyText = scene.add.text(400, 300, 'No hay récords aún\n¡Sé el primero!', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#AAA',
      align: 'center'
    });
    emptyText.setOrigin(0.5);
    scene.time.delayedCall(16, () => emptyText.destroy());
  } else {
    // Mostrar entradas existentes
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const isHighlighted = entry.name === playerName && entry.score === score;
      
      // POSICIONES 1, 2, 3 - DESTACADAS
      if (i < 3) {
        const podiumY = 110 + i * 55; // Más espacio para el podio
        
        // Colores especiales por posición
        let medalColor, bgColor, nameColor, scoreColor, fontSize, strokeThickness;
        
        if (i === 0) { // 1er lugar - ORO
          medalColor = 0xFFD700;
          bgColor = isHighlighted ? 0xFFD700 : 0x4a3800;
          nameColor = isHighlighted ? '#000' : '#FFD700';
          scoreColor = isHighlighted ? '#000' : '#FFD700';
          fontSize = '32px';
          strokeThickness = 5;
        } else if (i === 1) { // 2do lugar - PLATA
          medalColor = 0xC0C0C0;
          bgColor = isHighlighted ? 0xFFD700 : 0x3a3a3a;
          nameColor = isHighlighted ? '#000' : '#E0E0E0';
          scoreColor = isHighlighted ? '#000' : '#C0C0C0';
          fontSize = '28px';
          strokeThickness = 4;
        } else { // 3er lugar - BRONCE
          medalColor = 0xCD7F32;
          bgColor = isHighlighted ? 0xFFD700 : 0x3a2a1a;
          nameColor = isHighlighted ? '#000' : '#CD7F32';
          scoreColor = isHighlighted ? '#000' : '#CD7F32';
          fontSize = '26px';
          strokeThickness = 4;
        }
        
        // Fondo especial con brillo
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(80, podiumY - 22, 640, 48, 12);
        
        // Borde metálico
        g.lineStyle(3, medalColor, 1);
        g.strokeRoundedRect(80, podiumY - 22, 640, 48, 12);
        
        // Medalla/Corona
        const medalX = 110;
        g.fillStyle(medalColor, 1);
        if (i === 0) {
          // Corona para el 1er lugar
          g.fillRect(medalX - 10, podiumY - 8, 20, 12);
          g.fillTriangle(medalX - 10, podiumY - 8, medalX - 5, podiumY - 15, medalX, podiumY - 8);
          g.fillTriangle(medalX, podiumY - 8, medalX, podiumY - 18, medalX + 5, podiumY - 8);
          g.fillTriangle(medalX + 5, podiumY - 8, medalX + 10, podiumY - 15, medalX + 10, podiumY - 8);
        } else {
          // Medalla circular para 2do y 3er lugar
          g.fillCircle(medalX, podiumY, 12);
          g.lineStyle(2, 0x000000, 1);
          g.strokeCircle(medalX, podiumY, 12);
        }
        
        // Número de posición dentro de la medalla
        const posNum = scene.add.text(medalX, podiumY, (i + 1), {
          fontFamily: 'Arial Black',
          fontSize: '18px',
          color: i === 0 ? '#000' : '#FFF',
          stroke: i === 0 ? '#FFD700' : '#000',
          strokeThickness: 2
        });
        posNum.setOrigin(0.5);
        scene.time.delayedCall(16, () => posNum.destroy());
        
        // Nombre del jugador
        const name = scene.add.text(150, podiumY, entry.name, {
          fontFamily: 'Arial Black',
          fontSize: fontSize,
          color: nameColor,
          stroke: '#000',
          strokeThickness: strokeThickness
        });
        name.setOrigin(0, 0.5);
        scene.time.delayedCall(16, () => name.destroy());
        
        // Puntos
        const pts = scene.add.text(690, podiumY, entry.score.toString(), {
          fontFamily: 'Arial Black',
          fontSize: fontSize,
          color: scoreColor,
          stroke: '#000',
          strokeThickness: strokeThickness
        });
        pts.setOrigin(1, 0.5);
        scene.time.delayedCall(16, () => pts.destroy());
        
      } else {
        // POSICIONES 4-10 - ESTILO NORMAL
        const y = 280 + (i - 3) * 38;
        
        const bgColor1 = isHighlighted ? 0xFFD700 : 0x1a1a3a;
        const bgColor2 = isHighlighted ? 0xFFD700 : 0x0d0d1f;
        const bgColor = (i % 2 === 0) ? bgColor1 : bgColor2;
        const textColor = isHighlighted ? '#000' : '#CCC';
        const scoreColor = isHighlighted ? '#000' : '#FFD700';
        
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(120, y - 16, 560, 32, 6);
        
        const pos = scene.add.text(150, y, (i + 1) + '.', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: textColor
        });
        pos.setOrigin(0, 0.5);
        scene.time.delayedCall(16, () => pos.destroy());
        
        const name = scene.add.text(200, y, entry.name, {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: textColor,
          stroke: '#000',
          strokeThickness: 2
        });
        name.setOrigin(0, 0.5);
        scene.time.delayedCall(16, () => name.destroy());
        
        const pts = scene.add.text(650, y, entry.score.toString(), {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: scoreColor
        });
        pts.setOrigin(1, 0.5);
        scene.time.delayedCall(16, () => pts.destroy());
      }
    }
  }
  
  const inst = scene.add.text(400, 570, 'Presiona ENTER para volver al menú', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#FFF'
  });
  inst.setOrigin(0.5);
  scene.time.delayedCall(16, () => inst.destroy());
}

function draw1v1Ready() {
  if (!g || !scene) return;
  g.clear();
  
  // Fondo con gradiente oscuro
  g.fillGradientStyle(0x001133, 0x001133, 0x002255, 0x002255, 1);
  g.fillRect(0, 0, 800, 600);
  
  // Mostrar resumen del turno anterior
  const prevPlayer = currentPlayer === 1 ? 2 : 1;
  const prevScore = prevPlayer === 1 ? player1Score : player2Score;
  const prevLives = prevPlayer === 1 ? player1Lives : player2Lives;
  
  const summaryTitle = scene.add.text(400, 100, 'FIN DEL TURNO - JUGADOR ' + prevPlayer, {
    fontFamily: 'Arial Black',
    fontSize: '36px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 5
  });
  summaryTitle.setOrigin(0.5);
  scene.time.delayedCall(16, () => summaryTitle.destroy());
  
  const summaryScore = scene.add.text(400, 160, 'Puntos obtenidos: ' + score, {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: '#00FF00',
    stroke: '#000',
    strokeThickness: 3
  });
  summaryScore.setOrigin(0.5);
  scene.time.delayedCall(16, () => summaryScore.destroy());
  
  const summaryTotal = scene.add.text(400, 200, 'Total acumulado: ' + prevScore, {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#FFF'
  });
  summaryTotal.setOrigin(0.5);
  scene.time.delayedCall(16, () => summaryTotal.destroy());
  
  const summaryLives = scene.add.text(400, 240, 'Vidas restantes: ' + '❤'.repeat(prevLives) + '🖤'.repeat(3 - prevLives), {
    fontSize: '28px'
  });
  summaryLives.setOrigin(0.5);
  scene.time.delayedCall(16, () => summaryLives.destroy());
  
  // Línea divisora
  g.lineStyle(3, 0xFFD700, 1);
  g.lineBetween(200, 280, 600, 280);
  
  // Título del siguiente turno
  const nextTitle = scene.add.text(400, 330, 'TURNO DEL JUGADOR ' + currentPlayer, {
    fontFamily: 'Arial Black',
    fontSize: '48px',
    color: '#00FF00',
    stroke: '#000',
    strokeThickness: 6
  });
  nextTitle.setOrigin(0.5);
  scene.time.delayedCall(16, () => nextTitle.destroy());
  
  // Estado actual del jugador
  const currentScore = currentPlayer === 1 ? player1Score : player2Score;
  const currentLives = currentPlayer === 1 ? player1Lives : player2Lives;
  
  const currentInfo = scene.add.text(400, 410, 'Puntos actuales: ' + currentScore + '\nVidas: ' + '❤'.repeat(currentLives) + '🖤'.repeat(3 - currentLives), {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#FFF',
    align: 'center',
    lineSpacing: 10
  });
  currentInfo.setOrigin(0.5);
  scene.time.delayedCall(16, () => currentInfo.destroy());
  
  // Instrucción para continuar
  const readyText = scene.add.text(400, 520, '¡PREPÁRATE!', {
    fontFamily: 'Arial Black',
    fontSize: '32px',
    color: '#FFFF00',
    stroke: '#000',
    strokeThickness: 4
  });
  readyText.setOrigin(0.5);
  scene.time.delayedCall(16, () => readyText.destroy());
  
  const continueText = scene.add.text(400, 560, 'Presiona ENTER cuando estés listo', {
    fontFamily: 'Arial',
    fontSize: '20px',
    color: '#AAA'
  });
  continueText.setOrigin(0.5);
  scene.time.delayedCall(16, () => continueText.destroy());
}

function draw1v1End() {
  if (!g || !scene) return;
  g.clear();
  
  g.fillGradientStyle(0x330000, 0x330000, 0x660000, 0x660000, 1);
  g.fillRect(0, 0, 800, 600);
  
  const winner = player1Score > player2Score ? 1 : 2;
  
  const title = scene.add.text(400, 120, '¡FIN DEL JUEGO!', {
    fontFamily: 'Arial Black',
    fontSize: '56px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 8
  });
  title.setOrigin(0.5);
  scene.time.delayedCall(16, () => title.destroy());
  
  drawTrophy(400, 250);
  
  const winText = scene.add.text(400, 350, 'GANADOR: JUGADOR ' + winner, {
    fontFamily: 'Arial Black',
    fontSize: '42px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 6
  });
  winText.setOrigin(0.5);
  scene.time.delayedCall(16, () => winText.destroy());
  
  const p1 = scene.add.text(400, 430, 'Jugador 1: ' + player1Score + ' pts', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: winner === 1 ? '#00FF00' : '#FFF',
    stroke: '#000',
    strokeThickness: 3
  });
  p1.setOrigin(0.5);
  scene.time.delayedCall(16, () => p1.destroy());
  
  const p2 = scene.add.text(400, 470, 'Jugador 2: ' + player2Score + ' pts', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: winner === 2 ? '#00FF00' : '#FFF',
    stroke: '#000',
    strokeThickness: 3
  });
  p2.setOrigin(0.5);
  scene.time.delayedCall(16, () => p2.destroy());
  
  const inst = scene.add.text(400, 550, 'Presiona ENTER para volver al menú', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#FFF'
  });
  inst.setOrigin(0.5);
  scene.time.delayedCall(16, () => inst.destroy());
}

function drawTrophy(x, y) {
  if (!g) return;
  
  g.fillStyle(0xFFD700, 1);
  g.fillRect(x - 30, y + 40, 60, 10);
  g.fillRect(x - 10, y + 25, 20, 15);
  g.beginPath();
  g.moveTo(x - 25, y + 25);
  g.lineTo(x - 30, y - 20);
  g.lineTo(x + 30, y - 20);
  g.lineTo(x + 25, y + 25);
  g.closePath();
  g.fillPath();
  
  g.lineStyle(8, 0xFFD700, 1);
  g.beginPath();
  g.arc(x - 30, y, 15, -Math.PI / 2, Math.PI / 2);
  g.strokePath();
  g.beginPath();
  g.arc(x + 30, y, 15, Math.PI / 2, -Math.PI / 2);
  g.strokePath();
  
  g.fillStyle(0xFFFFAA, 0.5);
  g.fillCircle(x - 10, y - 5, 8);
}

function draw1v1HUD() {
  if (!scene || gameMode !== '1v1' || gameState !== '1v1') return;
  
  // Panel Jugador 1 (abajo izquierda)
  const p1Panel = scene.add.rectangle(120, 560, 200, 50, 0x000000, 0.7);
  scene.time.delayedCall(16, () => p1Panel.destroy());
  
  const p1Text = scene.add.text(120, 550, 'JUGADOR 1', {
    fontFamily: 'Arial Black',
    fontSize: '16px',
    color: currentPlayer === 1 ? '#00FF00' : '#FFF'
  });
  p1Text.setOrigin(0.5);
  scene.time.delayedCall(16, () => p1Text.destroy());
  
  const p1Lives = scene.add.text(120, 570, '❤'.repeat(player1Lives) + '🖤'.repeat(3 - player1Lives), {
    fontSize: '18px'
  });
  p1Lives.setOrigin(0.5);
  scene.time.delayedCall(16, () => p1Lives.destroy());
  
  // Panel Jugador 2 (abajo derecha)
  const p2Panel = scene.add.rectangle(680, 560, 200, 50, 0x000000, 0.7);
  scene.time.delayedCall(16, () => p2Panel.destroy());
  
  const p2Text = scene.add.text(680, 550, 'JUGADOR 2', {
    fontFamily: 'Arial Black',
    fontSize: '16px',
    color: currentPlayer === 2 ? '#00FF00' : '#FFF'
  });
  p2Text.setOrigin(0.5);
  scene.time.delayedCall(16, () => p2Text.destroy());
  
  const p2Lives = scene.add.text(680, 570, '❤'.repeat(player2Lives) + '🖤'.repeat(3 - player2Lives), {
    fontSize: '18px'
  });
  p2Lives.setOrigin(0.5);
  scene.time.delayedCall(16, () => p2Lives.destroy());
  
  // Indicador de turno (centro de la pantalla, temporal)
  if (turnJustStarted) {
    const turnText = scene.add.text(400, 300, 'TURNO JUGADOR ' + currentPlayer, {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 6
    });
    turnText.setOrigin(0.5);
    scene.time.delayedCall(2000, () => {
      turnJustStarted = false;
      turnText.destroy();
    });
  }
}

// Música de fondo dinámica - Cambia según la velocidad
let musicLoopTimer = null;
let currentMusicSpeed = 'normal';
let selectedMelody = 0; // Melodía elegida para esta partida

// 4 melodías diferentes para variedad
const melodies = [
  // Melodía 1: Original (C-E-G-A)
  {
    normal: [
      { freq: 523, dur: 0.25 }, // C5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 784, dur: 0.25 }, // G5
      { freq: 880, dur: 0.25 }, // A5
      { freq: 784, dur: 0.25 }, // G5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 587, dur: 0.25 }, // D5
      { freq: 523, dur: 0.25 }, // C5
    ],
    fast: [
      { freq: 784, dur: 0.15 }, // G5
      { freq: 880, dur: 0.15 }, // A5
      { freq: 988, dur: 0.15 }, // B5
      { freq: 1047, dur: 0.15 }, // C6
      { freq: 988, dur: 0.15 }, // B5
      { freq: 1047, dur: 0.15 }, // C6
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 1047, dur: 0.15 }, // C6
    ]
  },
  // Melodía 2: Rock (A-D-E-A)
  {
    normal: [
      { freq: 440, dur: 0.25 }, // A4
      { freq: 587, dur: 0.25 }, // D5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 440, dur: 0.25 }, // A4
      { freq: 587, dur: 0.25 }, // D5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 587, dur: 0.25 }, // D5
      { freq: 523, dur: 0.25 }, // C5
    ],
    fast: [
      { freq: 880, dur: 0.15 }, // A5
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 1319, dur: 0.15 }, // E6
      { freq: 880, dur: 0.15 }, // A5
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 1319, dur: 0.15 }, // E6
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 1047, dur: 0.15 }, // C6
    ]
  },
  // Melodía 3: Épica (G-B-D-G)
  {
    normal: [
      { freq: 392, dur: 0.25 }, // G4
      { freq: 494, dur: 0.25 }, // B4
      { freq: 587, dur: 0.25 }, // D5
      { freq: 784, dur: 0.25 }, // G5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 587, dur: 0.25 }, // D5
      { freq: 494, dur: 0.25 }, // B4
      { freq: 392, dur: 0.25 }, // G4
    ],
    fast: [
      { freq: 784, dur: 0.15 }, // G5
      { freq: 988, dur: 0.15 }, // B5
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 1568, dur: 0.15 }, // G6
      { freq: 1319, dur: 0.15 }, // E6
      { freq: 1175, dur: 0.15 }, // D6
      { freq: 988, dur: 0.15 }, // B5
      { freq: 784, dur: 0.15 }, // G5
    ]
  },
  // Melodía 4: Electrónica (F-A-C-E)
  {
    normal: [
      { freq: 349, dur: 0.25 }, // F4
      { freq: 440, dur: 0.25 }, // A4
      { freq: 523, dur: 0.25 }, // C5
      { freq: 659, dur: 0.25 }, // E5
      { freq: 523, dur: 0.25 }, // C5
      { freq: 440, dur: 0.25 }, // A4
      { freq: 392, dur: 0.25 }, // G4
      { freq: 349, dur: 0.25 }, // F4
    ],
    fast: [
      { freq: 698, dur: 0.15 }, // F5
      { freq: 880, dur: 0.15 }, // A5
      { freq: 1047, dur: 0.15 }, // C6
      { freq: 1319, dur: 0.15 }, // E6
      { freq: 1047, dur: 0.15 }, // C6
      { freq: 880, dur: 0.15 }, // A5
      { freq: 784, dur: 0.15 }, // G5
      { freq: 698, dur: 0.15 }, // F5
    ]
  }
];

function startBackgroundMusic(sc) {
  if (!sc || !sc.sound || !sc.sound.context) return;
  const ctx = sc.sound.context;
  if (!ctx.createOscillator || !ctx.createGain) return;
  
  // Seleccionar melodía aleatoria al inicio
  const melody = melodies[selectedMelody];
  
  let currentTime = ctx.currentTime;
  
  const playLoop = () => {
    // Determinar qué melodía usar según la velocidad
    const speed = bike ? bike.vx : 100;
    const isFast = speed > 350;
    const notes = isFast ? melody.fast : melody.normal;
    const tempo = isFast ? 0.9 : 1;
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const adjustedDur = note.dur * tempo;
      const startTime = currentTime + i * adjustedDur;
      
      // Oscilador principal (melodía)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = note.freq;
      osc.type = isFast ? 'sawtooth' : 'square'; // Sonido más agresivo cuando va rápido
      const volume = isFast ? 0.12 : 0.1;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + adjustedDur);
      osc.start(startTime);
      osc.stop(startTime + adjustedDur);
      
      // Bajo (octava más baja) - más potente cuando va rápido
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.frequency.value = note.freq * 0.25;
      bass.type = 'sawtooth';
      const bassVol = isFast ? 0.1 : 0.08;
      bassGain.gain.setValueAtTime(bassVol, startTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + adjustedDur);
      bass.start(startTime);
      bass.stop(startTime + adjustedDur);
      
      // Armonía - más presente cuando va rápido
      if (i % 2 === 0 || isFast) {
        const harmony = ctx.createOscillator();
        const harmonyGain = ctx.createGain();
        harmony.connect(harmonyGain);
        harmonyGain.connect(ctx.destination);
        harmony.frequency.value = note.freq * 1.5;
        harmony.type = 'triangle';
        const harmVol = isFast ? 0.06 : 0.04;
        harmonyGain.gain.setValueAtTime(harmVol, startTime);
        harmonyGain.gain.exponentialRampToValueAtTime(0.001, startTime + adjustedDur);
        harmony.start(startTime);
        harmony.stop(startTime + adjustedDur);
      }
      
      // Percusión extra cuando va muy rápido
      if (isFast && i % 4 === 0) {
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.connect(kickGain);
        kickGain.connect(ctx.destination);
        kick.frequency.value = 60;
        kick.type = 'sine';
        kickGain.gain.setValueAtTime(0.15, startTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        kick.start(startTime);
        kick.stop(startTime + 0.1);
      }
    }
    
    currentTime += notes.length * notes[0].dur * tempo;
    musicLoopTimer = setTimeout(playLoop, notes.length * notes[0].dur * tempo * 1000);
  };
  
  playLoop();
}

// Detener música de fondo
function stopBackgroundMusic() {
  if (musicLoopTimer) {
    clearTimeout(musicLoopTimer);
    musicLoopTimer = null;
  }
}

// Sonido corto para jueces - tipo "tuuun"
function playJudgeSound(sc) {
  if (!sc || !sc.sound || !sc.sound.context) return;
  const ctx = sc.sound.context;
  if (!ctx.createOscillator || !ctx.createGain) return;
  
  const t0 = ctx.currentTime;
  
  // Sonido corto de campana/gong - "tuuun"
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // Frecuencia que baja ligeramente (efecto "tuuun")
  osc.frequency.setValueAtTime(800, t0);
  osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.15);
  
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.25, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
  
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

function drawBackground() {
    // Cielo
    const h = 600;
    
    // Sol/Luna según la hora del día
    if (timeOfDay === 'day') {
      // Sol brillante
      g.fillStyle(0xffdd44, 1);
      g.fillCircle(650, 80, 35);
      g.fillStyle(0xffee88, 0.3);
      g.fillCircle(650, 80, 50);
    } else if (timeOfDay === 'afternoon') {
      // Sol atardecer (más naranja y bajo)
      const sunY = 80 + (gameTime - dayDuration) / dayDuration * 100; // Baja el sol
      g.fillStyle(0xff8844, 0.9);
      g.fillCircle(650, sunY, 40);
      g.fillStyle(0xff9955, 0.3);
      g.fillCircle(650, sunY, 60);
    } else {
      // Luna y estrellas
      g.fillStyle(0xddddff, 0.9);
      g.fillCircle(650, 80, 30);
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(655, 75, 25); // Brillo
      
      // Estrellas titilantes
      drawStarsInSky();
    }
    
    // Nubes
    drawClouds();
    
    // Estructura del coliseo - Arcos en el fondo
    drawColiseum();
    
    // Montaña lejana (opcional, más sutil)
    const mountainAlpha = timeOfDay === 'night' ? 0.15 : 0.3;
    g.fillStyle(0x9ac4ff, mountainAlpha);
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= 800; x += 10) {
      const y = 420 + 25 * Math.sin((x + track.scroll * 0.1) * 0.002);
      g.lineTo(x, y);
    }
    g.lineTo(800, h);
    g.closePath();
    g.fillPath();
  }

// Estrellas en el cielo nocturno
function drawStarsInSky() {
  // Estrellas fijas basadas en posición (procedurales)
  for (let i = 0; i < 50; i++) {
    const x = (i * 167.3) % 800; // Posición pseudo-aleatoria pero consistente
    const y = (i * 89.7) % 300;
    const size = 1 + (i % 3);
    const twinkle = Math.sin(gameTime * 2 + i) * 0.3 + 0.7; // Titileo
    
    g.fillStyle(0xffffff, twinkle * 0.8);
    g.fillCircle(x, y, size);
  }
}

// Nubes y partículas de movimiento
function initClouds() {
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * 900,
      y: 80 + Math.random() * 120,
      size: 0.6 + Math.random() * 0.8,
      speed: 15 + Math.random() * 20
    });
  }
}

function updateClouds(s) {
  for (let cloud of clouds) {
    cloud.x -= cloud.speed * s;
    if (cloud.x < -100) {
      cloud.x = 900;
      cloud.y = 80 + Math.random() * 120;
    }
  }
}

function drawClouds() {
  for (let c of clouds) {
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(c.x, c.y, 22 * c.size);
    g.fillCircle(c.x - 18, c.y + 5, 16 * c.size);
    g.fillCircle(c.x + 18, c.y + 5, 18 * c.size);
    g.fillCircle(c.x - 8, c.y - 8, 14 * c.size);
    g.fillCircle(c.x + 8, c.y - 5, 16 * c.size);
  }
}

// Partículas de aire (líneas de velocidad)
function initAirParticles() {
  for (let i = 0; i < 25; i++) {
    airParticles.push({
      x: Math.random() * 800,
      y: 300 + Math.random() * 200,
      len: 10 + Math.random() * 20,
      speed: 200 + Math.random() * 150
    });
  }
}

function updateAirParticles(s) {
  const speedFactor = bike.speed / 180; // basado en velocidad de la moto
  for (let p of airParticles) {
    p.x -= p.speed * speedFactor * s;
    if (p.x < -50) {
      p.x = 850;
      p.y = 300 + Math.random() * 200;
    }
  }
}

function drawAirParticles() {
  const speed = bike.speed;
  const isTurbo = speed > 350; // Modo turbo
  
  // Transparencia aumenta con velocidad
  const alpha = Math.min(0.6, speed / 400);
  
  for (let p of airParticles) {
    // Color cambia según velocidad
    let color = 0xcccccc; // Gris normal
    let thickness = 2;
    
    if (isTurbo) {
      // Líneas más gruesas y coloridas en modo turbo
      color = speed > 450 ? 0xff6600 : 0xffaa00; // Naranja/rojo
      thickness = 3;
    }
    
    g.lineStyle(thickness, color, alpha);
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + p.len, p.y);
    g.strokePath();
    
    // Líneas extra en modo turbo para efecto más intenso
    if (isTurbo && Math.random() > 0.5) {
      g.lineStyle(1, 0xffffff, alpha * 0.5);
      g.beginPath();
      g.moveTo(p.x, p.y - 2);
      g.lineTo(p.x + p.len * 0.8, p.y - 2);
      g.strokePath();
    }
  }
}

function drawColiseum() {
  // Muro curvo del coliseo (izquierda)
  g.fillStyle(0xccaa88, 0.6);
  g.fillRect(0, 280, 180, 320);
  
  // Arcos izquierda (3 niveles)
  for (let level = 0; level < 3; level++) {
    const y = 300 + level * 60;
    for (let i = 0; i < 2; i++) {
      const x = 20 + i * 70;
      // Arco
      g.fillStyle(0x333333, 0.5);
      g.fillRect(x, y, 50, 50);
      // Marco del arco
      g.lineStyle(3, 0x998866, 1);
      g.strokeRect(x, y, 50, 50);
    }
  }
  
  // Muro curvo del coliseo (derecha)
  g.fillStyle(0xccaa88, 0.6);
  g.fillRect(620, 280, 180, 320);
  
  // Arcos derecha (3 niveles)
  for (let level = 0; level < 3; level++) {
    const y = 300 + level * 60;
    for (let i = 0; i < 2; i++) {
      const x = 640 + i * 70;
      // Arco
      g.fillStyle(0x333333, 0.5);
      g.fillRect(x, y, 50, 50);
      // Marco del arco
      g.lineStyle(3, 0x998866, 1);
      g.strokeRect(x, y, 50, 50);
    }
  }
  
  // Gradas con espectadores
  drawCrowd();
}

function drawCrowd() {
  // Espectadores en gradas izquierdas (más arriba, en los arcos)
  for (let i = 0; i < 60; i++) {
    const x = 15 + (i % 15) * 11;
    const y = 310 + Math.floor(i / 15) * 15;
    const col = Math.random() > 0.5 ? 0xff6644 : 0x4466ff;
    g.fillStyle(col, 0.7);
    g.fillCircle(x, y, 3);
  }
  
  // Espectadores en gradas derechas
  for (let i = 0; i < 60; i++) {
    const x = 645 + (i % 15) * 11;
    const y = 310 + Math.floor(i / 15) * 15;
    const col = Math.random() > 0.5 ? 0xff6644 : 0x4466ff;
    g.fillStyle(col, 0.7);
    g.fillCircle(x, y, 3);
  }
  
  // Banderas en el coliseo
  g.lineStyle(2, 0x8b4513, 1);
  g.beginPath();
  g.moveTo(30, 280);
  g.lineTo(30, 250);
  g.strokePath();
  g.fillStyle(0xff4444, 0.8);
  g.fillTriangle(30, 250, 30, 265, 50, 257);
  
  g.lineStyle(2, 0x8b4513, 1);
  g.beginPath();
  g.moveTo(750, 280);
  g.lineTo(750, 250);
  g.strokePath();
  g.fillStyle(0x4444ff, 0.8);
  g.fillTriangle(750, 250, 750, 265, 730, 257);
}

function drawTrack() {
  // Relleno inferior de pista - tierra
  g.fillStyle(0xc4905a, 0.7);
  g.beginPath();
  g.moveTo(0, 600);
  for (let x = 0; x <= 800; x += 6) g.lineTo(x, groundAt(x));
  g.lineTo(800, 600);
  g.closePath();
  g.fillPath();
  
  // Capa de tierra más oscura
  g.fillStyle(0xa67c52, 0.5);
  g.beginPath();
  g.moveTo(0, 600);
  for (let x = 0; x <= 800; x += 6) {
    const y = groundAt(x);
    g.lineTo(x, y + 10);
  }
  g.lineTo(800, 600);
  g.closePath();
  g.fillPath();

  // Línea de pista más gruesa - tierra compactada
  g.lineStyle(5, 0x8b6f47, 1);
  g.beginPath();
  for (let x = 0; x <= 800; x += 6) {
    const y = groundAt(x);
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  
  // Sombra en la línea
  g.lineStyle(2, 0x6b5537, 0.5);
  g.beginPath();
  for (let x = 0; x <= 800; x += 6) {
    const y = groundAt(x);
    if (x === 0) g.moveTo(x, y + 2); else g.lineTo(x, y + 2);
  }
  g.strokePath();

  // Pintar rampas con color definido y detalles
  for (let r of ramps) {
    const x0 = r.x - track.scroll;
    const x1 = x0 + r.w;
    if (x1 < -20 || x0 > 820) continue;
    const yb = track.base;
    const ya = yb - r.h;
    
    // Sombra de la rampa
    g.fillStyle(0x000000, 0.15);
    g.fillTriangle(x0 + 5, yb + 5, x1 + 5, ya + 5, x1 + 5, yb + 5);
    
    // Rampa principal
    g.fillStyle(0xffa000, 0.9);
    g.beginPath();
    g.moveTo(x0, yb);
    g.lineTo(x1, ya); // sube
    g.lineTo(x1, yb); // baja vertical
    g.closePath();
    g.fillPath();
    
    // Borde superior más destacado
    g.lineStyle(3, 0xffcc44, 1);
    g.beginPath();
    g.moveTo(x0, yb);
    g.lineTo(x1, ya);
    g.strokePath();
    
    // Borde oscuro
    g.lineStyle(2, 0xc66e00, 1);
    g.beginPath();
    g.moveTo(x0, yb);
    g.lineTo(x1, ya);
    g.lineTo(x1, yb);
    g.strokePath();
    
    // Detalles de soporte (líneas verticales)
    g.lineStyle(2, 0xaa7700, 0.6);
    for (let i = 0.2; i < 1; i += 0.3) {
      const xp = x0 + r.w * i;
      const yp = yb - r.h * i;
      g.beginPath();
      g.moveTo(xp, yp);
      g.lineTo(xp, yb);
      g.strokePath();
    }
    
    // Dibujar zona de aterrizaje si existe
    if (r.landingZone) {
      const lzX = r.landingZone.x - track.scroll;
      const lzW = r.landingZone.w;
      if (lzX + lzW > 0 && lzX < 800) {
        // Fondo verde brillante si no ha sido cobrado, amarillo si ya fue usado
        const lzColor = r.landingZone.collected ? 0x888888 : 0x00ff00;
        const lzAlpha = r.landingZone.collected ? 0.3 : 0.6;
        
        g.fillStyle(lzColor, lzAlpha);
        g.fillRect(lzX, yb - 8, lzW, 8);
        
        // Líneas diagonales (chevrons) para efecto visual
        g.lineStyle(2, 0xffff00, lzAlpha);
        for (let cx = 0; cx < lzW; cx += 15) {
          g.beginPath();
          g.moveTo(lzX + cx, yb - 8);
          g.lineTo(lzX + cx + 8, yb);
          g.strokePath();
        }
        
        // Borde de la zona
        g.lineStyle(2, 0xffffff, r.landingZone.collected ? 0.2 : 0.8);
        g.strokeRect(lzX, yb - 8, lzW, 8);
      }
    }
  }

  // Línea discontinua central estilo rally - color tierra clara
  g.fillStyle(0xddb88c, 0.7);
  const baseY = track.base - 6;
  for (let x = 0; x <= 840; x += 40) {
    g.fillRect(x, baseY, 20, 3);
  }
}

// Dibujar drones (obstáculos aéreos)
function drawDrones() {
  for (let d of drones) {
    const screenX = d.x - track.scroll;
    if (screenX < -50 || screenX > 850) continue; // Fuera de pantalla
    
    // Cuerpo del drone (negro/gris oscuro)
    g.fillStyle(0x333333, 1);
    g.fillRect(screenX - 15, d.y - 8, 30, 16);
    
    // Centro (luz LED roja)
    g.fillStyle(0xff0000, 1);
    g.fillCircle(screenX, d.y, 4);
    
    // Brazos del drone (4 brazos)
    g.lineStyle(3, 0x444444, 1);
    const armLen = 18;
    // Brazo superior izquierdo
    g.beginPath();
    g.moveTo(screenX, d.y);
    g.lineTo(screenX - armLen, d.y - armLen);
    g.strokePath();
    // Brazo superior derecho
    g.beginPath();
    g.moveTo(screenX, d.y);
    g.lineTo(screenX + armLen, d.y - armLen);
    g.strokePath();
    // Brazo inferior izquierdo
    g.beginPath();
    g.moveTo(screenX, d.y);
    g.lineTo(screenX - armLen, d.y + armLen);
    g.strokePath();
    // Brazo inferior derecho
    g.beginPath();
    g.moveTo(screenX, d.y);
    g.lineTo(screenX + armLen, d.y + armLen);
    g.strokePath();
    
    // Hélices (animadas) en cada extremo
    const propAngle = d.propPhase;
    const propLen = 8;
    
    // Hélice 1 (superior izquierda)
    drawPropeller(screenX - armLen, d.y - armLen, propAngle, propLen);
    // Hélice 2 (superior derecha)
    drawPropeller(screenX + armLen, d.y - armLen, propAngle, propLen);
    // Hélice 3 (inferior izquierda)
    drawPropeller(screenX - armLen, d.y + armLen, propAngle, propLen);
    // Hélice 4 (inferior derecha)
    drawPropeller(screenX + armLen, d.y + armLen, propAngle, propLen);
  }
}

// Dibujar una hélice de drone
function drawPropeller(x, y, angle, len) {
  g.lineStyle(2, 0x00aaff, 0.8);
  g.beginPath();
  g.moveTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  g.lineTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len);
  g.strokePath();
}

// Dibujar aros (bonus de puntos)
function drawHoops() {
  for (let h of hoops) {
    const screenX = h.x - track.scroll;
    if (screenX < -100 || screenX > 900) continue; // Fuera de pantalla
    
    // Poste de soporte (vertical)
    g.lineStyle(6, 0x666666, 1);
    g.beginPath();
    g.moveTo(screenX, h.y);
    g.lineTo(screenX, track.base);
    g.strokePath();
    
    // Base del poste
    g.fillStyle(0x555555, 1);
    g.fillRect(screenX - 12, track.base - 8, 24, 8);
    
    // Aro circular - diferente para aros especiales
    const isSpecial = h.isSpecial || false;
    let color, alpha, lineWidth;
    
    if (h.collected) {
      color = 0x00ff00; // Verde si ya pasó
      alpha = 0.5;
      lineWidth = 8;
    } else if (isSpecial) {
      color = 0xff00ff; // Magenta para aros especiales (más puntos)
      alpha = 1;
      lineWidth = 10; // Más grueso
    } else {
      color = 0xffaa00; // Naranja para aros normales
      alpha = 1;
      lineWidth = 8;
    }
    
    g.lineStyle(lineWidth, color, alpha);
    g.strokeCircle(screenX, h.y, h.radius);
    
    // Círculo interior (área de bonus) - con efecto pulsante para especiales
    if (!h.collected) {
      const innerAlpha = isSpecial ? 0.5 + Math.sin(Date.now() / 200) * 0.2 : 0.3;
      g.lineStyle(2, 0xffff00, innerAlpha);
      g.strokeCircle(screenX, h.y, h.radius - 10);
    }
    
    // Indicador de puntos
    if (!h.collected) {
      const points = h.points || 500;
      const fontSize = isSpecial ? '20px' : '16px';
      const textColor = isSpecial ? '#FF00FF' : '#FFD700';
      
      const bonusText = scene.add.text(screenX, h.y, '+' + points, {
        fontFamily: 'Arial',
        fontSize: fontSize,
        color: textColor,
        stroke: '#000',
        strokeThickness: 3
      });
      bonusText.setOrigin(0.5);
      scene.time.delayedCall(16, () => bonusText.destroy());
    }
  }
}

function drawSpikes() {
  for (let sp of spikes) {
    const screenX = sp.x - track.scroll;
    if (screenX < -100 || screenX > 900) continue; // Fuera de pantalla
    
    const spikeHeight = 20; // Altura de las púas
    const spikeBase = track.base;
    const spikeTop = spikeBase - spikeHeight;
    const halfWidth = sp.w / 2;
    
    // Dibujar púas triangulares en gris oscuro/plateado
    g.fillStyle(0x555555, 1);
    g.lineStyle(2, 0x333333, 1);
    
    // Dibujar varios picos en el ancho de la púa
    const numPeaks = Math.floor(sp.w / 8); // Un pico cada 8px
    for (let i = 0; i < numPeaks; i++) {
      const peakX = screenX - halfWidth + (i * sp.w / numPeaks) + (sp.w / numPeaks / 2);
      
      // Triángulo
      g.beginPath();
      g.moveTo(peakX - 4, spikeBase); // Base izquierda
      g.lineTo(peakX, spikeTop); // Punta
      g.lineTo(peakX + 4, spikeBase); // Base derecha
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
  }
}

// Dibujar obstáculos en el suelo
function drawObstacles() {
  for (let o of obstacles) {
    const screenX = o.x - track.scroll;
    if (screenX + o.w < -50 || screenX > 850) continue; // Fuera de pantalla
    
    const obstY = track.base - o.h;
    
    if (o.type === 'car') {
      // Dibujar un carro simple
      // Carrocería
      g.fillStyle(0x4444ff, 1);
      g.fillRect(screenX, obstY, o.w, o.h * 0.6);
      
      // Techo
      g.fillStyle(0x6666ff, 1);
      g.fillRect(screenX + o.w * 0.2, obstY - o.h * 0.4, o.w * 0.6, o.h * 0.4);
      
      // Ventanas
      g.fillStyle(0x88ccff, 0.7);
      g.fillRect(screenX + o.w * 0.25, obstY - o.h * 0.35, o.w * 0.2, o.h * 0.25);
      g.fillRect(screenX + o.w * 0.55, obstY - o.h * 0.35, o.w * 0.2, o.h * 0.25);
      
      // Ruedas
      g.fillStyle(0x222222, 1);
      const wheelR = o.h * 0.25;
      g.fillCircle(screenX + o.w * 0.25, track.base, wheelR);
      g.fillCircle(screenX + o.w * 0.75, track.base, wheelR);
    } else {
      // Plataforma elevada (tipo rampa plana)
      g.fillStyle(0x8b4513, 1); // Marrón
      g.fillRect(screenX, obstY, o.w, o.h);
      
      // Borde superior más claro
      g.fillStyle(0xa0522d, 1);
      g.fillRect(screenX, obstY, o.w, 4);
      
      // Líneas de textura
      g.lineStyle(1, 0x654321, 0.5);
      for (let i = 0; i < 3; i++) {
        const y = obstY + (i + 1) * (o.h / 4);
        g.beginPath();
        g.moveTo(screenX, y);
        g.lineTo(screenX + o.w, y);
        g.strokePath();
      }
    }
  }
}

function drawBike() {
    const y = bike.y;
    const ang = bike.ang;
    const r = 14;
    const wheelBase = 52;
    const front = { x: bike.x + Math.cos(ang) * wheelBase * 0.5, y: y + Math.sin(ang) * wheelBase * 0.5 };
    const back = { x: bike.x - Math.cos(ang) * wheelBase * 0.5, y: y - Math.sin(ang) * wheelBase * 0.5 };
    
    // Ruedas con llanta
    g.fillStyle(0x222222, 1);
    g.fillCircle(front.x, front.y, r);
    g.fillCircle(back.x, back.y, r);
    // Rin interior (plateado)
    g.fillStyle(0xaaaaaa, 1);
    g.fillCircle(front.x, front.y, r * 0.5);
    g.fillCircle(back.x, back.y, r * 0.5);
    
    // Chasis de la moto (marco)
    g.lineStyle(7, 0xff3333, 1); // rojo brillante
    g.beginPath(); 
    g.moveTo(back.x, back.y); 
    g.lineTo(front.x, front.y); 
    g.strokePath();
    
    // Tubo del asiento
    const seatX = (back.x + front.x) * 0.5;
    const seatY = (back.y + front.y) * 0.5 - 15;
    g.lineStyle(6, 0xff3333, 1);
    g.beginPath();
    g.moveTo(back.x, back.y);
    g.lineTo(seatX, seatY);
    g.strokePath();
    
    // Asiento
    g.fillStyle(0x333333, 1);
    const seatLen = 18;
    g.fillRect(seatX - seatLen * 0.5, seatY - 3, seatLen, 6);
    
    // Manillar
    const handleX = front.x;
    const handleY = front.y - 10;
    g.lineStyle(4, 0x888888, 1);
    g.beginPath();
    g.moveTo(front.x, front.y);
    g.lineTo(handleX, handleY);
    g.strokePath();
    g.lineStyle(3, 0x888888, 1);
    g.beginPath();
    g.moveTo(handleX - 8, handleY);
    g.lineTo(handleX + 8, handleY);
    g.strokePath();
    
    // Piloto con rotación en el aire
    const riderAng = bike.air ? ang : 0; // El piloto rota con la moto solo en el aire
    drawRider(seatX, seatY - 20, riderAng, handleX, handleY);

    // Efecto turbo mejorado
    drawBoostEffect(back.x, back.y, ang);
  }

function drawRider(cx, cy, riderAng, handleX, handleY) {
  // Rotar el piloto según el ángulo
  const cosA = Math.cos(riderAng);
  const sinA = Math.sin(riderAng);
  
  // Función helper para rotar puntos
  const rotate = (x, y) => ({
    x: cx + (x * cosA - y * sinA),
    y: cy + (x * sinA + y * cosA)
  });
  
  // PIERNAS (dibujar primero para que estén detrás)
  const legL1 = rotate(-5, 26);
  const legL2 = rotate(-7, 42);
  const legR1 = rotate(5, 26);
  const legR2 = rotate(7, 42);
  
  // Pantalones (azul oscuro)
  g.lineStyle(7, 0x1a1a3a, 1);
  g.beginPath();
  g.moveTo(legL1.x, legL1.y);
  g.lineTo(legL2.x, legL2.y);
  g.strokePath();
  g.beginPath();
  g.moveTo(legR1.x, legR1.y);
  g.lineTo(legR2.x, legR2.y);
  g.strokePath();
  
  // Botas (negras)
  g.fillStyle(0x000000, 1);
  g.fillCircle(legL2.x, legL2.y, 4);
  g.fillCircle(legR2.x, legR2.y, 4);
  
  // CUERPO (torso con chaqueta de cuero)
  const bodyCorners = [
    rotate(-9, 8), rotate(9, 8), rotate(9, 28), rotate(-9, 28)
  ];
  
  // Chaqueta de cuero (negro con detalles)
  g.fillStyle(0x1a1a1a, 1);
  g.beginPath();
  g.moveTo(bodyCorners[0].x, bodyCorners[0].y);
  for (let i = 1; i < bodyCorners.length; i++) {
    g.lineTo(bodyCorners[i].x, bodyCorners[i].y);
  }
  g.closePath();
  g.fillPath();
  
  // Detalles de la chaqueta (cremallera y líneas)
  g.lineStyle(2, 0xff3333, 0.8);
  const zipTop = rotate(0, 8);
  const zipBot = rotate(0, 28);
  g.beginPath();
  g.moveTo(zipTop.x, zipTop.y);
  g.lineTo(zipBot.x, zipBot.y);
  g.strokePath();
  
  // Líneas laterales de la chaqueta
  g.lineStyle(1, 0x444444, 1);
  g.beginPath();
  g.moveTo(rotate(-7, 10).x, rotate(-7, 10).y);
  g.lineTo(rotate(-7, 26).x, rotate(-7, 26).y);
  g.strokePath();
  g.beginPath();
  g.moveTo(rotate(7, 10).x, rotate(7, 10).y);
  g.lineTo(rotate(7, 26).x, rotate(7, 26).y);
  g.strokePath();
  
  // BRAZOS (con mangas de chaqueta)
  const armL1 = rotate(-7, 12);
  const armL2 = rotate(-16, 28);
  const armR1 = rotate(7, 12);
  const armR2 = rotate(16, 28);
  
  // Mangas de chaqueta (negras)
  g.lineStyle(6, 0x1a1a1a, 1);
  g.beginPath();
  g.moveTo(armL1.x, armL1.y);
  g.lineTo(armL2.x, armL2.y);
  g.strokePath();
  g.beginPath();
  g.moveTo(armR1.x, armR1.y);
  g.lineTo(armR2.x, armR2.y);
  g.strokePath();
  
  // Guantes (rojos)
  g.fillStyle(0xff3333, 1);
  g.fillCircle(armL2.x, armL2.y, 4);
  g.fillCircle(armR2.x, armR2.y, 4);
  
  // Detalles de guantes (dedos/líneas)
  g.lineStyle(1, 0xaa0000, 1);
  const gloveL = rotate(-16, 28);
  const gloveR = rotate(16, 28);
  g.beginPath();
  g.moveTo(gloveL.x - 2, gloveL.y);
  g.lineTo(gloveL.x + 2, gloveL.y);
  g.strokePath();
  g.beginPath();
  g.moveTo(gloveR.x - 2, gloveR.y);
  g.lineTo(gloveR.x + 2, gloveR.y);
  g.strokePath();
  
  // CASCO (más detallado)
  const helmetPos = rotate(0, 0);
  
  // Base del casco (azul metálico con gradiente simulado)
  g.fillStyle(0x0066ff, 1);
  g.fillCircle(helmetPos.x, helmetPos.y, 9);
  
  // Brillo superior del casco
  const shinePos = rotate(-2, -3);
  g.fillStyle(0x66aaff, 0.6);
  g.fillCircle(shinePos.x, shinePos.y, 3);
  
  // Visera (negra con reflejo)
  const visorPos = rotate(6, 0);
  g.fillStyle(0x000000, 0.9);
  g.fillEllipse(visorPos.x, visorPos.y, 5, 3);
  
  // Reflejo en la visera
  const visorShine = rotate(7, -1);
  g.fillStyle(0x6699ff, 0.4);
  g.fillEllipse(visorShine.x, visorShine.y, 2, 1);
  
  // Franja decorativa del casco
  g.lineStyle(2, 0xff3333, 1);
  const stripeL = rotate(-4, 2);
  const stripeR = rotate(4, 2);
  g.beginPath();
  g.moveTo(stripeL.x, stripeL.y);
  g.lineTo(stripeR.x, stripeR.y);
  g.strokePath();
  
  // Ventilación del casco (detalles pequeños)
  g.fillStyle(0x333333, 1);
  const ventPos1 = rotate(2, 5);
  const ventPos2 = rotate(4, 6);
  g.fillCircle(ventPos1.x, ventPos1.y, 1);
  g.fillCircle(ventPos2.x, ventPos2.y, 1);
}

function drawBoostEffect(x, y, ang) {
  const isBoosting = bike.boostT > 0 || bike.speed > 300;
  if (!isBoosting) return;
  
  const intensity = bike.boostT > 0 ? bike.boostT / 0.25 : (bike.speed - 300) / 120;
  const baseX = x - Math.cos(ang) * 15;
  const baseY = y - Math.sin(ang) * 15;
  
  // Llamas de colores (naranja, amarillo, rojo)
  const flames = [
    { color: 0xff4400, len: 35, width: 4, alpha: 0.9 },
    { color: 0xffaa00, len: 28, width: 3, alpha: 0.8 },
    { color: 0xffff00, len: 20, width: 2, alpha: 0.7 },
  ];
  
  for (let flame of flames) {
    const len = flame.len * intensity;
    g.lineStyle(flame.width, flame.color, flame.alpha);
    
    // Múltiples líneas onduladas para efecto de fuego
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 4;
      const perpX = -Math.sin(ang) * offset;
      const perpY = Math.cos(ang) * offset;
      
      g.beginPath();
      g.moveTo(baseX + perpX, baseY + perpY);
      
      // Línea ondulada
      for (let j = 0; j <= len; j += 5) {
        const wave = Math.sin(j * 0.3 + Date.now() * 0.01) * 3;
        const px = baseX + perpX - Math.cos(ang) * j + Math.sin(ang) * wave;
        const py = baseY + perpY - Math.sin(ang) * j - Math.cos(ang) * wave;
        g.lineTo(px, py);
      }
      g.strokePath();
    }
  }
  
  // Partículas brillantes
  if (bike.boostT > 0) {
    for (let i = 0; i < 5; i++) {
      const dist = 15 + Math.random() * 25;
      const spread = (Math.random() - 0.5) * 15;
      const px = baseX - Math.cos(ang) * dist + Math.sin(ang) * spread;
      const py = baseY - Math.sin(ang) * dist - Math.cos(ang) * spread;
      const size = 2 + Math.random() * 3;
      g.fillStyle(0xffff88, 0.8);
      g.fillCircle(px, py, size);
    }
  }
}

function drawGameOver() {
    g.fillStyle(0x000000, 0.6);
    g.fillRect(0, 0, 800, 600);
    const t = 'CRASH! Pulsa R para reiniciar';
    g.lineStyle(0, 0, 0);
    const overlay = game.scene.scenes[0].add.text(400, 300, t, { fontFamily: 'monospace', fontSize: '28px', color: '#fff' });
    overlay.setOrigin(0.5);
    // quitar el texto en el siguiente frame de draw para no crear múltiples
    game.scene.scenes[0].time.delayedCall(16, () => overlay.destroy());
  }

function handleRestart(scene) {
    if (Phaser.Input.Keyboard.JustDown(keyR) && gameOver) {
      if (gameMode === '1v1') {
        // En modo 1v1, ya se maneja en handleGameOver
        return;
      }
      // reset rápido para competición
      resetGameState();
      gameOver = false;
    }
  }

  // Sonido simple, sin try/catch
function beep(scene, f, d) {
    if (!scene || !scene.sound || !scene.sound.context) return;
    const ctx = scene.sound.context;
    if (!ctx.createOscillator || !ctx.createGain) return;
    const o = ctx.createOscillator();
    const gnode = ctx.createGain();
    o.connect(gnode); gnode.connect(ctx.destination);
    o.frequency.value = f; o.type = 'sine';
    const t = ctx.currentTime; gnode.gain.setValueAtTime(0.1, t); gnode.gain.exponentialRampToValueAtTime(0.01, t + d);
    o.start(t); o.stop(t + d);
  }

// Eliminar código residual del juego anterior (archery) - mantenido vacío para evitar referencias
function resetGame() {
  // No-op: función mantenida para compatibilidad; el reinicio real se maneja en handleRestart
}