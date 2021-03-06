import { Bodies, Body, World } from "matter-js";
import Config from "config";
import Helpers from "../../utils/helpers";

import Controls from "./controls";
import Fireball from "./fireball";

const SCALE = Config.scale,
  WIDTH_S = Config.player.wS,
  WIDTH_B = Config.player.wB,
  STARTING_POS = Config.player.startingPos,
  TEXTURES_DIR = Config.player.texturesDir,
  DELTA_FRAMES = Config.player.dFrames,
  GRACE_PERIOD = Config.player.graceP,
  GameObject = Helpers.GameObject();

export default class Player extends GameObject {
  constructor(globalTextures, world) {
    super(
      STARTING_POS.x,
      STARTING_POS.y,
      WIDTH_S,
      1,
      TEXTURES_DIR.small,
      globalTextures["mario_standing.png"],
      "player",
      false,
      DELTA_FRAMES
    );
    this.world = world;
    this.globalTextures = globalTextures;
    this.controls = new Controls(this);
    this.accel = 0;
    this.backwards = false;
    this.onGround = true;
    this.state = "small";
    this.grace = false;
    this.graceP = 0;
    this.fireballs = [];
  }

  hit(body) {
    if (body.position.y > this.body.position.y) this.onGround = true;
  }

  update() {
    if (
      this.sprite.getGlobalPosition().x > window.innerWidth / 2 &&
      !this.backwards
    )
      this.sprite.parent.x -=
        this.sprite.getGlobalPosition().x - window.innerWidth / 2;
    super.update();
    this.fireballs.forEach(fireball => {
      fireball.update();
    });
    if (this.grace) {
      Body.setVelocity(this.body, {
        x: 0,
        y: 0
      });
      this.graceP += 1;
      if (this.graceP > GRACE_PERIOD) {
        this.grace = false;
        this.graceP = 0;
        this.sprite.alpha = 1;
        World.add(this.world, this.body);
      }
    }
  }

  updateTexture() {
    if (this.accel > 0) {
      this.sprite.scale.x = SCALE;
      this.backwards = false;
    } else if (this.accel < 0) {
      this.sprite.scale.x = -SCALE;
      this.backwards = true;
    }

    if (!this.onGround) {
      this.sprite.texture = this.globalTextures[this.textures.jump];
    } else {
      if (this.accel !== 0) {
        if (this.body.velocity.x * this.accel < 0) {
          this.sprite.texture = this.globalTextures[this.textures.turn];
        } else {
          if (this.frames % this.dFrames === 0)
            this.sprite.texture = this.globalTextures[
              Helpers.getNextTexture(
                this.textures.move,
                this.sprite.texture.textureCacheIds[0]
              )
            ];
        }
      } else {
        this.frames = 0;
        this.sprite.texture = this.globalTextures[this.textures.stand];
      }
    }
  }

  consumePowerup(powerup) {
    if (this.state === "small") {
      World.remove(this.world, this.body);
      this.w = WIDTH_B;
      this.h = 2;
      this.body = Bodies.rectangle(
        this.body.position.x,
        this.body.position.y - 0.5,
        this.w,
        this.h,
        {
          label: "player",
          mass: this.body.mass,
          friction: this.body.friction,
          frictionAir: this.body.frictionAir,
          slop: this.body.slop
        }
      );
      this.body["player"] = this;
      World.add(this.world, this.body);
    }
    switch (powerup) {
      case "mushroom":
        if (this.state === "small") {
          this.state = "big";
          this.textures = TEXTURES_DIR.big;
        }
        break;
      case "fireflower":
        this.state = "fire";
        this.textures = TEXTURES_DIR.fire;
        break;
      default:
        break;
    }
  }

  spawnFireball() {
    const newFireball = new Fireball(
      this.body.position.x + (this.backwards ? -1 : 1),
      this.body.position.y,
      this,
      this.backwards
    );

    this.fireballs.push(newFireball);
    this.sprite.parent.addChild(newFireball.sprite);
    World.add(this.world, newFireball.body);
  }

  hurt() {
    if (this.state === "small") {
      // DEATH
    } else if (this.state === "big") {
      World.remove(this.world, this.body);
      this.w = WIDTH_S;
      this.h = 1;
      this.body = Bodies.rectangle(
        this.body.position.x,
        this.body.position.y + 0.5,
        this.w,
        this.h,
        {
          label: "player",
          mass: this.body.mass,
          friction: this.body.friction,
          frictionAir: this.body.frictionAir,
          slop: this.body.slop
        }
      );
      this.body["player"] = this;
      World.add(this.world, this.body);

      this.state = "small";
      this.textures = TEXTURES_DIR.small;
    } else {
      this.state = "big";
      this.textures = TEXTURES_DIR.big;
    }
    this.grace = true;
    this.sprite.alpha = 0.5;
    World.remove(this.world, this.body);
  }
}
