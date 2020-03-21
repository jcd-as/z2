// emitter.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for particle emitter for 2d games
//
// TODO:
// x use re-usable Pixi Sprite pool too
// x don't create new Particle objects each time we emit, just set the props on
// an existing one in the pool
// - gravity & resistance
// - infinite lifespans
// - ability to use animations instead of just frames
// x should be able to 'trickle' particles in...
// - do particles need to be removed from the sprite batch when the system is
// torn down? does the sprite batch need to be removed from the Stage??
// - cull off-screen particles
// -

/** Particle emitter module.
 * @module
 */

import time from './time.js'
import * as ecs from './ecs.js'
import * as _2d from'./2d-pixi.js'
import zSquared from './z2.js'
import ObjectPool from './objectpool.js'
import loader from './loader.js'


/////////////////////////////////////////////////////////////////////////
// Component factories
/////////////////////////////////////////////////////////////////////////

/** Component Factory for emitter */
export let emitterFactory = ecs.createComponentFactory( {
	// is the emitter on?
	on: false,
	// is this a 'burst' emitter? (fires all particles, then turns off)
	burst: false,
	// how many particles are released at a time?
	quantity: 0,
	// how often (in ms) are particles released?
	period: 0,
	// how long to wait before the first release of particles?
	delay: 0,
	// width of the emitter (in pixels)
	width: 0,
	// height of the emitter (in pixels)
	height: 0,
	// array of frames to be selected from
	frames: null,
	// min/max particle speeds (chosen at random in this range)
	minParticleSpeedX: 0, maxParticleSpeedX: 0,
	minParticleSpeedY: 0, maxParticleSpeedY: 0,
	// min/max particle rotation (chosen at random in this range)
	minRotation: 0, maxRotation: 0,
	// min/max alpha transparency
	minAlpha: 1, maxAlpha: 1,
	// min/max particle lifespan (in ms)
	minLifespan: 0, maxLifespan: 0,
	// maximum number of particles (pool size)
	maxParticles: 100
})

/////////////////////////////////////////////////////////////////////////
// Particle class
/////////////////////////////////////////////////////////////////////////
/** Factory function to create Particle class
 * @function z2#particleFactory
 * @arg {PIXI.BaseTexture} basetexture The Pixi BaseTexture for the
 * Particles
 * @arg {PIXI.Texture} texture The Pixi Texture for the * Particles
 * @arb {PIXI.SpriteBatch} batch The Pixi SpriteBatch to which the Particle
 * sprites will be added
 */
function particleFactory( basetexture, texture, batch )
{
	/** Particle class
	* @class z2#Particle
	*/
	class Particle
	{
		sprite = null
		velX = 0
		velY = 0
		born = 0
		lifespan = 0

		/**
		* @constructor
		*/
		constructor()
		{
			let t
			// non-animated particles can all share the same texture, saving
			// memory, increasing perf
			if(texture)
				t = texture
			// animated particles need their own texture object
			else
				// eslint-disable-next-line no-undef
				t = new PIXI.Texture(basetexture)
			// eslint-disable-next-line no-undef
			this.sprite = new PIXI.Sprite(t)
			this.reset()
			batch.addChild(this.sprite)
		}

		/** Reset a Particle to a default state
		* @function Particle.reset
		*/
		reset()
		{
			this.sprite.position.x = 0
			this.sprite.position.y = 0
			this.sprite.rotation = 0
			this.sprite.alpha = 1
			this.velX = 0
			this.velY = 0
			this.born = 0
			this.lifespan = 0
		}

		/** Initialize a Particle
		* @function Particle.init
		* @arg {Number} width The width of the sprite image, in pixels
		* @arg {Number} frame The spritesheet frame (index) in the spritesheet
		* @arg {Number} x The X coordinate
		* @arg {Number} y The Y coordinate
		* @arg {Number} vel_x X velocity
		* @arg {Number} vel_y Y velocity
		* @arg {Number} theta Rotation angle
		* @arg {Number} alpha alpha transparency (0 to 1)
		* @arg {Number} lifespan Lifespan of the particle, in ms
		*/
		init(width, frame, x, y, vel_x, vel_y, theta, alpha, lifespan)
		{
			// set the sprite frame (create a new one if needed)
			let fr
			if(this.sprite.frame)
				fr = this.sprite.frame
			else
				// eslint-disable-next-line no-undef
				fr = new PIXI.Rectangle()
			fr.x = frame * width
			fr.y = 0
			fr.width = width
			fr.height = this.sprite.height
			this.sprite.texture.setFrame(fr)

			this.sprite.position.x = x || 0
			this.sprite.position.y = y || 0
			this.sprite.rotation = theta || 0
			this.sprite.alpha = alpha || 1
			this.sprite.visible = true

			this.velX = vel_x || 0
			this.velY = vel_y || 0
			this.born = time.now()
			this.lifespan = lifespan || 0
		}
	}

	return Particle
}


