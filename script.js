// Initialize the map
let map;
let marker;
let accuracyCircle;

// Game variables
let snake = [];
let snakePolyline = null;
let snakeCircles = [];
let foodItems = [];
let score = 0;
let gameActive = false;
let mouseTarget = null;
let animationFrame = null;

// Game configuration
const INITIAL_SNAKE_LENGTH = 5;
//const SNAKE_SPEED = 0.000008; // degrees per frame
const FOLLOW_FACTOR = 0.1; //follow rate per fram ; for smooth snake 
const SNAKE_SEGMENT_DISTANCE = 0.000005; // distance between segments
const FOOD_COUNT = 200;
const SNAKE_WIDTH = 10;
const SNAKE_HEAD_RADIUS = 5;
const FOOD_RADIUS = 10;
const MAP_ZOOM = 17;

// Moving average configuration for GPS smoothing
const GPS_SMOOTHING_WINDOW = 2; // Number of readings to average
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

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
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

  // Initialize snake in the center
  snake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.push({
      lat: centerLat - i * SNAKE_SEGMENT_DISTANCE,
      lng: centerLng,
    });
  }

  // Set initial mouse target
  mouseTarget = { lat: centerLat, lng: centerLng };

  // Spawn food
  spawnFood(centerLat, centerLng);

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
  // Remove snake polyline
  if (snakePolyline) {
    map.removeLayer(snakePolyline);
    snakePolyline = null;
  }

  // Remove snake circles
  snakeCircles.forEach((circle) => map.removeLayer(circle));
  snakeCircles = [];

  // Remove food items
  foodItems.forEach((food) => map.removeLayer(food.circle));
  foodItems = [];

  // Cancel animation frame
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
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

    foodItems.push({ lat, lng, circle, color: foodColor });
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

  foodItems.push({ lat, lng, circle, color: foodColor });
}

