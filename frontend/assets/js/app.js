const API_BASE = window.APP_API_BASE || (window.location.origin.includes("localhost") ? "http://localhost:5000" : "https://agentic-6662a1b3-api.vercel.app");

const state = {
  token: localStorage.getItem("ft_jwt"),
  user: JSON.parse(localStorage.getItem("ft_user") || "null"),
  faceReady: false,
  workoutActive: false,
  detector: null,
  faceStream: null,
  workoutStream: null,
  charts: {},
};

const selectors = {
  welcomeTitle: document.getElementById("welcomeTitle"),
  mysqlStatus: document.getElementById("mysqlStatus"),
  mongoStatus: document.getElementById("mongoStatus"),
  totalUsers: document.getElementById("totalUsers"),
  attendanceChart: document.getElementById("attendanceChart"),
  postureChart: document.getElementById("postureChart"),
  dailyChart: document.getElementById("dailyChart"),
  weeklyChart: document.getElementById("weeklyChart"),
  monthlyChart: document.getElementById("monthlyChart"),
  attendanceTable: document.getElementById("attendanceTable").querySelector("tbody"),
  qrImage: document.getElementById("qrImage"),
  qrPayload: document.getElementById("qrPayload"),
  sessionList: document.getElementById("sessionList"),
  completionRate: document.getElementById("completionRate"),
  feedbackText: document.getElementById("feedbackText"),
  dietPlan: document.getElementById("dietPlan"),
  chatMessages: document.getElementById("chatMessages"),
  faceVideo: document.getElementById("faceVideo"),
  faceCanvas: document.getElementById("faceCanvas"),
  workoutVideo: document.getElementById("workoutVideo"),
  workoutCanvas: document.getElementById("workoutCanvas"),
};

