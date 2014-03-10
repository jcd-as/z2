// emitter.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for particle emitter for 2d games
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

zSquared.emitter = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "2d", "time", "objectpool"] );


	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////


	/** Component Factory for emitter */
	z2.emitterFactory = z2.createComponentFactory( 
		{
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
		} );

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
		 * @constructor
		 */
		function Particle()
		{
			var t;
			// non-animated particles can all share the same texture, saving
			// memory, increasing perf
			if( texture )
				t = texture;
			// animated particles need their own texture object
			else
				t = new PIXI.Texture( basetexture );
			this.sprite = new PIXI.Sprite( t );
			this.reset();
			batch.addChild( this.sprite );
		};

		/** Reset a Particle to a default state
		 * @function Particle.reset
		 */
		Particle.prototype.reset = function()
		{
			this.sprite.position.x = 0;
			this.sprite.position.y = 0;
			this.sprite.rotation = 0;
			this.sprite.alpha = 1;
			this.velX = 0;
			this.velY = 0;
			this._born = 0;
			this.lifespan = 0;
		};

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
		Particle.prototype.init = function ( width, frame, x, y, vel_x, vel_y, theta, alpha, lifespan )
		{
			// set the sprite frame (create a new one if needed)
			var fr;
			if( this.sprite.frame )
				fr = this.sprite.frame;
			else
				fr = new PIXI.Rectangle();
			fr.x = frame * width;
			fr.y = 0;
			fr.width = width;
			fr.height = this.sprite.height;
			this.sprite.texture.setFrame( fr );

			this.sprite.position.x = x || 0;
			this.sprite.position.y = y || 0;
			this.sprite.rotation = theta || 0;
			this.sprite.alpha = alpha || 1;
			this.sprite.visible = true;

			this.velX = vel_x || 0;
			this.velY = vel_y || 0;
			this._born = z2.time.now();
			this.lifespan = lifespan || 0;
		}

		return Particle;
	}


	/////////////////////////////////////////////////////////////////////////
	// System factories
	/////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////
	/** EmitterSystem factory function
	 * requires: emitter, position
	 * optional: 
	 * @function z2#createEmitterSystem
	 * @arg {z2.View} view The view object to which the particles will be added
	 * @arg {string} key The asset key for the spritesheet to use
	 * @arg {number} [priority] Priority of system.
	 */
	z2.createEmitterSystem = function( view, key, priority )
	{
		if( priority === undefined )
			priority = 70;
		return new z2.System( priority, [z2.emitterFactory, z2.positionFactory],
		{
			timer : null,
			spritesheet : null,
			particlePool : null,
			particles : [],
			animated : false,
			texture : null,
			basetexture : null,
			sb : null,
			init: function()
			{
				this.spritesheet = z2.loader.getAsset( key );
				this.basetexture = new PIXI.BaseTexture( this.spritesheet.image );
				// if we're not animated, all particles can share the same texture
				if( !this.animated )
					this.texture = new PIXI.Texture( this.basetexture );

				this.sb = new PIXI.SpriteBatch();
//				this.sb = new PIXI.DisplayObjectContainer();
				view.doc.addChild( this.sb );

				this.particlePool = new z2.ObjectPool( particleFactory( this.basetexture, this.texture, this.sb ) );
			},
//			onStart: function()
//			{
//			},
			update: function( e, dt )
			{
				var i;
				var em = e.getComponent( z2.emitterFactory );

				// have we been initialized yet??
				if( !this.timer )
					this.timer = z2.time.now() + em.delay - em.period;

				// update existing particles
				// (iterate backwards so we can remove dead particles as we come
				// to them)
				for( i = this.particles.length; i >= 0; i-- )
				{
					var p = this.particles[i];
					if( !p )
						continue;

					// if it's lifetime is at an end, destroy this entity
					if( z2.time.now() >= p._born + p.lifespan )
					{
						// hide the sprite
						p.sprite.visible = false;

						// remove the entity from the particle array
						// safe to remove while iterating *backwards*
						this.particles.splice( i, 1 );
						this.particlePool.release( p );

						continue;
					}

					// otherwise update its position

					// dt factor
					var idt = dt / 1000;

					// TODO: gravity & resistance

					p.sprite.position.x += p.velX * idt;
					p.sprite.position.y += p.velY * idt;
				}

				// fire more particles, if needed
				if( em.on )
				{
					// is it time to emit particles
					if( z2.time.now() >= this.timer + em.period )
					{
						// if 'burst' emitter, fire all particles
						if( em.burst )
							em.on = false;

						var pos = e.getComponent( z2.positionFactory );

						this.timer = z2.time.now();

						// fire particles
						for( i = 0; i < em.quantity; i++ )
						{
							// don't create more than 'maxParticles'
							if( this.particles.length === em.maxParticles )
								continue;

							// TODO: randomize animation ???

							var frame = 0;
							if( em.frames )
								frame = em.frames[z2.random( 0, em.frames.length-1, Math.round )];
							
							// get a particle from the pool
							var particle = this.particlePool.get();
							particle.init(
//								sprite, 
								this.spritesheet.width,
								frame,
								// x
								z2.random( pos.x, pos.x + em.width ),
								// y
								z2.random( pos.y, pos.y + em.height ),
								// velocity x
								z2.random( em.minParticleSpeedX, em.maxParticleSpeedX ),
								// velocity y
								z2.random( em.minParticleSpeedY, em.maxParticleSpeedY ),
								// rotation
								z2.random( em.minRotation, em.maxRotation ),
								// alpha
								z2.random( em.minAlpha, em.maxAlpha ),
								// lifespan
								z2.random( em.minLifespan, em.maxLifespan, Math.round )
							);

							// and add it to our collection
							this.particles.push( particle );
						}
					}
				}
			},
//			onEnd : function()
//			{
//			}
		} );

	};

};