// Calculate distance between two points
function distance(lat1, lng1, lat2, lng2) {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Update snake position
function updateSnake() {
  if (!gameActive || !mouseTarget) return;

  const head = snake[0];

  // Calculate direction to mouse target
  const dx = mouseTarget.lng - head.lng;
  const dy = mouseTarget.lat - head.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // [수정됨] 0.00001 (아주 가까운 거리)보다 클 때만 이동 로직을 실행합니다.
  if (dist > 0.00001) {
    
    // --- [수정된 로직 시작] ---
    // 고정된 속도(SNAKE_SPEED) 대신,
    // 목표까지 남은 거리의 일정 비율(FOLLOW_FACTOR)만큼 이동합니다.
    const newHead = {
      lat: head.lat + dy * FOLLOW_FACTOR,
      lng: head.lng + dx * FOLLOW_FACTOR,
    };
    // --- [수정된 로직 끝] ---


    // Add new head
    snake.unshift(newHead);

    // Update remaining segments to follow
    for (let i = 1; i < snake.length; i++) {
      const current = snake[i];
      const previous = snake[i - 1];

      const dx = previous.lng - current.lng;
      const dy = previous.lat - current.lat;
      const segDist = Math.sqrt(dx * dx + dy * dy);

      // [수정됨] segDist가 0보다 클 때만 보간을 수행합니다. (0으로 나누기 방지)
      // (기존 0.001 조건은 뱀이 멈췄을 때 마디가 겹치는 문제를 일으킬 수 있음)
      if (segDist > 0) { 
        const ratio = SNAKE_SEGMENT_DISTANCE / segDist;
        snake[i] = {
          lat: previous.lat - dy * ratio,
          lng: previous.lng - dx * ratio,
        };
      }
    }

    // Remove tail if no growth needed
    if (snake.length > (INITIAL_SNAKE_LENGTH + score) * 10) {
      snake.pop();
    }
  }

  // Check food collision
  checkFoodCollision();

  // Check self collision
  checkSelfCollision();

  // Render snake
  renderSnake();
}

// Check collision with food
function checkFoodCollision() {
  const head = snake[0];

  for (let i = foodItems.length - 1; i >= 0; i--) {
    const food = foodItems[i];
    const dist = distance(head.lat, head.lng, food.lat, food.lng);

    // Collision detected (in degrees, roughly equivalent to visual collision)
    if (dist < 0.00015) {
      // Remove food
      map.removeLayer(food.circle);
      foodItems.splice(i, 1);

      // Increase score
      score++;
      updateHUD();

      // Spawn new food
      const centerLat = snake[0].lat;
      const centerLng = snake[0].lng;
      respawnFood(centerLat, centerLng);

      // Add segments to snake (will grow naturally)
      break;
    }
  }
}

// Check collision with self
function checkSelfCollision() {
  if (snake.length < 1000) return; // Too short to collide with self

  const head = snake[0];

  // Check collision with body (skip first few segments)
  for (let i = 5; i < snake.length; i++) {
    const segment = snake[i];
    const dist = distance(head.lat, head.lng, segment.lat, segment.lng);

    if (dist < 0.00008) {
      gameOver();
      return;
    }
  }
}

// Render snake on map
function renderSnake() {
  // Remove old polyline
  if (snakePolyline) {
    map.removeLayer(snakePolyline);
  }

  // Remove old circles
  snakeCircles.forEach((circle) => map.removeLayer(circle));
  snakeCircles = [];

  // Draw snake body as polyline
  const coords = snake.map((s) => [s.lat, s.lng]);
  snakePolyline = L.polyline(coords, {
    color: currentSnakeColor,
    weight: SNAKE_WIDTH,
    opacity: 0.8,
    smoothFactor: 1,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  // Draw head as larger circle
  const head = snake[0];
  const headCircle = L.circle([head.lat, head.lng], {
    radius: SNAKE_HEAD_RADIUS,
    color: currentSnakeColor,
    fillColor: currentSnakeColor,
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);
  snakeCircles.push(headCircle);
}

// Game loop
function gameLoop() {
  if (!gameActive) return;

  updateSnake();
  animationFrame = requestAnimationFrame(gameLoop);
}

// Update HUD
function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("length").textContent = snake.length;
}

// Game over
function gameOver() {
  gameActive = false;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  // Show game over screen
  document.getElementById("final-score").textContent = score;
  document.getElementById("final-length").textContent = snake.length;
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

// Mouse move handler - DISABLED: Snake now tracks GPS position
// document.addEventListener("mousemove", (e) => {
//   // Update cursor indicator position
//   const cursorIndicator = document.getElementById("cursor-indicator");
//   cursorIndicator.style.left = e.clientX + "px";
//   cursorIndicator.style.top = e.clientY + "px";

//   // Convert mouse position to map coordinates
//   if (map) {
//     const mapContainer = map.getContainer();
//     const rect = mapContainer.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
//     const point = map.containerPointToLatLng([x, y]);
//     mouseTarget = { lat: point.lat, lng: point.lng };
//   }
// });

// Touch move handler for mobile - DISABLED: Snake now tracks GPS position
// document.addEventListener("touchmove", (e) => {
//   if (e.touches.length > 0) {
//     const touch = e.touches[0];

//     // Update cursor indicator position
//     const cursorIndicator = document.getElementById("cursor-indicator");
//     cursorIndicator.style.left = touch.clientX + "px";
//     cursorIndicator.style.top = touch.clientY + "px";

//     // Convert touch position to map coordinates
//     if (map) {
//       const mapContainer = map.getContainer();
//       const rect = mapContainer.getBoundingClientRect();
//       const x = touch.clientX - rect.left;
//       const y = touch.clientY - rect.top;
//       const point = map.containerPointToLatLng([x, y]);
//       mouseTarget = { lat: point.lat, lng: point.lng };
//     }
//   }
// });

// Initialize on page load
window.addEventListener("load", () => {
  updateLocation();
  // Update location every second
  setInterval(updateLocation, 1000);
});
