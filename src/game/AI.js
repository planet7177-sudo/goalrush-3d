/**
 * Simple but effective AI for opponents and teammate support
 */

import * as THREE from 'three';

export class AIController {
  constructor(game) {
    this.game = game;
    this.thinkTimer = 0;
  }

  update(dt) {
    this.thinkTimer += dt;
    if (this.thinkTimer < 0.08) return; // think every ~80ms
    this.thinkTimer = 0;

    const ball = this.game.ball;
    const ballPos = ball.position;

    // Away team AI (opponents)
    this.game.awayTeam.forEach(p => {
      this.controlPlayer(p, ballPos, 'away');
    });

    // Home team AI for non-controlled players
    this.game.homeTeam.forEach(p => {
      if (p.isUser) return;
      this.controlPlayer(p, ballPos, 'home');
    });
  }

  controlPlayer(p, ballPos, team) {
    const isGK = p.role === 'gk';
    const toBall = ballPos.clone().sub(p.position);
    const dist = toBall.length();
    const goalTarget = team === 'home' 
      ? new THREE.Vector3(0, 0, -52) 
      : new THREE.Vector3(0, 0, 52);
    const ownGoal = team === 'home'
      ? new THREE.Vector3(0, 0, 52)
      : new THREE.Vector3(0, 0, -52);

    if (isGK) {
      // Goalkeeper stays near goal, dives toward ball if close
      const gkHome = team === 'home' ? 48 : -48;
      const targetX = THREE.MathUtils.clamp(ballPos.x * 0.4, -6, 6);
      const targetZ = gkHome;
      const toTarget = new THREE.Vector3(targetX - p.position.x, 0, targetZ - p.position.z);
      if (toTarget.length() > 0.5) {
        toTarget.normalize();
        p.move(toTarget.x, toTarget.z, false);
      }
      // Clear if ball is very close
      if (dist < 2.5 && Math.abs(ballPos.z - gkHome) < 8) {
        const clearDir = ballPos.clone().sub(ownGoal).normalize();
        clearDir.y = 0.3;
        this.game.ball.kick(clearDir.multiplyScalar(18), p);
        p.kickCooldown = 0.8;
      }
      return;
    }

    // Field players
    let target = null;
    let sprint = false;

    // Decision tree
    if (dist < 2.5 && p.kickCooldown <= 0) {
      // Has chance to kick
      const toGoal = goalTarget.clone().sub(p.position);
      if (toGoal.length() < 22 && Math.random() > 0.35) {
        // Shoot
        const dir = toGoal.normalize();
        dir.y = 0.22 + Math.random() * 0.1;
        // Slight accuracy variation
        dir.x += (Math.random() - 0.5) * 0.15;
        this.game.ball.kick(dir.multiplyScalar(20 + Math.random() * 6), p);
        p.kickCooldown = 0.7;
      } else {
        // Pass or dribble forward
        p.pass(this.game.ball, team === 'home' ? this.game.homeTeam : this.game.awayTeam);
      }
    } else if (dist < 12) {
      // Chase ball
      target = ballPos;
      sprint = dist > 5;
    } else {
      // Move to strategic position
      if (team === 'away') {
        // Press higher if ball is in our half
        target = new THREE.Vector3(
          ballPos.x * 0.5 + (Math.random() - 0.5) * 4,
          0,
          Math.max(ballPos.z - 6, -35)
        );
      } else {
        target = new THREE.Vector3(
          ballPos.x * 0.4,
          0,
          Math.min(ballPos.z + 5, 30)
        );
      }
    }

    if (target) {
      const dir = target.clone().sub(p.position);
      dir.y = 0;
      if (dir.length() > 0.8) {
        dir.normalize();
        p.move(dir.x, dir.z, sprint);
      }
    }
  }
}
