// Self-contained page that runs MediaPipe Pose Landmarker (Tasks Vision, WASM)
// on the live camera stream and posts lower-body landmarks to the host.
//
// Host contract (JSON messages):
//   { type: "status", stage: "loading" | "camera" | "ready" }
//   { type: "error", message: string }
//   { type: "pose", t: number, img: Record<idx, [x, y, visibility]>, world: Record<idx, [x, y, z]> }
//   { type: "nopose", t: number }
// Host → page: window.__setFacing("user" | "environment")
//
// Indices: 11/12 shoulders, 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels,
// 31/32 foot index (left = odd, right = even).

export const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const TASKS_VISION_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const TASKS_VISION_URL = `${TASKS_VISION_BASE}/vision_bundle.mjs`;

export const POSE_INDICES = [11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function buildPoseHtml(facing: "user" | "environment") {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #1C1B1A; overflow: hidden; }
  #wrap { position: relative; width: 100%; height: 100%; }
  video, canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
  video.mirror, canvas.mirror { transform: scaleX(-1); }
</style>
</head>
<body>
<div id="wrap">
  <video id="v" autoplay playsinline muted></video>
  <canvas id="c"></canvas>
</div>
<script type="module">
  const INDICES = ${JSON.stringify(POSE_INDICES)};
  const CONNECTIONS = [[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[27,31],[24,26],[26,28],[28,30],[28,32]];
  let facing = ${JSON.stringify(facing)};
  const video = document.getElementById("v");
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let landmarker = null;
  let stream = null;
  let lastVideoTime = -1;
  let running = false;

  const send = (m) => {
    const s = JSON.stringify(m);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(s);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(s, "*");
    }
  };
  const fail = (message) => send({ type: "error", message: String(message) });

  const applyMirror = () => {
    const mirror = facing === "user";
    video.classList.toggle("mirror", mirror);
    canvas.classList.toggle("mirror", mirror);
  };

  async function startCamera() {
    send({ type: "status", stage: "camera" });
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API is not available in this view.");
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    video.srcObject = stream;
    await new Promise((resolve) => { video.onloadedmetadata = () => resolve(); });
    await video.play();
    applyMirror();
  }

  async function loadModel() {
    send({ type: "status", stage: "loading" });
    const vision = await import(${JSON.stringify(TASKS_VISION_URL)});
    const { PoseLandmarker, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(${JSON.stringify(TASKS_VISION_BASE + "/wasm")});
    const options = {
      baseOptions: { modelAssetPath: ${JSON.stringify(POSE_MODEL_URL)}, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, options);
    } catch (e) {
      options.baseOptions.delegate = "CPU";
      landmarker = await PoseLandmarker.createFromOptions(fileset, options);
    }
  }

  function draw(lm) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!lm) return;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(214, 206, 194, 0.95)";
    for (const [a, b] of CONNECTIONS) {
      const p = lm[a], q = lm[b];
      if (!p || !q || (p.visibility ?? 1) < 0.3 || (q.visibility ?? 1) < 0.3) continue;
      ctx.beginPath(); ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(q.x * w, q.y * h); ctx.stroke();
    }
    ctx.fillStyle = "rgba(163, 124, 75, 0.95)";
    for (const i of INDICES) {
      const p = lm[i];
      if (!p || (p.visibility ?? 1) < 0.3) continue;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function fitCanvas() {
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) { canvas.width = vw; canvas.height = vh; }
  }

  function loop() {
    if (!running) return;
    if (landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      fitCanvas();
      const now = performance.now();
      let result = null;
      try { result = landmarker.detectForVideo(video, now); } catch (e) { fail("Pose detection failed: " + e); running = false; return; }
      const lm = result && result.landmarks && result.landmarks[0];
      const wl = result && result.worldLandmarks && result.worldLandmarks[0];
      draw(lm);
      if (lm) {
        const img = {}, world = {};
        for (const i of INDICES) {
          const p = lm[i]; const q = wl ? wl[i] : null;
          img[i] = [+p.x.toFixed(4), +p.y.toFixed(4), +((p.visibility ?? 0)).toFixed(3)];
          if (q) world[i] = [+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4)];
        }
        send({ type: "pose", t: now, img, world });
      } else {
        send({ type: "nopose", t: now });
      }
    }
    requestAnimationFrame(loop);
  }

  window.__setFacing = async (next) => {
    facing = next;
    try { await startCamera(); } catch (e) { fail("Could not switch camera: " + e); }
  };

  (async () => {
    try {
      await startCamera();
      await loadModel();
      send({ type: "status", stage: "ready" });
      running = true;
      requestAnimationFrame(loop);
    } catch (e) {
      fail(e && e.message ? e.message : e);
    }
  })();
</script>
</body>
</html>`;
}