function authHeaders() {
  return state.token
    ? {
        Authorization: `Bearer ${state.token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
}

async function registerUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = Object.fromEntries(new FormData(form));
  await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  form.reset();
  toast("Registration successful. Please login", "success");
}

async function loginUser(event) {
  event.preventDefault();
  if (!state.faceReady) {
    toast("Face detection not active yet", "error");
    return;
  }
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    toast("Invalid credentials", "error");
    return;
  }
  const payload = await res.json();
  state.token = payload.access_token;
  state.user = payload.user;
  localStorage.setItem("ft_jwt", state.token);
  localStorage.setItem("ft_user", JSON.stringify(state.user));
  updateWelcome();
  toast(`Welcome back ${state.user.full_name.split(" ")[0]}!`, "success");
  refreshDashboard();
  fetchAttendanceHistory();
  fetchPostureHistory();
}

function updateWelcome() {
  if (state.user) {
    selectors.welcomeTitle.textContent = `Hello, ${state.user.full_name}`;
  }
}

async function refreshDashboard() {
  if (!state.token) return;
  const res = await fetch(`${API_BASE}/api/analytics/dashboard`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const data = await res.json();
  const { mysql_connected, mongo_connected } = data.database_status;
  setIndicator(selectors.mysqlStatus, mysql_connected);
  setIndicator(selectors.mongoStatus, mongo_connected);
  selectors.totalUsers.textContent = data.totals.total_users;
  buildAttendanceChart(data.attendance_summary);
  buildPostureChart(data.posture_summary.accuracy_trend);
  buildProgressCharts(data);
}

function setIndicator(element, status) {
  element.className = "status-indicator";
  if (status) {
    element.classList.add("status-indicator--ok");
    element.textContent = "Online";
  } else {
    element.classList.add("status-indicator--error");
    element.textContent = "Offline";
  }
}

function buildAttendanceChart(summary) {
  const labels = Object.keys(summary);
  const checkins = labels.map((label) => summary[label].checkins);
  const checkouts = labels.map((label) => summary[label].checkouts);
  createChart(
    selectors.attendanceChart,
    "line",
    {
      labels,
      datasets: [
        {
          label: "Check-ins",
          data: checkins,
          borderColor: "#38bdf8",
          tension: 0.4,
        },
        {
          label: "Check-outs",
          data: checkouts,
          borderColor: "#22d3ee",
          tension: 0.4,
        },
      ],
    },
    {
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue("--text") } } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
      },
    }
  );
}

function buildPostureChart(trend) {
  const labels = trend.map((item) => new Date(item.timestamp).toLocaleString());
  const completion = trend.map((item) => item.completion);
  createChart(
    selectors.postureChart,
    "bar",
    {
      labels,
      datasets: [
        {
          label: "Completion %",
          data: completion,
          backgroundColor: "rgba(34, 211, 238, 0.35)",
        },
      ],
    },
    {
      plugins: { legend: { labels: { color: getComputedStyle(document.body).getPropertyValue("--text") } } },
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
        y: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
      },
    }
  );
}

function buildProgressCharts(data) {
  const summary = data.attendance_summary;
  const labels = Object.keys(summary);
  const counts = labels.map((label) => summary[label].checkins + summary[label].checkouts);
  createChart(
    selectors.dailyChart,
    "line",
    {
      labels,
      datasets: [
        {
          label: "Daily",
          data: counts,
          borderColor: "#2563eb",
          tension: 0.5,
          fill: true,
          backgroundColor: "rgba(37, 99, 235, 0.25)",
        },
      ],
    }
  );
  const weekly = aggregateSeries(labels, counts, 7);
  createChart(
    selectors.weeklyChart,
    "bar",
    {
      labels: weekly.labels,
      datasets: [
        {
          label: "Weekly",
          data: weekly.values,
          backgroundColor: "rgba(34, 197, 94, 0.35)",
        },
      ],
    }
  );
  const monthly = aggregateSeries(labels, counts, 30);
  createChart(
    selectors.monthlyChart,
    "line",
    {
      labels: monthly.labels,
      datasets: [
        {
          label: "Monthly Calories",
          data: monthly.values.map((v) => Math.round(v * 35)),
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.25)",
          tension: 0.4,
        },
      ],
    }
  );
}

function aggregateSeries(labels, values, groupSize) {
  const result = { labels: [], values: [] };
  for (let i = 0; i < labels.length; i += groupSize) {
    const slice = values.slice(i, i + groupSize);
    if (!slice.length) continue;
    const label = `${labels[i]} - ${labels[Math.min(labels.length - 1, i + slice.length - 1)]}`;
    result.labels.push(label);
    result.values.push(slice.reduce((acc, val) => acc + val, 0));
  }
  return result;
}

function createChart(canvas, type, data, options = {}) {
  if (!canvas) return;
  const key = canvas.id;
  if (state.charts[key]) {
    state.charts[key].destroy();
  }
  state.charts[key] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
    },
  });
}

async function generateQr(event) {
  event.preventDefault();
  if (!state.user) return toast("Login required", "error");
  const form = event.currentTarget;
  const payload = {
    user_id: state.user.id,
    check_type: form.check_type.value,
  };
  const res = await fetch(`${API_BASE}/api/attendance/generate-qr`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) return;
  const data = await res.json();
  selectors.qrImage.src = `data:image/png;base64,${data.qr_image}`;
  selectors.qrPayload.textContent = JSON.stringify(data.payload, null, 2);
  await fetch(`${API_BASE}/api/attendance/log`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      user_id: state.user.id,
      check_type: form.check_type.value,
      token: data.payload.token,
    }),
  });
  fetchAttendanceHistory();
  refreshDashboard();
}

async function fetchAttendanceHistory() {
  if (!state.user) return;
  const res = await fetch(`${API_BASE}/api/attendance/history/${state.user.id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const logs = await res.json();
  selectors.attendanceTable.innerHTML = logs
    .map(
      (log) => `
        <tr>
          <td>${log.check_type}</td>
          <td>${log.qr_token.slice(0, 8)}…</td>
          <td>${new Date(log.timestamp).toLocaleString()}</td>
        </tr>
      `
    )
    .join("");
}

async function fetchDietPlan(event) {
  if (event) event.preventDefault();
  if (!state.token) return toast("Login required", "error");
  const form = event ? event.currentTarget : document.getElementById("dietForm");
  const formData = Object.fromEntries(new FormData(form));
  const params = new URLSearchParams(formData);
  const res = await fetch(`${API_BASE}/api/diet/plans?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const data = await res.json();
  renderDietPlan(data);
}

function renderDietPlan(data) {
  const { sections, target_calories, macros_table } = data;
  selectors.dietPlan.innerHTML = `
    <div class="diet-summary">
      <h3>Daily Calories: ${target_calories}</h3>
      <p>Balanced according to your activity profile.</p>
    </div>
    <div class="diet-sections">
      ${Object.entries(sections)
        .map(
          ([meal, info]) => `
          <div class="diet-sections__item">
            <h4>${formatMeal(meal)}</h4>
            <p>${info.items.join(", ")}</p>
            <div class="macros">
              <span>Protein: ${info.macros.protein}g</span>
              <span>Carbs: ${info.macros.carbs}g</span>
              <span>Fats: ${info.macros.fats}g</span>
              <span>Calories: ${info.macros.calories}</span>
            </div>
          </div>
        `
        )
        .join("")}
    </div>
    <div class="diet-macros">
      <h4>Total Macros</h4>
      <ul>
        <li>Protein: ${macros_table.totals.protein} g</li>
        <li>Carbohydrates: ${macros_table.totals.carbs} g</li>
        <li>Fats: ${macros_table.totals.fats} g</li>
        <li>Calories: ${macros_table.totals.calories}</li>
      </ul>
    </div>
  `;
}

function formatMeal(meal) {
  return meal.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function initFaceDetection() {
  try {
    state.faceStream = await navigator.mediaDevices.getUserMedia({ video: true });
    selectors.faceVideo.srcObject = state.faceStream;
    const detector = window.FaceDetector ? new FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null;
    const ctx = selectors.faceCanvas.getContext("2d");

    async function detect() {
      if (!state.faceStream) return;
      const { videoWidth, videoHeight } = selectors.faceVideo;
      selectors.faceCanvas.width = videoWidth;
      selectors.faceCanvas.height = videoHeight;
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (detector) {
        try {
          const faces = await detector.detect(selectors.faceVideo);
          if (faces.length) {
            const { boundingBox } = faces[0];
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 3;
            ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
            state.faceReady = true;
          }
        } catch (err) {
          console.error(err);
        }
      } else if (window.faceapi) {
        await ensureFaceModel();
        const detection = await window.faceapi
          .detectSingleFace(selectors.faceVideo, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);
        if (detection) {
          const dims = faceapi.matchDimensions(selectors.faceCanvas, selectors.faceVideo, true);
          const resized = faceapi.resizeResults(detection, dims);
          faceapi.draw.drawDetections(selectors.faceCanvas, resized);
          state.faceReady = true;
        }
      }
      requestAnimationFrame(detect);
    }
    detect();
  } catch (error) {
    toast("Camera permission denied for face detection", "error");
  }
}

let faceModelLoaded = false;
async function ensureFaceModel() {
  if (faceModelLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"),
  ]);
  faceModelLoaded = true;
}

async function initWorkoutDetector() {
  state.workoutStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  selectors.workoutVideo.srcObject = state.workoutStream;
  state.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  });
}

async function startWorkoutSession() {
  if (!state.user) return toast("Login required", "error");
  if (!state.detector) await initWorkoutDetector();
  state.workoutActive = true;
  state.sessionFrames = [];
  analyseFrame();
}

function stopWorkoutSession() {
  state.workoutActive = false;
  if (state.sessionFrames?.length) {
    const average = Math.round(
      state.sessionFrames.reduce((acc, frame) => acc + frame.completion, 0) / state.sessionFrames.length
    );
    saveSession(average, state.sessionFrames[state.sessionFrames.length - 1]?.feedback || "Great job!");
  }
}

async function saveSession(averageCompletion, feedback) {
  await fetch(`${API_BASE}/api/posture/session`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      user_id: state.user.id,
      exercise: document.getElementById("exerciseSelect").value,
      frames: state.sessionFrames.slice(-120),
      average_completion: averageCompletion,
      feedback,
    }),
  });
  fetchPostureHistory();
  refreshDashboard();
}

async function analyseFrame() {
  if (!state.workoutActive || !state.detector) return;
  const poses = await state.detector.estimatePoses(selectors.workoutVideo, { flipHorizontal: false });
  const ctx = selectors.workoutCanvas.getContext("2d");
  const { videoWidth, videoHeight } = selectors.workoutVideo;
  selectors.workoutCanvas.width = videoWidth;
  selectors.workoutCanvas.height = videoHeight;
  ctx.clearRect(0, 0, videoWidth, videoHeight);
  if (!poses.length) {
    selectors.feedbackText.textContent = "Align your body within the frame";
    selectors.completionRate.textContent = "0%";
    requestAnimationFrame(analyseFrame);
    return;
  }
  const pose = poses[0];
  drawSkeleton(ctx, pose.keypoints);
  const metrics = computeMetrics(pose.keypoints);
  selectors.completionRate.textContent = `${metrics.completion}%`;
  selectors.feedbackText.textContent = metrics.feedback;
  state.sessionFrames.push({ timestamp: Date.now(), ...metrics });
  requestAnimationFrame(analyseFrame);
}

function drawSkeleton(ctx, keypoints) {
  const connections = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
  connections.forEach(([a, b]) => {
    const kp1 = keypoints[a];
    const kp2 = keypoints[b];
    if (kp1.score > 0.4 && kp2.score > 0.4) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
  keypoints.forEach((kp) => {
    if (kp.score > 0.4) {
      const gradient = ctx.createRadialGradient(kp.x, kp.y, 0, kp.x, kp.y, 10);
      gradient.addColorStop(0, "#22d3ee");
      gradient.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function computeMetrics(keypoints) {
  const joints = labelKeypoints(keypoints);
  const exercise = document.getElementById("exerciseSelect").value;
  let completion = 0;
  let feedback = "Good posture";

  if (exercise === "hand_raises") {
    const left = angle(joints.leftShoulder, joints.leftElbow, joints.leftWrist);
    const right = angle(joints.rightShoulder, joints.rightElbow, joints.rightWrist);
    const avg = (left + right) / 2;
    completion = Math.min(100, Math.max(0, Math.round((avg / 180) * 100)));
    if (avg < 70) feedback = "Lift arms higher";
    else if (avg > 160) feedback = "Hold steady at the top";
  } else {
    const hip = angle(joints.leftShoulder, joints.leftHip, joints.leftKnee);
    completion = Math.min(100, Math.max(0, Math.round(((180 - hip) / 180) * 100)));
    if (hip > 150) feedback = "Lower torso further";
    else if (hip < 70) feedback = "Raise torso slowly";
  }
  return { completion, feedback, joints: joints.raw, angles: joints.angles };
}

function labelKeypoints(keypoints) {
  const map = {};
  keypoints.forEach((kp) => {
    map[kp.name] = kp;
  });
  return {
    raw: map,
    angles: {},
    leftShoulder: map["left_shoulder"],
    leftElbow: map["left_elbow"],
    leftWrist: map["left_wrist"],
    rightShoulder: map["right_shoulder"],
    rightElbow: map["right_elbow"],
    rightWrist: map["right_wrist"],
    leftHip: map["left_hip"],
    leftKnee: map["left_knee"],
    leftAnkle: map["left_ankle"],
  };
}

function angle(a, b, c) {
  if (!a || !b || !c) return 0;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  const cosine = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

async function fetchPostureHistory() {
  if (!state.user) return;
  const res = await fetch(`${API_BASE}/api/posture/history/${state.user.id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const sessions = await res.json();
  selectors.sessionList.innerHTML = sessions
    .slice(0, 5)
    .map(
      (session) => `
        <li>
          <strong>${session.exercise}</strong>
          <div>${new Date(session.timestamp).toLocaleString()}</div>
          <div>Completion: ${session.average_completion}%</div>
        </li>
      `
    )
    .join("");
}

async function submitChat(event) {
  event.preventDefault();
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  pushMessage(message, "user");
  input.value = "";
  const res = await fetch(`${API_BASE}/api/chatbot/ask`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ prompt: message }),
  });
  if (!res.ok) {
    pushMessage("Sorry, I had trouble answering that.", "bot");
    return;
  }
  const data = await res.json();
  pushMessage(data.answer, "bot");
}

function pushMessage(text, role) {
  const el = document.createElement("div");
  el.className = `chatbot__message chatbot__message--${role}`;
  el.textContent = text;
  selectors.chatMessages.append(el);
  selectors.chatMessages.scrollTop = selectors.chatMessages.scrollHeight;
}

function toast(message, type = "info") {
  const div = document.createElement("div");
  div.textContent = message;
  div.className = `toast toast--${type}`;
  document.body.append(div);
  setTimeout(() => div.classList.add("visible"));
  setTimeout(() => {
    div.classList.remove("visible");
    setTimeout(() => div.remove(), 400);
  }, 3200);
}

function setupNav() {
  document.querySelectorAll(".nav__link").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".section").forEach((section) => section.classList.remove("section--active"));
      document.querySelectorAll(".nav__link").forEach((nav) => nav.classList.remove("active"));
      document.getElementById(button.dataset.target).classList.add("section--active");
      button.classList.add("active");
    });
  });
}

