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
let curs;
let keyBoost;
let keyR;
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
// Rampas
let ramps = [];
let nextRampWX = 600; // próxima rampa en coordenadas de mundo (x + scroll)
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
  
  // Teclas para navegación de nombre
  keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  
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
  applyBoost.call(this, s);
  physicsStep(s);
  scoringStep.call(this, s);
  updateFloatingTexts(s);
  updateJudgeScores(s);
  updateClouds(s);
  updateAirParticles(s);
  updateTrickEffects(s);
  updateHUD();
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
  resetGameState();
  txt.setVisible(true);
  speedTxt.setVisible(true);
}

function start1v1Mode() {
  gameState = '1v1';
  gameMode = '1v1';
  player1Score = 0;
  player2Score = 0;
  player1Lives = 3;
  player2Lives = 3;
  currentPlayer = 1;
  turnJustStarted = true;
  resetGameState();
  txt.setVisible(true);
  speedTxt.setVisible(true);
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
  track.scroll = 0;
  ramps = [];
  nextRampWX = 600;
  floatingTexts = [];
  judgeScores = [];
  trickEffects = [];
  txt.setText('PUNTOS: 0');
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
  
  // X: avanzar letra (A->B->C...->Z->A)
  if (Phaser.Input.Keyboard.JustDown(keyX)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789';
    const currentChar = nameChars[currentCharIndex];
    const currentIndex = alphabet.indexOf(currentChar);
    const nextIndex = (currentIndex + 1) % alphabet.length;
    nameChars[currentCharIndex] = alphabet[nextIndex];
    playerName = nameChars.join('');
    beep(scene, 800, 0.05);
  }
  
  // Z: retroceder letra (Z->Y->X...->A->Z)
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
  }
}

