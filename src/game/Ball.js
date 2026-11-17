/**
 * Football with simple physics
 */

import * as THREE from 'three';

const FIELD_L = 105;
const FIELD_W = 68;
const BALL_RADIUS = 0.22;

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.radius = BALL_RADIUS;
    this.lastToucher = null;

    // Visual
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 18);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.35,
      metalness: 0.05
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    scene.add(this.mesh);
  }

  reset(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
  }

  kick(force, player) {
    this.velocity.add(force);
    this.lastToucher = player;
    // Clamp extreme speeds
    if (this.velocity.length() > 38) {
      this.velocity.setLength(38);
    }
  }

  update(dt, players, game) {
    // Gravity
    this.velocity.y -= 18 * dt;

    // Air resistance
    this.velocity.multiplyScalar(0.995);

    // Ground friction
    if (this.position.y <= this.radius + 0.01) {
      this.position.y = this.radius;
      if (this.velocity.y < 0) {
        this.velocity.y *= -0.45; // bounce
        if (Math.abs(this.velocity.y) < 0.8) this.velocity.y = 0;
      }
      // Rolling friction
      this.velocity.x *= 0.97;
      this.velocity.z *= 0.97;
    }

    // Integrate
    this.position.addScaledVector(this.velocity, dt);

    // Simple player collision / control
    players.forEach(p => {
      const dx = this.position.x - p.position.x;
      const dz = this.position.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = this.radius + 0.4;

      if (dist < minDist && this.position.y < 1.4) {
        // Push ball away / give control
        if (dist < 0.01) {
          this.position.x += 0.3;
        } else {
          const nx = dx / dist;
          const nz = dz / dist;
          this.position.x = p.position.x + nx * minDist;
          this.position.z = p.position.z + nz * minDist;

          // Transfer some velocity if player is moving into ball
          const rel = this.velocity.clone().sub(p.velocity);
          const impact = rel.x * nx + rel.z * nz;
          if (impact < 0) {
            this.velocity.x -= impact * nx * 1.4;
            this.velocity.z -= impact * nz * 1.4;
            this.velocity.x += p.velocity.x * 0.6;
            this.velocity.z += p.velocity.z * 0.6;
          }
        }
        this.lastToucher = p;
      }
    });

    // Pitch bounds (soft)
    const halfW = FIELD_W / 2 - 0.5;

    if (this.position.x < -halfW) {
      this.position.x = -halfW;
      this.velocity.x *= -0.6;
    } else if (this.position.x > halfW) {
      this.position.x = halfW;
      this.velocity.x *= -0.6;
    }

    // Back of goals / end lines (except goal openings)
    const goalHalf = 7.32 / 2;
    if (Math.abs(this.position.x) > goalHalf) {
      if (this.position.z < -FIELD_L / 2) {
        this.position.z = -FIELD_L / 2;
        this.velocity.z *= -0.5;
      } else if (this.position.z > FIELD_L / 2) {
        this.position.z = FIELD_L / 2;
        this.velocity.z *= -0.5;
      }
    }

    // Visual
    this.mesh.position.copy(this.position);

    // Spin visualization
    if (this.velocity.length() > 0.5) {
      const axis = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();
      this.mesh.rotateOnWorldAxis(axis, this.velocity.length() * dt * 0.8);
    }
  }
}