/////////////////////////////////////////////////////////////////////////
// System factories
/////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////
/** EmitterSystem factory function
* requires: emitter, position
* optional:
* @arg {View} view The view object to which the particles will be added
* @arg {string} key The asset key for the spritesheet to use
* @arg {number} [priority] Priority of system.
*/
export function createEmitterSystem(view, key, priority)
{
	if(priority === undefined)
		priority = 70
	return new ecs.System(priority, [emitterFactory, _2d.positionFactory], {
		timer : null,
		spritesheet : null,
		particlePool : null,
		particles : [],
		animated : false,
		texture : null,
		basetexture : null,
		sb : null,
		init: function() {
			this.spritesheet = loader.getAsset(key)
			// eslint-disable-next-line no-undef
			this.basetexture = new PIXI.BaseTexture(this.spritesheet.image)
			// if we're not animated, all particles can share the same texture
			if(!this.animated)
				// eslint-disable-next-line no-undef
				this.texture = new PIXI.Texture(this.basetexture)

			// eslint-disable-next-line no-undef
			this.sb = new PIXI.SpriteBatch()
			//this.sb = new PIXI.DisplayObjectContainer()
			view.doc.addChild(this.sb)

			this.particlePool = new ObjectPool(particleFactory(this.basetexture, this.texture, this.sb))
		},
//		onStart: function()
//		{
//		},
		update: function(e, dt) {
			let i
			const em = e.getComponent(emitterFactory)

			// have we been initialized yet??
			if(!this.timer)
				this.timer = time.now() + em.delay - em.period

			// update existing particles
			// (iterate backwards so we can remove dead particles as we come
			// to them)
			for(i = this.particles.length; i >= 0; i--) {
				const p = this.particles[i]
				if(!p)
					continue

				// if it's lifetime is at an end, destroy this entity
				if(time.now() >= p.born + p.lifespan) {
					// hide the sprite
					p.sprite.visible = false

					// remove the entity from the particle array
					// safe to remove while iterating *backwards*
					this.particles.splice(i, 1)
					this.particlePool.release(p)

					continue
				}

				// otherwise update its position

				// dt factor
				const idt = dt / 1000

				// TODO: gravity & resistance

				p.sprite.position.x += p.velX * idt
				p.sprite.position.y += p.velY * idt
			}

			// fire more particles, if needed
			if(em.on) {
				// is it time to emit particles
				if(time.now() >= this.timer + em.period) {
					// if 'burst' emitter, fire all particles
					if(em.burst) em.on = false

					const pos = e.getComponent(_2d.positionFactory)

					this.timer = time.now()

					// fire particles
					for(i = 0; i < em.quantity; i++) {
						// don't create more than 'maxParticles'
						if(this.particles.length === em.maxParticles)
							continue

						// TODO: randomize animation ???

						let frame = 0
						if(em.frames)
							frame = em.frames[zSquared.random(0, em.frames.length-1, Math.round)]

						// get a particle from the pool
						const particle = this.particlePool.get()
						particle.init(
							this.spritesheet.width,
							frame,
							// x
							zSquared.random(pos.x, pos.x + em.width),
							// y
							zSquared.random(pos.y, pos.y + em.height),
							// velocity x
							zSquared.random(em.minParticleSpeedX, em.maxParticleSpeedX),
							// velocity y
							zSquared.random(em.minParticleSpeedY, em.maxParticleSpeedY),
							// rotation
							zSquared.random(em.minRotation, em.maxRotation),
							// alpha
							zSquared.random(em.minAlpha, em.maxAlpha),
							// lifespan
							zSquared.random(em.minLifespan, em.maxLifespan, Math.round)
						)

						// and add it to our collection
						this.particles.push( particle )
					}
				}
			}
		},
//		onEnd : function()
//		{
//		}
	})
}

