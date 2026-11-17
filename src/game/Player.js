/**
 * Player entity with simple capsule body + animations
 */

import * as THREE from 'three';

export class Player {
  constructor(scene, options) {
    this.scene = scene;
    this.team = options.team;
    this.role = options.role || 'mid';
    this.id = options.id;
    this.isUser = options.isUser || false;
    this.color = options.color || 0x3b82f6;

    this.position = options.position.clone();
    this.velocity = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, this.team === 'home' ? -1 : 1);
    this.speed = 0;
    this.maxSpeed = this.role === 'gk' ? 7 : 9.5;
    this.sprintMul = 1.45;
    this.isSprinting = false;
    this.hasBall = false;
    this.kickCooldown = 0;
    this.animPhase = 0;

    this.group = new THREE.Group();
    this.buildMesh();
    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  buildMesh() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.6,
      metalness: 0.1
    });
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.95;
    this.body.castShadow = true;
    this.group.add(this.body);

    const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.75;
    this.head.castShadow = true;
    this.group.add(this.head);

    const shortsMat = new THREE.MeshStandardMaterial({
      color: this.team === 'home' ? 0x1e40af : 0x991b1b,
      roughness: 0.8
    });
    const shortsGeo = new THREE.BoxGeometry(0.7, 0.4, 0.45);
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = 0.55;
    this.group.add(shorts);

    const legMat = new THREE.MeshStandardMaterial({ color: 0xe8b88a });
    this.leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 3, 6), legMat);
    this.leftLeg.position.set(-0.18, 0.3, 0);
    this.group.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 3, 6), legMat);
    this.rightLeg.position.set(0.18, 0.3, 0);
    this.group.add(this.rightLeg);

    if (this.isUser) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 0.7, 16),
        new THREE.MeshBasicMaterial({ color: 0x00e5a0, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      this.group.add(ring);
    }
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.group.position.copy(this.position);
  }

  update(dt, ball, game) {
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);

    if (this.speed > 0.5) {
      this.animPhase += dt * this.speed * 3;
      const swing = Math.sin(this.animPhase) * 0.35;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.body.position.y = 0.95 + Math.abs(Math.sin(this.animPhase * 2)) * 0.04;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.body.position.y = 0.95;
    }

    this.position.addScaledVector(this.velocity, dt);
    this.group.position.copy(this.position);

    if (this.velocity.lengthSq() > 0.1) {
      this.facing.copy(this.velocity).normalize();
      const angle = Math.atan2(this.facing.x, this.facing.z);
      this.group.rotation.y = angle;
    }

    const dist = this.position.distanceTo(ball.position);
    this.hasBall = dist < 1.1 && ball.velocity.length() < 8;

    this.velocity.multiplyScalar(0.88);
    this.speed = this.velocity.length();
  }

  move(dirX, dirZ, sprint = false) {
    this.isSprinting = sprint;
    const max = this.maxSpeed * (sprint ? this.sprintMul : 1);
    const target = new THREE.Vector3(dirX, 0, dirZ);
    if (target.lengthSq() > 0.01) {
      target.normalize().multiplyScalar(max);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, target.x, 0.18);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, target.z, 0.18);
    }
  }

  shoot(ball) {
    if (this.kickCooldown > 0) return;
    const dist = this.position.distanceTo(ball.position);
    if (dist > 2.2) return;

    this.kickCooldown = 0.6;
    const power = this.isSprinting ? 28 : 22;
    const dir = this.facing.clone();
    dir.y = 0.25;
    dir.normalize();
    ball.kick(dir.multiplyScalar(power), this);
  }

  pass(ball, teammates) {
    if (this.kickCooldown > 0) return;
    const dist = this.position.distanceTo(ball.position);
    if (dist > 2.0) return;

    let best = null;
    let bestScore = -Infinity;
    teammates.forEach(t => {
      if (t === this) return;
      const toT = t.position.clone().sub(this.position);
      const distT = toT.length();
      if (distT < 3 || distT > 30) return;
      const align = toT.normalize().dot(this.facing);
      const score = align * 10 - distT * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    });

    this.kickCooldown = 0.4;
    if (best) {
      const dir = best.position.clone().sub(ball.position);
      dir.y = 0.15;
      dir.normalize();
      ball.kick(dir.multiplyScalar(16 + dist * 0.3), this);
    } else {
      const dir = this.facing.clone();
      dir.y = 0.1;
      ball.kick(dir.multiplyScalar(12), this);
    }
  }
}