function handle1v1EndInput() {
  if (Phaser.Input.Keyboard.JustDown(keyEnter)) {
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
  if (!txt || !speedTxt) return;
  
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
}

function scoringStep(s) {
    // Aire = puntos por tiempo en el aire
    if (bike.air) {
      score += Math.floor(10 * s);
      // Flips completos
      bike.flipA += bike.vang * s;
      const full = Math.floor(Math.abs(bike.flipA) / (Math.PI * 2));
      if (full > bike.flips) {
        bike.flips = full;
        const pts = 150;
        score += pts;
        showFloatingText('+' + pts, bike.x, bike.y - 40);
        txt.setText('PUNTOS: ' + score);
        beep(this, 880, 0.08);
      }
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
  
  // Verificar que las teclas estén presionadas (simplificado para detección)
  const jDown = keyJ.isDown;
  const kDown = keyK.isDown;
  const lDown = keyL.isDown;
  const uDown = keyU.isDown;
  const iDown = keyI.isDown;
  
  // Combo 1: J+K = "Superman" (brazos extendidos)
  if (jDown && kDown && !lDown && !uDown && !iDown) {
    trickName = 'SUPERMAN!';
    trickPoints = 250;
    trickColor = 0xff0000;
    trickPose = 'superman';
    bike.trickCooldown = 1.5;
  }
  // Combo 2: K+L = "No Hander" (sin manos)
  else if (!jDown && kDown && lDown && !uDown && !iDown) {
    trickName = 'NO HANDER!';
    trickPoints = 200;
    trickColor = 0x00ff00;
    trickPose = 'nohander';
    bike.trickCooldown = 1.5;
  }
  // Combo 3: J+L = "Can Can" (pierna al lado)
  else if (jDown && !kDown && lDown && !uDown && !iDown) {
    trickName = 'CAN CAN!';
    trickPoints = 220;
    trickColor = 0x00ffff;
    trickPose = 'cancan';
    bike.trickCooldown = 1.5;
  }
  // Combo 4: U+I = "Bar Hop" (salto sobre manubrio)
  else if (!jDown && !kDown && !lDown && uDown && iDown) {
    trickName = 'BAR HOP!';
    trickPoints = 280;
    trickColor = 0xff00ff;
    trickPose = 'barhop';
    bike.trickCooldown = 1.5;
  }
  // Combo 5: J+U = "Nac Nac" (pierna cruzada)
  else if (jDown && !kDown && !lDown && uDown && !iDown) {
    trickName = 'NAC NAC!';
    trickPoints = 240;
    trickColor = 0xffff00;
    trickPose = 'nacnac';
    bike.trickCooldown = 1.5;
  }
  
  if (trickName) {
    score += trickPoints;
    bike.lastTrick = trickPose; // guardar pose para visualización
    showFloatingText('+' + trickPoints + ' ' + trickName, bike.x, bike.y - 60);
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
      // buen aterrizaje: bonus por flips acumulados
      const pts = bike.flips * 200;
      score += pts;
      showFloatingText('+' + pts, bike.x, bike.y - 40);
      showJudgeScores(bike.flips);
      playJudgeSound(this); // Sonido corto "tuuun" para los jueces
      playApplause(this);
      beep(this, 980, 0.12);
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
    ramps.push({ x: nextRampWX, w, h });
    nextRampWX += 700 + Math.random() * 900;
  }
  // limpiar rampas muy atrás
  const leftWX = track.scroll - 200;
  ramps = ramps.filter(r => r.x + r.w > leftWX);
}

function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function normalizeAngle(a) { a = wrapAngle(a); return a; }

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
    drawTrack();
    drawBike();
    drawTrickEffects(); // efectos visuales de acrobacias
    drawFloatingTexts();
    drawJudgeScores();
    draw1v1HUD(); // HUD específico para 1v1
    if (gameOver) drawGameOver();
  }

function drawMenu() {
  if (!g || !scene) return;
  g.clear();
  
  // Fondo degradado
  g.fillGradientStyle(0x0066cc, 0x0066cc, 0x003366, 0x003366, 1);
  g.fillRect(0, 0, 800, 600);
  
  // Título principal
  const title = scene.add.text(400, 120, 'BROKE BONEZ', {
    fontFamily: 'Arial Black',
    fontSize: '72px',
    color: '#FFD700',
    stroke: '#000',
    strokeThickness: 8
  });
  title.setOrigin(0.5);
  scene.time.delayedCall(16, () => title.destroy());
  
  // Subtítulo
  const subtitle = scene.add.text(400, 200, 'EXTREME STUNTS', {
    fontFamily: 'Arial',
    fontSize: '24px',
    color: '#FFF',
    stroke: '#000',
    strokeThickness: 3
  });
  subtitle.setOrigin(0.5);
  scene.time.delayedCall(16, () => subtitle.destroy());
  
  // Opción 1: Competición
  g.fillStyle(0xff6600, 1);
  g.fillRoundedRect(200, 280, 400, 80, 20);
  g.lineStyle(4, 0xffaa00, 1);
  g.strokeRoundedRect(200, 280, 400, 80, 20);
  
  const opt1 = scene.add.text(400, 310, '[1] COMPETICIÓN (1 JUGADOR)', {
    fontFamily: 'Arial Black',
    fontSize: '24px',
    color: '#FFF',
    stroke: '#000',
    strokeThickness: 4
  });
  opt1.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt1.destroy());
  
  const opt1desc = scene.add.text(400, 345, '1 vida - Top 10 - Máxima puntuación', {
    fontFamily: 'Arial',
    fontSize: '14px',
    color: '#FFD700'
  });
  opt1desc.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt1desc.destroy());
  
  // Opción 2: 1vs1
  g.fillStyle(0x0099ff, 1);
  g.fillRoundedRect(200, 400, 400, 80, 20);
  g.lineStyle(4, 0x00ccff, 1);
  g.strokeRoundedRect(200, 400, 400, 80, 20);
  
  const opt2 = scene.add.text(400, 430, '[2] 1 VS 1', {
    fontFamily: 'Arial Black',
    fontSize: '24px',
    color: '#FFF',
    stroke: '#000',
    strokeThickness: 4
  });
  opt2.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt2.destroy());
  
  const opt2desc = scene.add.text(400, 465, '3 vidas cada uno - El mejor gana', {
    fontFamily: 'Arial',
    fontSize: '14px',
    color: '#FFD700'
  });
  opt2desc.setOrigin(0.5);
  scene.time.delayedCall(16, () => opt2desc.destroy());
  
  // Instrucciones
  const inst = scene.add.text(400, 550, 'Presiona 1 o 2 para seleccionar modo', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#FFF',
    stroke: '#000',
    strokeThickness: 2
  });
  inst.setOrigin(0.5);
  scene.time.delayedCall(16, () => inst.destroy());
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
  const controls = scene.add.text(400, 480, '← → Mover | X Subir letra | Z Bajar letra', {
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
  
  const title = scene.add.text(400, 50, 'TOP 10 - MEJORES PILOTOS', {
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
      const y = 130 + i * 42;
      const entry = leaderboard[i];
      
      const isHighlighted = entry.name === playerName && entry.score === score;
      const bgColor = isHighlighted ? 0xFFD700 : (i % 2 === 0 ? 0x1a1a3a : 0x0d0d1f);
      const textColor = isHighlighted ? '#000' : '#FFF';
      const scoreColor = isHighlighted ? '#000' : '#FFD700';
      
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(150, y - 18, 500, 36, 8);
      
      const pos = scene.add.text(180, y, (i + 1) + '.', {
        fontFamily: 'Arial Black',
        fontSize: '22px',
        color: textColor
      });
      scene.time.delayedCall(16, () => pos.destroy());
      
      const name = scene.add.text(240, y, entry.name, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: textColor,
        stroke: '#000',
        strokeThickness: 2
      });
      scene.time.delayedCall(16, () => name.destroy());
      
      const pts = scene.add.text(600, y, entry.score.toString(), {
        fontFamily: 'Arial Black',
        fontSize: '22px',
        color: scoreColor
      });
      pts.setOrigin(1, 0);
      scene.time.delayedCall(16, () => pts.destroy());
    }
  }
  
  const inst = scene.add.text(400, 560, 'Presiona ENTER para volver al menú', {
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
  
  const p1Panel = scene.add.rectangle(120, 70, 200, 50, 0x000000, 0.7);
  scene.time.delayedCall(16, () => p1Panel.destroy());
  
  const p1Text = scene.add.text(120, 60, 'JUGADOR 1', {
    fontFamily: 'Arial Black',
    fontSize: '16px',
    color: currentPlayer === 1 ? '#00FF00' : '#FFF'
  });
  p1Text.setOrigin(0.5);
  scene.time.delayedCall(16, () => p1Text.destroy());
  
  const p1Lives = scene.add.text(120, 80, '❤'.repeat(player1Lives) + '🖤'.repeat(3 - player1Lives), {
    fontSize: '18px'
  });
  p1Lives.setOrigin(0.5);
  scene.time.delayedCall(16, () => p1Lives.destroy());
  
  const p2Panel = scene.add.rectangle(680, 70, 200, 50, 0x000000, 0.7);
  scene.time.delayedCall(16, () => p2Panel.destroy());
  
  const p2Text = scene.add.text(680, 60, 'JUGADOR 2', {
    fontFamily: 'Arial Black',
    fontSize: '16px',
    color: currentPlayer === 2 ? '#00FF00' : '#FFF'
  });
  p2Text.setOrigin(0.5);
  scene.time.delayedCall(16, () => p2Text.destroy());
  
  const p2Lives = scene.add.text(680, 80, '❤'.repeat(player2Lives) + '🖤'.repeat(3 - player2Lives), {
    fontSize: '18px'
  });
  p2Lives.setOrigin(0.5);
  scene.time.delayedCall(16, () => p2Lives.destroy());
  
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

function startBackgroundMusic(sc) {
  if (!sc || !sc.sound || !sc.sound.context) return;
  const ctx = sc.sound.context;
  if (!ctx.createOscillator || !ctx.createGain) return;
  
  // Melodía normal (velocidad baja/media)
  const normalNotes = [
    { freq: 523, dur: 0.25 }, // C5
    { freq: 659, dur: 0.25 }, // E5
    { freq: 784, dur: 0.25 }, // G5
    { freq: 880, dur: 0.25 }, // A5
    { freq: 784, dur: 0.25 }, // G5
    { freq: 659, dur: 0.25 }, // E5
    { freq: 587, dur: 0.25 }, // D5
    { freq: 523, dur: 0.25 }, // C5
  ];
  
  // Melodía rápida e intensa (alta velocidad)
  const fastNotes = [
    { freq: 784, dur: 0.15 }, // G5
    { freq: 880, dur: 0.15 }, // A5
    { freq: 988, dur: 0.15 }, // B5
    { freq: 1047, dur: 0.15 }, // C6
    { freq: 988, dur: 0.15 }, // B5
    { freq: 1047, dur: 0.15 }, // C6
    { freq: 1175, dur: 0.15 }, // D6
    { freq: 1047, dur: 0.15 }, // C6
    { freq: 988, dur: 0.15 }, // B5
    { freq: 880, dur: 0.15 }, // A5
    { freq: 988, dur: 0.15 }, // B5
    { freq: 784, dur: 0.15 }, // G5
  ];
  
  let currentTime = ctx.currentTime;
  
  const playLoop = () => {
    // Determinar qué melodía usar según la velocidad
    const speed = bike ? bike.vx : 100;
    const isFast = speed > 350;
    const notes = isFast ? fastNotes : normalNotes;
    const tempo = isFast ? 0.9 : 1.0; // Más rápido cuando va rápido
    
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
    
    // Sol
    g.fillStyle(0xffdd44, 1);
    g.fillCircle(650, 80, 35);
    g.fillStyle(0xffee88, 0.3);
    g.fillCircle(650, 80, 50);
    
    // Nubes
    drawClouds();
    
    // Estructura del coliseo - Arcos en el fondo
    drawColiseum();
    
    // Montaña lejana (opcional, más sutil)
    g.fillStyle(0x9ac4ff, 0.3);
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
  }

  // Línea discontinua central estilo rally - color tierra clara
  g.fillStyle(0xddb88c, 0.7);
  const baseY = track.base - 6;
  for (let x = 0; x <= 840; x += 40) {
    g.fillRect(x, baseY, 20, 3);
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
  
  // Casco con visera (orientación)
  const helmetPos = rotate(0, 0);
  g.fillStyle(0x0066cc, 1); // casco azul
  g.fillCircle(helmetPos.x, helmetPos.y, 8);
  
  // Visera (frente del casco) - apunta hacia adelante relativo al piloto
  const visorPos = rotate(5, 0);
  g.fillStyle(0x333333, 0.7);
  g.fillCircle(visorPos.x, visorPos.y, 4);
  
  // Cuerpo del piloto (camiseta) - rectángulo rotado
  const bodyCorners = [
    rotate(-8, 8), rotate(8, 8), rotate(8, 26), rotate(-8, 26)
  ];
  g.fillStyle(0xffcc00, 1); // amarillo
  g.beginPath();
  g.moveTo(bodyCorners[0].x, bodyCorners[0].y);
  for (let i = 1; i < bodyCorners.length; i++) {
    g.lineTo(bodyCorners[i].x, bodyCorners[i].y);
  }
  g.closePath();
  g.fillPath();
  
  // Brazos extendidos
  const armL1 = rotate(-6, 10);
  const armL2 = rotate(-15, 25);
  const armR1 = rotate(6, 10);
  const armR2 = rotate(15, 25);
  
  g.lineStyle(5, 0xffd19c, 1);
  g.beginPath();
  g.moveTo(armL1.x, armL1.y);
  g.lineTo(armL2.x, armL2.y);
  g.strokePath();
  g.beginPath();
  g.moveTo(armR1.x, armR1.y);
  g.lineTo(armR2.x, armR2.y);
  g.strokePath();
  
  // Piernas
  const legL1 = rotate(-4, 26);
  const legL2 = rotate(-6, 40);
  const legR1 = rotate(4, 26);
  const legR2 = rotate(6, 40);
  
  g.lineStyle(5, 0x0033aa, 1);
  g.beginPath();
  g.moveTo(legL1.x, legL1.y);
  g.lineTo(legL2.x, legL2.y);
  g.strokePath();
  g.beginPath();
  g.moveTo(legR1.x, legR1.y);
  g.lineTo(legR2.x, legR2.y);
  g.strokePath();
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