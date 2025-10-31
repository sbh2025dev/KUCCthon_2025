// Initialize the map
let map;
let marker;
let accuracyCircle;

// --- [수정됨] Game variables ---
let playerSnake = []; // 'snake'에서 'playerSnake'로 이름 변경
let playerSnakePolyline = null; // 'snakePolyline'에서 이름 변경
let playerSnakeCircles = []; // 'snakeCircles'에서 이름 변경
let bots = []; // AI 봇들을 저장할 배열
let foodItems = [];
let score = 0;
let gameActive = false;
let mouseTarget = null; // 플레이어 뱀의 목표 (GPS)
let animationFrame = null;
// --- [수정 끝] ---

// Game configuration
const INITIAL_SNAKE_LENGTH = 5;
const SNAKE_SPEED = 0.000008; // (롤백된) 고정 속도
const SNAKE_SEGMENT_DISTANCE = 0.000005; // distance between segments
const FOOD_COUNT = 200;
const SNAKE_WIDTH = 10;
const SNAKE_HEAD_RADIUS = 5;
const FOOD_RADIUS = 10;
const MAP_ZOOM = 17;

// --- [추가됨] Bot configuration ---
const BOT_NUM = 1; // 화면에 유지할 봇의 수
const BOT_COLOR = "#00ff00"; // 봇 색상 (초록색)
const BOT_SPEED = 0.000004; // 봇 이동 속도 (플레이어보다 느리게)
const BOT_FOOD_DROP_COUNT = 5; // 봇 사망 시 드랍할 음식 수
const COLLISION_DISTANCE = 0.000008; // 충돌 감지 거리
// --- [추가 끝] ---

// Moving average configuration for GPS smoothing
const GPS_SMOOTHING_WINDOW = 5; // (기존 5에서 3으로 수정됨 - 반응 속도 향상)
let latReadings = [];
let lngReadings = [];

// Color palette for snake
const SNAKE_COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#4facfe",
  "#00f2fe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];
let currentSnakeColor = "#ff0000";

// Initialize map with a default view
function initMap(lat = 37.7749, lng = -122.4194, zoom = MAP_ZOOM) {
  if (!map) {
    map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
    }).setView([lat, lng], zoom);

    // Add OpenStreetMap tile layer with dark mode filter
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: "map-tiles-dark",
    }).addTo(map);

    // Disable map dragging and zooming during gameplay
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  }
}

// Initialize game
function initGame(centerLat, centerLng) {
  // Clear existing game elements
  clearGame();

  // Initialize player snake in the center
  playerSnake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    playerSnake.push({
      lat: centerLat - i * SNAKE_SEGMENT_DISTANCE,
      lng: centerLng,
    });
  }

  // Set initial mouse target
  mouseTarget = { lat: centerLat, lng: centerLng };

  // Spawn food
  spawnFood(centerLat, centerLng);

  // [추가됨] Spawn initial bots
  spawnInitialBots(centerLat, centerLng);

  // Reset score
  score = 0;
  updateHUD();

  // Show game HUD
  document.getElementById("game-hud").style.display = "block";
  document.getElementById("game-over").style.display = "none";

  // Set snake color to bright red
  currentSnakeColor = "#ff0000";
  // Start game loop
  gameActive = true;
  gameLoop();
}

// Clear game elements
function clearGame() {
  // Remove player snake polyline
  if (playerSnakePolyline) {
    map.removeLayer(playerSnakePolyline);
    playerSnakePolyline = null;
  }

  // Remove player snake circles
  playerSnakeCircles.forEach((circle) => map.removeLayer(circle));
  playerSnakeCircles = [];

  // [추가됨] Remove bot snakes
  bots.forEach((bot) => clearBotLayers(bot));
  bots = [];

  // Remove food items
  foodItems.forEach((food) => map.removeLayer(food.circle));
  foodItems = [];

  // Cancel animation frame
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

// [추가됨] Bot의 Leaflet 레이어 제거
function clearBotLayers(bot) {
  if (bot.polyline) {
    map.removeLayer(bot.polyline);
  }
  bot.circles.forEach((circle) => map.removeLayer(circle));
}

// Spawn food items
function spawnFood(centerLat, centerLng) {
  const mapBounds = map.getBounds();
  const latRange = mapBounds.getNorth() - mapBounds.getSouth();
  const lngRange = mapBounds.getEast() - mapBounds.getWest();

  for (let i = 0; i < FOOD_COUNT; i++) {
    const lat = centerLat + (Math.random() - 0.5) * latRange * 0.8;
    const lng = centerLng + (Math.random() - 0.5) * lngRange * 0.8;

    const foodColor =
      SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)];

    const circle = L.circle([lat, lng], {
      radius: FOOD_RADIUS,
      color: foodColor,
      fillColor: foodColor,
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map);

    // [수정] food 객체에 고유 ID 추가
    foodItems.push({ id: Date.now() + Math.random(), lat, lng, circle, color: foodColor });
  }
}