function setupThemeSwitcher() {
  const switcher = document.getElementById("themeSwitcher");
  switcher.checked = document.body.classList.contains("theme-light");
  switcher.addEventListener("change", () => {
    document.body.classList.toggle("theme-light", switcher.checked);
    document.body.classList.toggle("theme-dark", !switcher.checked);
    refreshDashboard();
  });
}

function setupForms() {
  document.getElementById("registerForm").addEventListener("submit", registerUser);
  document.getElementById("loginForm").addEventListener("submit", loginUser);
  document.getElementById("qrForm").addEventListener("submit", generateQr);
  document.getElementById("dietForm").addEventListener("submit", fetchDietPlan);
  document.getElementById("chatForm").addEventListener("submit", submitChat);
  document.getElementById("startWorkout").addEventListener("click", startWorkoutSession);
  document.getElementById("stopWorkout").addEventListener("click", stopWorkoutSession);
}

function initToasts() {
  const style = document.createElement("style");
  style.innerHTML = `
    .toast {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(15, 23, 42, 0.92);
      color: #e2e8f0;
      padding: 0.9rem 1.4rem;
      border-radius: 0.85rem;
      transform: translateY(-20px);
      opacity: 0;
      transition: all 0.35s ease;
      z-index: 999;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .toast.visible {
      transform: translateY(0);
      opacity: 1;
    }
    .toast--error { border-color: rgba(239, 68, 68, 0.45); }
    .toast--success { border-color: rgba(34, 197, 94, 0.45); }
  `;
  document.head.append(style);
}

function restoreSession() {
  if (state.user) {
    updateWelcome();
    fetchAttendanceHistory();
    fetchPostureHistory();
    refreshDashboard();
    fetchDietPlan();
  }
}

function initNavObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section--visible");
        }
      });
    },
    { threshold: 0.35 }
  );
  document.querySelectorAll(".card").forEach((card) => observer.observe(card));
}

function init() {
  document.body.classList.add("theme-dark");
  setupNav();
  setupForms();
  setupThemeSwitcher();
  initToasts();
  initFaceDetection();
  restoreSession();
  initNavObserver();
}

document.addEventListener("DOMContentLoaded", init);
