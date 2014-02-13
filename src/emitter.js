// emitter.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for particle emitter for 2d games
// TODO:
// - keep cache of particles & recycle them IF we're not in burst mode and the
// particles have lifespans (needed? entities are already created from a
// cache, but there IS overhead associated with creating a new Entity...)
// - ability to use animations and/or random frames from image
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
			// min/max particle speeds (chosen at random in this range)
			minParticleSpeedX: 0, maxParticleSpeedX: 0,
			minParticleSpeedY: 0, maxParticleSpeedY: 0,
			// min/max particle rotation (chosen at random in this range)
			minRotation: 0, maxRotation: 0,
			// min/max particle lifespan (in ms)
			minLifespan: 0, maxLifespan: 0,
		} );

	/** Component Factory for particle: lifespan */
	z2.particleFactory = z2.createComponentFactory( {life:0, _born:0} );


	/////////////////////////////////////////////////////////////////////////
	// System factories
	/////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////
	/** EmitterSystem factory function
	 * requires: emitter, position
	 * optional: 
	 * @function z2.createEmitterSystem
	 * @arg {z2.View} view The view object to which the particles will be added
	 * // TODO: should we be getting the image key/width etc from a component?
	 * @arg {string} img_key The key for the image to use
	 * @arg {number} img_width The width of the frames in the image
	 * @arg {number} [priority] Priority of system.
	 */
	z2.createEmitterSystem = function( view, img_key, img_width, priority )
	{
		if( priority === undefined )
			priority = 70;
		return new z2.System( priority, [z2.emitterFactory, z2.positionFactory],
		{
			timer : null,
			img : null,
			onStart: function()
			{
				this.img = z2.loader.getAsset( img_key );
				// TODO: random frame(s) from image??
			},
			update: function( e, dt )
			{
				var em = e.getComponent( z2.emitterFactory );
				var pos = e.getComponent( z2.positionFactory );

				// have we been initialized yet??
				if( !this.timer )
					this.timer = z2.time.now() + em.delay - em.period;

				if( em.on )
				{
					// is it time to emit particles
					if( z2.time.now() >= this.timer + em.period )
					{
						// if 'burst' emitter, fire all particles
						if( em.burst )
							em.on = false;

						this.timer = z2.time.now();

						// fire particles
						for( var i = 0; i < em.quantity; i++ )
						{
							// TODO: randomize animation / frames ???

							var basetexture = new PIXI.BaseTexture( this.img );
							var texture = new PIXI.Texture( basetexture );
							var sprite = new PIXI.Sprite( texture );
							var spr = z2.spriteFactory.create( {sprite:sprite, width:img_width} );
							view.add( spr.sprite );

							// create our particle Entity
							var particle = z2.manager.get().createEntity(
							[
								// renderable!
								z2.renderableFactory,
								// create a location
								z2.positionFactory.create(
								{
									x: z2.random( pos.x, pos.x + em.width ),
									y: z2.random( pos.y, pos.y + em.height )
								} ),
								// create a particle
								z2.particleFactory.create( 
								{
									life: z2.random( em.minLifespan, em.maxLifespan, Math.round ),
									_born: z2.time.now()
								} ),
								// create a velocity
								z2.velocityFactory.create( 
								{
									x: z2.random( em.minParticleSpeedX, em.maxParticleSpeedX ),
									y: z2.random( em.minParticleSpeedY, em.maxParticleSpeedY )
								} ),
								// create a rotation
								z2.rotationFactory.create(
								{
									theta: z2.random( em.minRotation, em.maxRotation )
								} ),
								// use the sprite we created
								spr
							] );
						}
					}
				}
			},
			onEnd : function()
			{
			}
		} );

	};

	/////////////////////////////////////////////////////////////////////////
	/** ParticleSystem factory function
	 * requires: particle
	 * optional: position size, velocity, rotation, scale, center, gravity
	 * @function z2.createParticleSystem
	 * @arg {z2.View} view The view to which the particles belong
	 * @arg {number} [priority] Priority of system.
	 */
	z2.createParticleSystem = function( view, priority )
	{
		if( priority === undefined )
			priority = 65;
		return new z2.System( priority, [z2.particleFactory],
		{
			update: function( e, dt )
			{
				// get the particle component
				var pc = e.getComponent( z2.particleFactory );
				
				// if it's lifetime is at an end, destroy this entity
				if( z2.time.now() >= pc._born + pc.life )
				{
					// remove the sprite from Pixi
					var spr = e.getComponent( z2.spriteFactory );
					view.remove( spr.sprite );

					// remove the entity from the ECS manager
					z2.manager.get().removeEntity( e );
				}
			}
		} );
	};

};