// Respawn single food item
function respawnFood(centerLat, centerLng) {
  const mapBounds = map.getBounds();
  const latRange = mapBounds.getNorth() - mapBounds.getSouth();
  const lngRange = mapBounds.getEast() - mapBounds.getWest();

  const lat = centerLat + (Math.random() - 0.5) * latRange * 0.8;
  const lng = centerLng + (Math.random() - 0.5) * lngRange * 0.8;

  const foodColor =
    SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)];

  const circle = L.circle([lat, lng], {
    radius: FOOD_RADIUS,
    color: foodColor,
    fillColor: foodColor,
    fillOpacity: 0.9,
    weight: 2,
  }).addTo(map);

  // [수정] food 객체에 고유 ID 추가
  foodItems.push({ id: Date.now() + Math.random(), lat, lng, circle, color: foodColor });
}

// [추가됨] 초기 봇 스폰
function spawnInitialBots(centerLat, centerLng) {
  for (let i = 0; i < BOT_NUM; i++) {
    spawnBot(centerLat, centerLng);
  }
}

// [추가됨] 단일 봇 스폰
function spawnBot(centerLat, centerLng) {
  const mapBounds = map.getBounds();
  const latRange = mapBounds.getNorth() - mapBounds.getSouth();
  const lngRange = mapBounds.getEast() - mapBounds.getWest();

  // 스폰 위치 랜덤화
  const lat = centerLat + (Math.random() - 0.5) * latRange * 0.8;
  const lng = centerLng + (Math.random() - 0.5) * lngRange * 0.8;

  let botSnake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    botSnake.push({
      lat: lat - i * SNAKE_SEGMENT_DISTANCE,
      lng: lng,
    });
  }

  const bot = {
    id: Date.now() + Math.random(), // 고유 ID
    snake: botSnake,
    polyline: null,
    circles: [],
    target: null, // AI 목표물 (food 객체)
    score: 0, // 봇의 점수(길이)
    color: BOT_COLOR,
  };

  bots.push(bot);
}

// Calculate distance between two points
function distance(lat1, lng1, lat2, lng2) {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// --- Player Snake 로직 ---

// Update [PLAYER] snake position
function updatePlayer() {
  if (!gameActive || !mouseTarget) return;

  const head = playerSnake[0];

  // Calculate direction to mouse target
  const dx = mouseTarget.lng - head.lng;
  const dy = mouseTarget.lat - head.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0.00001) {
    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Move head towards target
    const newHead = {
      lat: head.lat + dirY * SNAKE_SPEED,
      lng: head.lng + dirX * SNAKE_SPEED,
    };

    // Add new head
    playerSnake.unshift(newHead);

    // Update remaining segments to follow
    for (let i = 1; i < playerSnake.length; i++) {
      const current = playerSnake[i];
      const previous = playerSnake[i - 1];

      const dx = previous.lng - current.lng;
      const dy = previous.lat - current.lat;
      const segDist = Math.sqrt(dx * dx + dy * dy);

      if (segDist > 0) { // 0.001 -> 0
        const ratio = SNAKE_SEGMENT_DISTANCE / segDist;
        playerSnake[i] = {
          lat: previous.lat - dy * ratio,
          lng: previous.lng - dx * ratio,
        };
      }
    }

    // Remove tail if no growth needed
    if (playerSnake.length > (INITIAL_SNAKE_LENGTH + score) * 10) {
      playerSnake.pop();
    }
  }

  // Check food collision
  checkPlayerFoodCollision();

  // Check self collision
  checkPlayerSelfCollision();

  // Render snake
  renderPlayer();
}

