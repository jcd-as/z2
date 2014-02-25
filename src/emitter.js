// emitter.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for particle emitter for 2d games
// TODO:
// - use re-usable Pixi Sprite pool too
// - don't create new Particle objects each time we emit, just set the props on
// an existing one in the pool
// - gravity & resistance
// - infinite lifespans
// - ability to use animations instead of just frames
// - should be able to 'trickle' particles in...
// -

zSquared.emitter = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "2d", "time"] );


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
	/** Particle class
	 * @class z2#Particle
	 * @constructor
	 * @arg {PIXI.Sprite} sprite The Pixi Sprite for this type of particle
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
	function Particle( sprite, width, frame, x, y, vel_x, vel_y, theta, alpha, lifespan )
	{
		this.sprite = sprite;
		sprite.position.x = x || 0;
		sprite.position.y = y || 0;
		sprite.texture.setFrame( new PIXI.Rectangle( frame * width, 0, width, sprite.height ) );
		this.velX = vel_x || 0;
		this.velY = vel_y || 0;
		sprite.rotation = theta || 0;
		sprite.alpha = alpha || 1;
		this._born = z2.time.now();
		this.lifespan = lifespan || 0;
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
			particles : [],
			openSlots : [],
			animated : false,
			texture : null,
			basetexture : null,
//			sprites : [],
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
				for( i = 0; i < this.particles.length; i++ )
				{
					var p = this.particles[i];
					if( !p )
						continue;

					// if it's lifetime is at an end, destroy this entity
					if( z2.time.now() >= p._born + p.lifespan )
					{
						// remove the sprite from Pixi
						this.sb.removeChild( p.sprite );

						// remove the entity from the particle array
						this.openSlots.push( i );
						this.particles[i] = null;

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
							if( this.openSlots.length === 0 && this.particles.length > em.maxParticles )
								continue;

							// TODO: randomize animation ???

							var sprite;
							// if we're animated, we need a separate texture for
							// each particle, because they'll have different
							// frames
							if( this.animated )
							{
								var texture = new PIXI.Texture( this.basetexture );
								sprite = new PIXI.Sprite( texture );
							}
							else
							{
								sprite = new PIXI.Sprite( this.texture );
							}
							this.sb.addChild( sprite );

							var frame = 0;
							if( em.frames )
								frame = em.frames[z2.random( 0, em.frames.length-1, Math.round )];
							
							var particle = new Particle(
								sprite, 
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

							// find or create a slot for the particle
							if( this.openSlots.length > 0 )
							{
								var slot = this.openSlots.pop();
								this.particles[slot] = particle;
							}
							else
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

