
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const $ = id => document.getElementById(id);

const game = $("game");
const overlay = $("overlay");
const status = $("status");
const errorBox = $("error");
const nickname = $("nickname");
const serverUrl = $("serverUrl");

let scene, camera, renderer, flashlight, enemy;
let running = false;
let flashlightOn = true;
let lastTime = 0;
let yaw = 0;
let pitch = 0;
let walkDistance = 0;
let enemySpeed = 1.5;

const keys = {};
const player = new THREE.Vector3(0, 1.7, 0);
const velocity = new THREE.Vector3();
const mazeSize = 17;
const cellSize = 4;
const wallHeight = 4;

const maze = [
  "11111111111111111",
  "10000010000000001",
  "10111010111111001",
  "10001010000001001",
  "11101011111001001",
  "10001000001001001",
  "10111111001001001",
  "10000001001000001",
  "10111001011111001",
  "10001001000000001",
  "11101011101111001",
  "10001000001000001",
  "10111111001011001",
  "10000000000001001",
  "10111101111101001",
  "10000000000000001",
  "11111111111111111"
];

function cellCenter(index) {
  return (index - (mazeSize - 1) / 2) * cellSize;
}

function isWall(x, z) {
  const col = Math.round(x / cellSize + (mazeSize - 1) / 2);
  const row = Math.round(z / cellSize + (mazeSize - 1) / 2);

  if (row < 0 || col < 0 || row >= mazeSize || col >= mazeSize) {
    return true;
  }

  return maze[row][col] === "1";
}

function createMaterial(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05
  });
}

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030507);
  scene.fog = new THREE.FogExp2(0x030507, 0.035);

  camera = new THREE.PerspectiveCamera(
    76,
    innerWidth / innerHeight,
    0.1,
    180
  );

  camera.rotation.order = "YXZ";
  camera.position.copy(player);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  game.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x647080, 0x100d0a, 0.48));

  const ambient = new THREE.AmbientLight(0x263044, 0.22);
  scene.add(ambient);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mazeSize * cellSize, mazeSize * cellSize),
    createMaterial(0x252629)
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(mazeSize * cellSize, mazeSize * cellSize),
    createMaterial(0x111216)
  );

  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  scene.add(ceiling);

  const wallMaterial = createMaterial(0x393a3d);
  const trimMaterial = createMaterial(0x191b20);

  for (let row = 0; row < mazeSize; row++) {
    for (let col = 0; col < mazeSize; col++) {
      if (maze[row][col] !== "1") continue;

      const x = cellCenter(col);
      const z = cellCenter(row);

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize, wallHeight, cellSize),
        wallMaterial
      );

      wall.position.set(x, wallHeight / 2, z);
      scene.add(wall);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(cellSize * 0.96, 0.12, cellSize * 0.96),
        trimMaterial
      );

      trim.position.set(x, 0.25, z);
      scene.add(trim);
    }
  }

  // Faint emergency lights in selected corridors.
  for (const [x, z] of [[-20, -20], [20, -12], [-12, 16], [16, 20]]) {
    const light = new THREE.PointLight(0x8d1820, 3, 11);
    light.position.set(x, 3, z);
    scene.add(light);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2636 })
    );

    bulb.position.copy(light.position);
    scene.add(bulb);
  }

  flashlight = new THREE.SpotLight(
    0xffedcf,
    32,
    32,
    Math.PI / 7,
    0.45,
    1.4
  );

  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, -1);
  camera.add(flashlight);
  camera.add(flashlight.target);
  scene.add(camera);

  createEnemy();
  createExit();
}

function createEnemy() {
  enemy = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 1.0, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x171116,
      roughness: 0.95
    })
  );

  body.position.y = 1.15;
  enemy.add(body);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff1526 });

  for (const x of [-0.19, 0.19]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 8),
      eyeMaterial
    );

    eye.position.set(x, 1.55, -0.48);
    enemy.add(eye);
  }

  enemy.position.set(cellCenter(13), 0, cellCenter(13));
  scene.add(enemy);
}

function createExit() {
  const frameMaterial = createMaterial(0x484b50);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x24a66a
  });

  const door = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 0.25),
    frameMaterial
  );

  panel.position.y = 1.5;
  door.add(panel);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.25, 0.08),
    glowMaterial
  );

  sign.position.set(0, 2.4, -0.17);
  door.add(sign);

  // The exit is placed near the far end of the maze.
  door.position.set(cellCenter(15), 0, cellCenter(15));
  scene.add(door);
}

function canMove(x, z) {
  const radius = 0.34;

  return !(
    isWall(x - radius, z - radius) ||
    isWall(x + radius, z - radius) ||
    isWall(x - radius, z + radius) ||
    isWall(x + radius, z + radius)
  );
}

function updatePlayer(dt) {
  let forward = 0;
  let side = 0;

  if (keys.KeyW || keys.ArrowUp) forward += 1;
  if (keys.KeyS || keys.ArrowDown) forward -= 1;
  if (keys.KeyD || keys.ArrowRight) side += 1;
  if (keys.KeyA || keys.ArrowLeft) side -= 1;

  forward += touchMove.y;
  side += touchMove.x;

  const length = Math.hypot(forward, side);

  if (length > 1) {
    forward /= length;
    side /= length;
  }

  const sprinting = keys.ShiftLeft || keys.ShiftRight || touchRunning;
  const speed = sprinting ? 6.4 : 3.8;

  const dx = (
    -Math.sin(yaw) * forward +
    Math.cos(yaw) * side
  ) * speed * dt;

  const dz = (
    -Math.cos(yaw) * forward -
    Math.sin(yaw) * side
  ) * speed * dt;

  if (canMove(player.x + dx, player.z)) {
    player.x += dx;
  }

  if (canMove(player.x, player.z + dz)) {
    player.z += dz;
  }

  if (length > 0) {
    walkDistance += dt * (sprinting ? 15 : 9);
  }

  camera.position.set(
    player.x,
    1.7 + (length > 0 ? Math.sin(walkDistance) * 0.035 : 0),
    player.z
  );

  camera.rotation.set(pitch, yaw, 0, "YXZ");
}