// Check [PLAYER] collision with food
function checkPlayerFoodCollision() {
  const head = playerSnake[0];

  for (let i = foodItems.length - 1; i >= 0; i--) {
    const food = foodItems[i];
    const dist = distance(head.lat, head.lng, food.lat, food.lng);

    if (dist < 0.00015) {
      // [추가] 이 음식이 봇의 타겟인지 확인
      bots.forEach(bot => {
          if (bot.target && bot.target.id === food.id) {
              bot.target = null; // 플레이어가 먹었으므로 봇 타겟 초기화
          }
      });

      // Remove food
      map.removeLayer(food.circle);
      foodItems.splice(i, 1);

      // Increase score
      score++;
      updateHUD();

      // Spawn new food
      const centerLat = playerSnake[0].lat;
      const centerLng = playerSnake[0].lng;
      respawnFood(centerLat, centerLng);

      break;
    }
  }
}

// Check [PLAYER] collision with self
function checkPlayerSelfCollision() {
  if (playerSnake.length < 10) return; // 1000 -> 10

  const head = playerSnake[0];

  // Check collision with body (skip first few segments)
  for (let i = 5; i < playerSnake.length; i++) {
    const segment = playerSnake[i];
    const dist = distance(head.lat, head.lng, segment.lat, segment.lng);

    if (dist < COLLISION_DISTANCE) {
      gameOver();
      return;
    }
  }
}

