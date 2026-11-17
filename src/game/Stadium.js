/**
 * Stadium and Pitch builder
 */

import * as THREE from 'three';

const FIELD_L = 105;
const FIELD_W = 68;

export class Stadium {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.lighting = options.lighting || 'night';
    this.quality = options.quality || 'medium';
  }

  async build() {
    this.createPitch();
    this.createGoals();
    this.createStands();
    this.createLights();
    this.createAtmosphere();
  }

  createPitch() {
    const grassGeo = new THREE.PlaneGeometry(FIELD_W + 4, FIELD_L + 4, 32, 64);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1a7a3a,
      roughness: 0.85,
      metalness: 0.05
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    const stripeCount = 12;
    const stripeW = FIELD_L / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      if (i % 2 === 0) continue;
      const stripeGeo = new THREE.PlaneGeometry(FIELD_W, stripeW * 0.98);
      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0x228b45,
        roughness: 0.9,
        transparent: true,
        opacity: 0.35
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.y = 0.01;
      stripe.position.z = -FIELD_L / 2 + stripeW * (i + 0.5);
      this.scene.add(stripe);
    }

    this.addLine(-FIELD_W / 2, FIELD_W / 2, -FIELD_L / 2, -FIELD_L / 2);
    this.addLine(-FIELD_W / 2, FIELD_W / 2, FIELD_L / 2, FIELD_L / 2);
    this.addLine(-FIELD_W / 2, -FIELD_W / 2, -FIELD_L / 2, FIELD_L / 2);
    this.addLine(FIELD_W / 2, FIELD_W / 2, -FIELD_L / 2, FIELD_L / 2);
    this.addLine(-FIELD_W / 2, FIELD_W / 2, 0, 0);

    this.addCircle(0, 0, 9.15);

    this.addRect(-20.16 / 2, 20.16 / 2, -FIELD_L / 2, -FIELD_L / 2 + 16.5);
    this.addRect(-20.16 / 2, 20.16 / 2, FIELD_L / 2 - 16.5, FIELD_L / 2);
    this.addRect(-40.32 / 2, 40.32 / 2, -FIELD_L / 2, -FIELD_L / 2 + 5.5);
    this.addRect(-40.32 / 2, 40.32 / 2, FIELD_L / 2 - 5.5, FIELD_L / 2);

    this.addCircle(0, -FIELD_L / 2 + 11, 0.2, true);
    this.addCircle(0, FIELD_L / 2 - 11, 0.2, true);
    this.addCircle(0, 0, 0.25, true);
  }

  addLine(x1, x2, z1, z2) {
    const points = [
      new THREE.Vector3(x1, 0.02, z1),
      new THREE.Vector3(x2, 0.02, z2)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
  }

  addCircle(x, z, radius, filled = false) {
    if (filled) {
      const geo = new THREE.CircleGeometry(radius, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.025, z);
      this.scene.add(mesh);
    } else {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(48).map(p => new THREE.Vector3(p.x + x, 0.02, p.y + z));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
      this.scene.add(new THREE.LineLoop(geo, mat));
    }
  }

  addRect(x1, x2, z1, z2) {
    this.addLine(x1, x2, z1, z1);
    this.addLine(x1, x2, z2, z2);
    this.addLine(x1, x1, z1, z2);
    this.addLine(x2, x2, z1, z2);
  }

  createGoals() {
    const goalW = 7.32;
    const goalH = 2.44;
    const postR = 0.12;
    const depth = 2.0;

    const createGoal = (zSign) => {
      const group = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.3, roughness: 0.4 });
      const netMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.25, side: THREE.DoubleSide });

      const postGeo = new THREE.CylinderGeometry(postR, postR, goalH, 8);
      const left = new THREE.Mesh(postGeo, postMat);
      left.position.set(-goalW / 2, goalH / 2, 0);
      left.castShadow = true;
      group.add(left);

      const right = new THREE.Mesh(postGeo, postMat);
      right.position.set(goalW / 2, goalH / 2, 0);
      right.castShadow = true;
      group.add(right);

      const barGeo = new THREE.CylinderGeometry(postR, postR, goalW, 8);
      const bar = new THREE.Mesh(barGeo, postMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, goalH, 0);
      bar.castShadow = true;
      group.add(bar);

      const netGeo = new THREE.PlaneGeometry(goalW, goalH);
      const net = new THREE.Mesh(netGeo, netMat);
      net.position.set(0, goalH / 2, -depth * zSign * 0.3);
      group.add(net);

      const sideGeo = new THREE.PlaneGeometry(depth, goalH);
      const leftNet = new THREE.Mesh(sideGeo, netMat);
      leftNet.position.set(-goalW / 2, goalH / 2, -depth * 0.5 * zSign);
      leftNet.rotation.y = Math.PI / 2;
      group.add(leftNet);
      const rightNet = new THREE.Mesh(sideGeo, netMat);
      rightNet.position.set(goalW / 2, goalH / 2, -depth * 0.5 * zSign);
      rightNet.rotation.y = -Math.PI / 2;
      group.add(rightNet);

      group.position.z = zSign * (FIELD_L / 2 + 0.1);
      this.scene.add(group);
    };

    createGoal(1);
    createGoal(-1);
  }

  createStands() {
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.9 });
    const crowdMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 1 });

    const createStand = (w, h, d, x, z, rotY = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const stand = new THREE.Mesh(geo, standMat);
      stand.position.set(x, h / 2 - 0.5, z);
      stand.rotation.y = rotY;
      stand.castShadow = true;
      stand.receiveShadow = true;
      this.scene.add(stand);

      if (this.quality !== 'low') {
        const crowdGeo = new THREE.BoxGeometry(w * 0.95, h * 0.4, d * 0.3);
        const crowd = new THREE.Mesh(crowdGeo, crowdMat);
        crowd.position.set(x, h * 0.55, z);
        crowd.rotation.y = rotY;
        this.scene.add(crowd);
      }
    };

    createStand(FIELD_W + 20, 12, 15, 0, FIELD_L / 2 + 12);
    createStand(FIELD_W + 20, 12, 15, 0, -FIELD_L / 2 - 12);
    createStand(15, 10, FIELD_L + 10, FIELD_W / 2 + 12, 0, Math.PI / 2);
    createStand(15, 10, FIELD_L + 10, -FIELD_W / 2 - 12, 0, Math.PI / 2);
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0x404860, this.lighting === 'day' ? 0.7 : 0.35);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(
      this.lighting === 'day' ? 0x87ceeb : 0x1a2a4a,
      0x1a3a1a,
      this.lighting === 'day' ? 0.6 : 0.3
    );
    this.scene.add(hemi);

    const createFlood = (x, z) => {
      const light = new THREE.SpotLight(0xfff5e0, this.lighting === 'day' ? 0.8 : 2.2, 150, Math.PI / 5, 0.4, 1);
      light.position.set(x, 28, z);
      light.target.position.set(0, 0, 0);
      light.castShadow = this.quality !== 'low';
      if (light.castShadow) {
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 10;
        light.shadow.camera.far = 120;
        light.shadow.bias = -0.001;
      }
      this.scene.add(light);
      this.scene.add(light.target);

      const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 28, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 14, z);
      this.scene.add(pole);
    };

    createFlood(FIELD_W / 2 + 8, FIELD_L / 2 + 5);
    createFlood(-FIELD_W / 2 - 8, FIELD_L / 2 + 5);
    createFlood(FIELD_W / 2 + 8, -FIELD_L / 2 - 5);
    createFlood(-FIELD_W / 2 - 8, -FIELD_L / 2 - 5);

    const dir = new THREE.DirectionalLight(
      this.lighting === 'day' ? 0xfff8e7 : 0xaaccff,
      this.lighting === 'day' ? 1.1 : 0.4
    );
    dir.position.set(30, 50, 20);
    dir.castShadow = this.quality === 'high';
    this.scene.add(dir);
  }

  createAtmosphere() {
    if (this.lighting === 'night' && this.quality !== 'low') {
      const starGeo = new THREE.BufferGeometry();
      const count = 400;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = 40 + Math.random() * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true });
      this.scene.add(new THREE.Points(starGeo, starMat));
    }
  }
}