function updateEnemy(dt) {
  const dx = player.x - enemy.position.x;
  const dz = player.z - enemy.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance > 1.35) {
    const step = enemySpeed * dt;
    const nextX = enemy.position.x + (dx / distance) * step;
    const nextZ = enemy.position.z + (dz / distance) * step;

    if (canMove(nextX, enemy.position.z)) {
      enemy.position.x = nextX;
    }

    if (canMove(enemy.position.x, nextZ)) {
      enemy.position.z = nextZ;
    }
  }

  enemy.lookAt(player.x, 1.2, player.z);

  if (distance < 1.45) {
    status.textContent = "TEHLİKE! Düşman seni yakaladı!";
    status.style.color = "#ff3948";
  } else {
    status.textContent = "Hayatta kal • Çıkışı bul";
    status.style.color = "#ffffff";
  }
}

function toggleFlashlight() {
  flashlightOn = !flashlightOn;
  flashlight.visible = flashlightOn;
  $("flashButton").textContent = flashlightOn ? "🔦" : "🌑";
}

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;

  if (running) {
    updatePlayer(dt);
    updateEnemy(dt);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

let touchMove = { x: 0, y: 0 };
let touchRunning = false;

function setupControls() {
  addEventListener("keydown", event => {
    keys[event.code] = true;

    if (event.code === "KeyF") toggleFlashlight();

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
  });

  addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  renderer.domElement.addEventListener("click", () => {
    if (running && matchMedia("(pointer:fine)").matches) {
      renderer.domElement.requestPointerLock?.();
    }
  });

  document.addEventListener("mousemove", event => {
    if (document.pointerLockElement === renderer.domElement) {
      yaw -= event.movementX * 0.002;
      pitch -= event.movementY * 0.002;
      pitch = THREE.MathUtils.clamp(pitch, -1.35, 1.35);
    }
  });

  const stickArea = $("stickArea");
  const stick = $("stick");
  let stickPointer = null;

  stickArea.addEventListener("pointerdown", event => {
    stickPointer = event.pointerId;
    stickArea.setPointerCapture(event.pointerId);
    moveStick(event);
  });

  stickArea.addEventListener("pointermove", event => {
    if (event.pointerId === stickPointer) moveStick(event);
  });

  function moveStick(event) {
    const rect = stickArea.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = event.clientX - cx;
    let dy = event.clientY - cy;

    const max = rect.width * 0.32;
    const distance = Math.hypot(dx, dy);

    if (distance > max) {
      dx = dx / distance * max;
      dy = dy / distance * max;
    }

    touchMove.x = dx / max;
    touchMove.y = -dy / max;

    stick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetStick() {
    stickPointer = null;
    touchMove = { x: 0, y: 0 };
    stick.style.transform = "translate(0, 0)";
  }

  stickArea.addEventListener("pointerup", resetStick);
  stickArea.addEventListener("pointercancel", resetStick);

  const lookPad = $("lookPad");
  let lookPointer = null;
  let previousX = 0;
  let previousY = 0;

  lookPad.addEventListener("pointerdown", event => {
    lookPointer = event.pointerId;
    previousX = event.clientX;
    previousY = event.clientY;
    lookPad.setPointerCapture(event.pointerId);
  });

  lookPad.addEventListener("pointermove", event => {
    if (event.pointerId !== lookPointer) return;

    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;

    yaw -= dx * 0.006;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.005, -1.35, 1.35);

    previousX = event.clientX;
    previousY = event.clientY;
  });

  const stopLook = () => lookPointer = null;
  lookPad.addEventListener("pointerup", stopLook);
  lookPad.addEventListener("pointercancel", stopLook);

  $("flashButton").addEventListener("click", toggleFlashlight);

  $("runButton").addEventListener("pointerdown", () => {
    touchRunning = true;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
    $("runButton").addEventListener(type, () => {
      touchRunning = false;
    });
  });

  addEventListener("resize", () => {
    if (!camera || !renderer) return;

    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  });
}

$("startButton").addEventListener("click", () => {
  errorBox.textContent = "";

  if (serverUrl.value.trim()) {
    errorBox.textContent =
      "Çok oyunculu sunucu henüz bağlanmadı. Şimdilik sunucu adresini boş bırakıp tek oyunculu modu dene.";
    return;
  }

  try {
    buildWorld();
    setupControls();

    const name = nickname.value.trim() || "Oyuncu";
    $("playerNames").textContent = name;
    $("playerCount").textContent = "1";

    overlay.classList.add("hidden");
    running = true;
    status.textContent = "Hayatta kal • Çıkışı bul";

    if (matchMedia("(pointer:fine)").matches) {
      renderer.domElement.requestPointerLock?.();
    }
  } catch (error) {
    console.error(error);
    errorBox.textContent =
      "Oyun başlatılamadı. Sayfayı yenile ve tarayıcı konsolundaki hatayı kontrol et.";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    touchRunning = false;
  }
});

requestAnimationFrame(animate);