// Render [PLAYER] snake on map
function renderPlayer() {
  // Remove old polyline
  if (playerSnakePolyline) {
    map.removeLayer(playerSnakePolyline);
  }

  // Remove old circles
  playerSnakeCircles.forEach((circle) => map.removeLayer(circle));
  playerSnakeCircles = [];

  // Draw snake body as polyline
  const coords = playerSnake.map((s) => [s.lat, s.lng]);
  playerSnakePolyline = L.polyline(coords, {
    color: currentSnakeColor,
    weight: SNAKE_WIDTH,
    opacity: 0.8,
    smoothFactor: 1,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  // Draw head as larger circle
  const head = playerSnake[0];
  const headCircle = L.circle([head.lat, head.lng], {
    radius: SNAKE_HEAD_RADIUS,
    color: currentSnakeColor,
    fillColor: currentSnakeColor,
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);
  playerSnakeCircles.push(headCircle);
}

// --- [수정됨] Bot Snake 로직 ---

// 맵 상의 봇들을 업데이트
function updateBots() {
  bots.forEach((bot) => {
    // 1. AI로 목표물 찾기
    findBotTarget(bot);
    // 2. 목표물로 이동
    moveBot(bot);
    // 3. 봇 음식 섭취 확인
    checkBotFoodCollision(bot);
    // 4. 봇 자살 확인
    checkBotSelfCollision(bot);
    // 5. 봇 렌더링
    renderBot(bot);
  });
}

// [AI] 봇의 목표물(가장 가까운 음식) 찾기
function findBotTarget(bot) {
  // 목표물이 없거나, 1% 확률로 목표물 재탐색
  if (!bot.target || Math.random() < 0.01) {
    let closestFood = null;
    let minDistance = Infinity;
    const botHead = bot.snake[0];

    for (const food of foodItems) {
      const dist = distance(botHead.lat, botHead.lng, food.lat, food.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestFood = food; // [수정] food 객체 자체를 저장
      }
    }

    if (closestFood) {
      bot.target = closestFood; // [수정]
    }
  }
}

// 봇의 뱀을 목표물로 이동
function moveBot(bot) {
  if (!bot.target) return; // 목표가 없으면 움직이지 않음

  const head = bot.snake[0];

  // [수정] 목표 좌표를 bot.target 객체에서 직접 가져옴
  const dx = bot.target.lng - head.lng;
  const dy = bot.target.lat - head.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // [제거] 목표 도달 확인은 checkBotFoodCollision에서 처리
  // if (dist < 0.00015) { ... }

  if (dist > 0.00001) {
    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Move head towards target
    const newHead = {
      lat: head.lat + dirY * BOT_SPEED,
      lng: head.lng + dirX * BOT_SPEED,
    };

    // Add new head
    bot.snake.unshift(newHead);

    // Update remaining segments
    for (let i = 1; i < bot.snake.length; i++) {
      const current = bot.snake[i];
      const previous = bot.snake[i - 1];
      const dxSeg = previous.lng - current.lng;
      const dySeg = previous.lat - current.lat;
      const segDist = Math.sqrt(dxSeg * dxSeg + dySeg * dySeg);

      if (segDist > 0) {
        const ratio = SNAKE_SEGMENT_DISTANCE / segDist;
        bot.snake[i] = {
          lat: previous.lat - dySeg * ratio,
          lng: previous.lng - dxSeg * ratio,
        };
      }
    }

    // Remove tail
    if (bot.snake.length > (INITIAL_SNAKE_LENGTH + bot.score) * 10) {
      bot.snake.pop();
    }
  }
}

// 봇과 음식 충돌 확인
function checkBotFoodCollision(bot) {
  // [수정] 목표물이 없으면 절대 먹을 수 없음
  if (!bot.target) return; 

  const head = bot.snake[0];
  const food = bot.target; // [수정] 오직 목표물만 확인

  const dist = distance(head.lat, head.lng, food.lat, food.lng);

  // [수정] 목표물과 충돌했는지 확인
  if (dist < 0.00015) {
    // foodItems 배열에서 이 food를 찾아 제거
    const foodIndex = foodItems.findIndex(f => f.id === food.id);
    
    if (foodIndex > -1) { // 음식을 찾았다면 (플레이어 등이 먼저 먹지 않았다면)
      map.removeLayer(food.circle);
      foodItems.splice(foodIndex, 1);
      bot.score++;

      // 봇이 음식을 먹으면 즉시 목표물 초기화 (다음 프레임에 새로 찾도록)
      bot.target = null; 
      
      const centerLat = bot.snake[0].lat;
      const centerLng = bot.snake[0].lng;
      respawnFood(centerLat, centerLng);

    } else {
      // 누군가(플레이어 또는 다른 봇)가 이 음식을 방금 먹었음
      bot.target = null; // 목표 초기화
    }
  }
}

// 봇 자살 충돌 확인
function checkBotSelfCollision(bot) {
  if (bot.snake.length < 10) return;

  const head = bot.snake[0];
  for (let i = 5; i < bot.snake.length; i++) {
    const segment = bot.snake[i];
    const dist = distance(head.lat, head.lng, segment.lat, segment.lng);

    if (dist < COLLISION_DISTANCE) {
      // killBot(bot, "suicide"); // [수정됨] 봇이 자살하지 않도록 비활성화
      // return; // [수정됨] 봇이 자살하지 않도록 비활성화
    }
  }
}

// 봇 렌더링
function renderBot(bot) {
  if (bot.polyline) {
    map.removeLayer(bot.polyline);
  }
  bot.circles.forEach((circle) => map.removeLayer(circle));
  bot.circles = [];

  const coords = bot.snake.map((s) => [s.lat, s.lng]);
  bot.polyline = L.polyline(coords, {
    color: bot.color,
    weight: SNAKE_WIDTH,
    opacity: 0.8,
    smoothFactor: 1,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  const head = bot.snake[0];
  const headCircle = L.circle([head.lat, head.lng], {
    radius: SNAKE_HEAD_RADIUS,
    color: bot.color,
    fillColor: bot.color,
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);
  bot.circles.push(headCircle);
}


// --- 상호작용 및 관리 로직 ---

// 뱀 사망 처리 (봇)
function killBot(bot, killType) {
  // 1. 맵에서 봇 레이어 제거
  clearBotLayers(bot);

  // 2. 봇 배열에서 제거
  bots = bots.filter(b => b.id !== bot.id);

  // 3. 봇의 몸통을 음식으로 드랍
  dropFoodFromSnake(bot.snake);

  // 4. 플레이어가 죽인 경우, 점수 추가 및 메시지 표시
  if (killType === "player_kill") {
    const bonusScore = 10; // 킬 보너스 점수
    score += bonusScore;
    updateHUD();
    showKillMessage(`🐍 Bot Killed! +${bonusScore} Score`);
  }
}

// 뱀 몸통을 음식으로 변환
function dropFoodFromSnake(snakeArray) {
    // 성능을 위해 뱀의 모든 마디가 아닌, 일부만 음식으로 드랍
    for (let i = 0; i < snakeArray.length; i += 10) { 
        if (i > BOT_FOOD_DROP_COUNT * 10) break; // 최대 드랍 수
        
        const segment = snakeArray[i];
        const foodColor = SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)];
        const circle = L.circle([segment.lat, segment.lng], {
            radius: FOOD_RADIUS, // 일반 음식보다 약간 크게
            color: foodColor,
            fillColor: foodColor,
            fillOpacity: 0.9,
            weight: 2,
        }).addTo(map);
        // [수정] 드랍되는 음식에도 ID 부여
        foodItems.push({ id: Date.now() + Math.random(), lat: segment.lat, lng: segment.lng, circle, color: foodColor });
    }
}


// 킬 메시지 표시
function showKillMessage(message) {
    const msgEl = document.getElementById("kill-message");
    msgEl.textContent = message;
    msgEl.style.display = "block";
    msgEl.style.opacity = 1;

    setTimeout(() => {
        msgEl.style.opacity = 0;
        setTimeout(() => {
            msgEl.style.display = "none";
        }, 500); // 0.5초 뒤에 숨김
    }, 2000); // 2초간 표시
}


// 모든 뱀들 간의 충돌 확인
function checkCollisions() {
    if (!gameActive || !playerSnake[0]) return;

    const playerHead = playerSnake[0];

    // 1. 플레이어 vs 봇 몸통 & 봇 vs 플레이어 몸통
    for (let i = bots.length - 1; i >= 0; i--) {
        const bot = bots[i];
        if (!bot.snake[0]) continue;
        
        const botHead = bot.snake[0];

        // 1a. 플레이어 머리 vs 봇 몸통
        for (let j = 5; j < bot.snake.length; j++) {
            const botSegment = bot.snake[j];
            if (distance(playerHead.lat, playerHead.lng, botSegment.lat, botSegment.lng) < COLLISION_DISTANCE) {
                gameOver();
                return; // 플레이어가 죽었으므로 모든 충돌 검사 중지
            }
        }

        // 1b. 봇 머리 vs 플레이어 몸통
        for (let j = 5; j < playerSnake.length; j++) {
            const playerSegment = playerSnake[j];
            if (distance(botHead.lat, botHead.lng, playerSegment.lat, playerSegment.lng) < COLLISION_DISTANCE) {
                killBot(bot, "player_kill");
                break; // 이 봇은 죽었으므로 다음 봇으로 넘어감
            }
        }
    }

    // 2. 봇 vs 봇 (N^2 검사)
    for (let i = bots.length - 1; i >= 0; i--) {
        const botA = bots[i];
        if (!botA || !botA.snake[0]) continue; // 이미 죽었을 수 있음
        const botAHead = botA.snake[0];

        for (let j = bots.length - 1; j >= 0; j--) {
            if (i === j) continue; // 자기 자신과는 검사 안함
            const botB = bots[j];
            if (!botB || !botB.snake[0]) continue;

            // botA의 머리가 botB의 몸통에 부딪혔는지 검사
            for (let k = 5; k < botB.snake.length; k++) {
                const botBSegment = botB.snake[k];
                if (distance(botAHead.lat, botAHead.lng, botBSegment.lat, botBSegment.lng) < COLLISION_DISTANCE) {
                    killBot(botA, "bot_kill");
                    break; // botA는 죽었음.
                }
            }
            if (!bots.includes(botA)) break; // botA가 죽었으면 내부 루프 탈출
        }
    }
}

// 봇 개체 수 관리 (맵 이탈 및 리스폰)
function manageBots() {
    const bounds = map.getBounds();
    const padding = 0.01; // 맵 바깥 여유분

    for (let i = bots.length - 1; i >= 0; i--) {
        const bot = bots[i];
        if (!bot.snake[0]) continue; // 스폰 중 오류 방지
        const botHead = bot.snake[0];

        // 맵 바깥으로 완전히 나갔는지 확인
        if (botHead.lat > bounds.getNorth() + padding ||
            botHead.lat < bounds.getSouth() - padding ||
            botHead.lng > bounds.getEast() + padding ||
            botHead.lng < bounds.getWest() - padding) 
        {
            // 디스폰 (음식 드랍 없음)
            clearBotLayers(bot);
            bots.splice(i, 1);
        }
    }

    // 봇 개체 수가 부족하면 리스폰
    while (bots.length < BOT_NUM) {
        const center = map.getCenter();
        spawnBot(center.lat, center.lng);
    }
}


// --- [수정됨] Game loop ---
function gameLoop() {
  if (!gameActive) return;

  updatePlayer(); // 플레이어 업데이트
  updateBots();   // [추가] 봇 업데이트
  checkCollisions(); // [추가] 상호 충돌 검사
  manageBots();   // [추가] 봇 개체 수 관리

  animationFrame = requestAnimationFrame(gameLoop);
}

// Update HUD
function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("length").textContent = playerSnake.length; // 'snake' -> 'playerSnake'
}

// Game over
function gameOver() {
  gameActive = false;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  // Show game over screen
  document.getElementById("final-score").textContent = score;
  document.getElementById("final-length").textContent = playerSnake.length; // 'snake' -> 'playerSnake'
  document.getElementById("game-over").style.display = "block";
}

// Restart game
function restartGame() {
  const center = map.getCenter();
  initGame(center.lat, center.lng);
}

// Update the location display
function updateLocationDisplay(lat, lng, accuracy) {
  document.getElementById("lat").textContent = lat.toFixed(6);
  document.getElementById("lng").textContent = lng.toFixed(6);
  document.getElementById("accuracy").textContent = `±${accuracy.toFixed(
    0
  )} meters`;
}

// Show error message
function showError(message) {
  const loadingEl = document.getElementById("loading");
  loadingEl.textContent = message;
  loadingEl.classList.add("error");

  setTimeout(() => {
    loadingEl.style.display = "none";
  }, 3000);
}

// Hide loading message
function hideLoading() {
  const loadingEl = document.getElementById("loading");
  loadingEl.style.display = "none";
}

// Apply moving average smoothing to GPS coordinates
function getSmoothedCoordinates(rawLat, rawLng) {
  // Add new readings to the arrays
  latReadings.push(rawLat);
  lngReadings.push(rawLng);

  // Keep only the last N readings (window size)
  if (latReadings.length > GPS_SMOOTHING_WINDOW) {
    latReadings.shift();
    lngReadings.shift();
  }

  // Calculate averages
  const smoothedLat =
    latReadings.reduce((sum, val) => sum + val, 0) / latReadings.length;
  const smoothedLng =
    lngReadings.reduce((sum, val) => sum + val, 0) / lngReadings.length;

  return { lat: smoothedLat, lng: smoothedLng };
}

// Get and display current location
function updateLocation() {
  if (!navigator.geolocation) {
    showError("❌ Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // Success callback
    (position) => {
      const accuracy = position.coords.accuracy;
      //   if (accuracy > 20) {
      //     return; // Skip if accuracy is over 20
      //   }

      const rawLat = position.coords.latitude;
      const rawLng = position.coords.longitude;

      // Apply moving average smoothing
      const smoothed = getSmoothedCoordinates(rawLat, rawLng);
      const lat = smoothed.lat;
      const lng = smoothed.lng;

      // Initialize map if not already done
      if (!map) {
        initMap(lat, lng, MAP_ZOOM);
      } else {
        // Pan to new location
        // map.setView([lat, lng], MAP_ZOOM);
      }

      // Remove existing marker and accuracy circle if they exist
      if (marker) {
        map.removeLayer(marker);
      }
      if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
      }

      // Add accuracy circle
      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#667eea",
        fillColor: "#667eea",
        fillOpacity: 0.05,
        weight: 1,
      }).addTo(map);

      // add center marker
      const centerMarker = L.circle([lat, lng], {
        radius: 10,
        color: "#667eea",
        fillColor: "#667eea",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);

      // Update info panel
      updateLocationDisplay(lat, lng, accuracy);
      document.getElementById("info-panel").style.display = "block";

      hideLoading();

      // Update snake target to current GPS position
      mouseTarget = { lat: lat, lng: lng };

      // Start the game
      if (!gameActive) {
        initGame(lat, lng);
      }
    },
    // Error callback
    (error) => {
      let errorMessage = "❌ Unable to get location: ";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += "Permission denied. Please allow location access.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage += "Request timeout.";
          break;
        default:
          errorMessage += "Unknown error occurred.";
      }

      showError(errorMessage);

      // Initialize map with default location if not already done
      if (!map) {
        initMap();
        // Start game at default location
        const center = map.getCenter();
        initGame(center.lat, center.lng);
      }
    },
    // Options
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Mouse/Touch handlers (DISABLED)
// ... (기존과 동일) ...

// Initialize on page load
window.addEventListener("load", () => {
  updateLocation();
  // Update location every second
  setInterval(updateLocation, 1000);
});