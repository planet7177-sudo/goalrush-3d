/**
 * Smooth camera follow / broadcast modes
 */

import * as THREE from 'three';

export class CameraController {
  constructor(camera, game) {
    this.camera = camera;
    this.game = game;
    this.mode = game.settings.cameraMode || 'follow';
    this.offset = new THREE.Vector3(0, 18, 28);
    this.lookAt = new THREE.Vector3();
    this.smooth = 0.06;
  }

  update(dt) {
    const ball = this.game.ball;
    const player = this.game.controlledPlayer;

    if (this.mode === 'follow' && player) {
      // Behind player looking toward ball
      const behind = player.facing.clone().multiplyScalar(-18);
      behind.y = 14;
      const desired = player.position.clone().add(behind);
      // Bias toward ball
      desired.x = THREE.MathUtils.lerp(desired.x, ball.position.x, 0.25);
      desired.z = THREE.MathUtils.lerp(desired.z, ball.position.z + player.facing.z * 8, 0.2);

      this.camera.position.lerp(desired, this.smooth * 60 * dt);
      this.lookAt.lerp(
        new THREE.Vector3(
          THREE.MathUtils.lerp(player.position.x, ball.position.x, 0.5),
          1,
          THREE.MathUtils.lerp(player.position.z, ball.position.z, 0.6)
        ),
        this.smooth * 50 * dt
      );
      this.camera.lookAt(this.lookAt);
    } else if (this.mode === 'broadcast') {
      // High side camera following ball
      const desired = new THREE.Vector3(
        ball.position.x * 0.3,
        28,
        ball.position.z + 35
      );
      this.camera.position.lerp(desired, 0.04);
      this.camera.lookAt(ball.position.x, 0, ball.position.z);
    } else {
      // Free / default elevated
      this.camera.position.lerp(
        new THREE.Vector3(ball.position.x * 0.2, 30, ball.position.z + 40),
        0.03
      );
      this.camera.lookAt(ball.position.x, 0, ball.position.z);
    }
  }
}
