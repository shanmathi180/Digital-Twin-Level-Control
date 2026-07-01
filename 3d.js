import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 18);
camera.lookAt(0, 4, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xf0f2f5, 1);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(5, 10, 7);
scene.add(light);

const TANK_MAX = 13.0, V_SCALE = 0.6, RADIUS = 2.0, HEIGHT_3D = TANK_MAX * V_SCALE;

// 1. Base & Tank
const base = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS * 1.1, RADIUS * 1.1, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0x222222 }));
scene.add(base);

const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT_3D, 64, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
);
tank.position.y = HEIGHT_3D / 2;
scene.add(tank);

// 2. Water
const water = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS * 0.99, RADIUS * 0.99, 1, 64),
    new THREE.MeshPhongMaterial({ color: 0x5d8aa8, transparent: true, opacity: 0.7 })
);
scene.add(water);

// 3. Pipes
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const pipeGeom = new THREE.CylinderGeometry(0.25, 0.25, 3, 32);
const inlet = new THREE.Mesh(pipeGeom, pipeMat);
inlet.rotation.z = Math.PI / 2;
inlet.position.set(-RADIUS - 1, HEIGHT_3D * 0.85, 0);
scene.add(inlet);

const outlet = new THREE.Mesh(pipeGeom, pipeMat);
outlet.rotation.z = Math.PI / 2;
outlet.position.set(RADIUS + 1, 0.2, 0);
scene.add(outlet);

// 4. Ruler Marks & Labels
const labels = [];
const labelContainer = document.getElementById('labels');

for (let i = 1; i <= TANK_MAX; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x999999 }));
    const yPos = i * V_SCALE;
    tick.position.set(RADIUS + 0.3, yPos, 0);
    scene.add(tick);

    const div = document.createElement('div');
    div.className = 'scale-mark';
    div.innerText = i + " cm";
    labelContainer.appendChild(div);
    labels.push({ div, pos: new THREE.Vector3(RADIUS + 1.2, yPos, 0) });
}

function updateLabels() {
    labels.forEach(label => {
        const screenPos = label.pos.clone().project(camera);
        label.div.style.left = (screenPos.x + 1) * 50 + '%';
        label.div.style.top = (-screenPos.y + 1) * 50 + '%';
    });
}

// 5. Data Loop
let lastH = 0;
setInterval(async () => {
    try {
        const res = await fetch('/data');
        const data = await res.json();
        const currentH = data.height || 0;
        const targetH = data.setpoint || 0;

        water.scale.y = Math.max(0.001, currentH * V_SCALE);
        water.position.y = (currentH * V_SCALE) / 2;

        document.getElementById("levelText").innerText = currentH.toFixed(1);
        document.getElementById("percentText").innerText = `Fill: ${Math.round((currentH / TANK_MAX) * 100)}%`;

        const changeRate = currentH - lastH;
        const dist = targetH - currentH;
        
        document.getElementById("trendText").innerText = Math.abs(changeRate) < 0.01 ? "Stable" : (changeRate > 0 ? "Rising ↑" : "Falling ↓");
        
        if (Math.abs(dist) < 0.2) document.getElementById("timeText").innerText = "Reached";
        else if (Math.abs(changeRate) > 0.001) document.getElementById("timeText").innerText = Math.round(Math.abs(dist / (changeRate * 2))) + "s";
        else document.getElementById("timeText").innerText = "--";

        lastH = currentH;
    } catch (e) { document.getElementById("levelText").innerText = "0.0"; }
}, 500);

function animate() {
    requestAnimationFrame(animate);
    updateLabels();
    renderer.render(scene, camera);
}
animate();

document.getElementById("sendSetPoint").onclick = () => {
    fetch('/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setpoint: document.getElementById("setPointInput").value })
    });
};
