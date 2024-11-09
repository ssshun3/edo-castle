window.addEventListener("DOMContentLoaded", init);

function init() {
  // Create a loading screen
  const loadingScreen = document.createElement("div");
  loadingScreen.id = "loading-screen";
  loadingScreen.style.position = "absolute";
  loadingScreen.style.top = "0";
  loadingScreen.style.left = "0";
  loadingScreen.style.width = "100%";
  loadingScreen.style.height = "100%";
  loadingScreen.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  loadingScreen.style.display = "flex";
  loadingScreen.style.alignItems = "center";
  loadingScreen.style.justifyContent = "center";
  loadingScreen.style.zIndex = "999";
  const loadingText = document.createElement("div");
  loadingText.style.color = "white";
  loadingText.style.fontSize = "24px";
  loadingText.style.fontWeight = "bold";
  loadingText.textContent = "Loading...";
  loadingScreen.appendChild(loadingText);
  document.body.appendChild(loadingScreen);

  // Renderer setup
  const canvasElement = document.querySelector("#myCanvas");
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvasElement,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight * 0.9);
  renderer.sortObjects = true;
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe0d5c0);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(0, 1, 0);
  scene.add(directionalLight);

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    1000000
  );
  camera.position.set(400, 80, 400);

  // Camera controls
  const controls = new THREE.OrbitControls(camera, canvasElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.2;
  controls.minDistance = 200;
  controls.maxDistance = 700;
  controls.enableZoom = false;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Load environment map
  const exrLoader = new THREE.EXRLoader();
  exrLoader.load(
    "./goegap_road_4k.exr",
    (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();

      // Load 3D model
      const loader = new THREE.GLTFLoader();
      loader.load(
        "./edo-castle.glb",
        (glb) => {
          const model = glb.scene;
          model.name = "model_castle";
          model.scale.set(50.0, 50.0, 50.0);
          model.position.set(0, -200, 0);
          scene.add(model);

          // Hide the loading screen
          loadingScreen.style.display = "none";

          // Start the animation loop
          tick();
        },
        undefined,
        (error) => {
          console.error(error);
        }
      );
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );

  // Particle system setup
  const particleCount = 2000;
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xa0522d,
    size: 4,
    transparent: true,
    opacity: 0.8,
  });

  const positions = [];
  const windOffsets = [];
  for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * 500;
    const y = Math.random() * 400;
    const z = (Math.random() - 0.5) * 500;
    positions.push(x, y, z);
    windOffsets.push(Math.random() * 2 * Math.PI);
  }

  particlesGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const snow = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(snow);

  function tick() {
    controls.update();

    // Time-based animation
    const time = performance.now() * 0.001;
    const seasonDuration = 10;
    const totalSeasons = 4;
    const currentSeason = Math.floor((time / seasonDuration) % totalSeasons);

    // 各季節の設定
    const seasonColors = [
      { background: 0xbff6f9, particle: 0xff68c3 }, // 春: 青空と桜色
      { background: 0x18f1ff, particle: 0x07e102 }, // 夏: 青空と緑色
      { background: 0xe0d5c0, particle: 0xa0522d }, // 秋: 茶色背景と紅葉
      { background: 0x1c1c1c, particle: 0xffffff }, // 冬: 暗い空と白い雪
    ];

    const nextSeason = (currentSeason + 1) % totalSeasons;
    const blendFactor = (time % seasonDuration) / seasonDuration;

    // Interpolate background and particle colors
    const currentBackground = new THREE.Color(
      seasonColors[currentSeason].background
    );
    const nextBackground = new THREE.Color(seasonColors[nextSeason].background);
    scene.background = currentBackground
      .clone()
      .lerp(nextBackground, blendFactor);

    const currentParticleColor = new THREE.Color(
      seasonColors[currentSeason].particle
    );
    const nextParticleColor = new THREE.Color(
      seasonColors[nextSeason].particle
    );
    particlesMaterial.color = currentParticleColor
      .clone()
      .lerp(nextParticleColor, blendFactor);

    // Update particle positions
    const positions = particlesGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += Math.sin(time + windOffsets[i / 3]) * 0.5;
      positions[i + 2] += Math.cos(time + windOffsets[i / 3]) * 0.5;

      if (currentSeason === 3) {
        positions[i + 1] -= 0.6;
      } else {
        positions[i + 1] -= 0.3;
      }

      if (positions[i + 1] < -200) {
        positions[i + 1] = Math.random() * 500 + 500;
      }
    }
    particlesGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", onWindowResize);
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight * 0.9);
    camera.aspect = window.innerWidth / (window.innerHeight * 0.9);
    camera.updateProjectionMatrix();
  }
}
