// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - physics in movement system: gravity (x), mass (x), friction ( ), 'bounce'
// (coefficient of restitution) (x)
// - way to implement callbacks or the like. for example: on collision of two
// bodies, need a way to play sounds etc for those two entities ??
// - handle collisions of non-AABBs (circles & polygons)
// -

zSquared['2d'] = function( z2 )
{
	"use strict";

	z2.require( ["math", "ecs", "time", "tilemap", "collision"] );


	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////
	
	/** Component Factory for 2d renderable
	 * (empty 'dummy' components that just indicate they can be drawn) */
	z2.renderableFactory = z2.createComponentFactory();

	/** Component Factory for 2d image */
	z2.imageFactory = z2.createComponentFactory( {sprite: null} );

	/** Component Factory for 2d polygon */
//	z2.polygonFactory = z2.createComponentFactory( {vertices: []} );

	/** Component Factory for 2d fill type */
//	z2.fillFactory = z2.createComponentFactory( {fill: '#ffffff'} );

	/** Component Factory for 2d position */
	z2.positionFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory for 2d position constraints */
	z2.positionConstraintsFactory = z2.createComponentFactory( {minx: 0, maxx:0, miny:0, maxy:0} );

	/** Component Factory for 2d size */
	z2.sizeFactory = z2.createComponentFactory( {width:0, height:0} );

	/** Component Factory for 2d velocity */
	z2.velocityFactory = z2.createComponentFactory( {x: 0, y: 0, maxx:1000, maxy:1000} );

	/** Component Factory for 2d rotation */
	z2.rotationFactory = z2.createComponentFactory( {theta: 0} );

	/** Component Factory for 2d scale */
	z2.scaleFactory = z2.createComponentFactory( {sx: 1, sy: 1} );

	/** Component Factory for 2d center point */
	z2.centerFactory = z2.createComponentFactory( {cx: 0.5, cy: 0.5} );
	
	/** Component Factory for 2d radius */
	z2.radiusFactory = z2.createComponentFactory( {radius:0} );

	/** Component Factory for 2d transform */
	z2.transformFactory = z2.createComponentFactory( {xform: null, scene_x: 0, scene_y:0} );

	/** Component Factory for root (non-grouped) 2d transforms*/
	z2.rootTransformFactory = z2.createComponentFactory();

	/** Component Factory for 2d (animated) sprite */
	z2.spriteFactory = z2.createComponentFactory( {sprite: null, width: 0, animations: null } );

	/** Component Factory for groups */
	z2.groupFactory = z2.createComponentFactory( {group: []} );

	/** Component Factory for 2d rendering groups */
	z2.renderGroupFactory = z2.createComponentFactory();

	/** Component Factory for 2d transform groups */
	z2.transformGroupFactory = z2.createComponentFactory();

	/** Component Factory for physics body (AABB bounds, mass, etc) */
	z2.physicsBodyFactory = z2.createComponentFactory( {aabb:null, restitution: 0, mass:1, resistance_x: 0, resistance_y: 0, blocked_top: false, blocked_left:false, blocked_down:false, blocked_right:false} );

	/** Component Factory for 2d gravity */
	z2.gravityFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory for sprite vs sprite collision */
	z2.collisionGroupFactory = z2.createComponentFactory( {entities:null} );


	/** @class z2.AnimationSet
	 * @classdesc Helper class for sprite animations */
	z2.AnimationSet = function()
	{
		this.animations = {};
		this.cur_animation = null;
		this._playing = null;
		this._cur_frame = 0;
		this._frame_time = 0;
	};
	/** @property {number} currentFrame Get the index (in the sprite sheet) of
	 * the current frame to be displayed */
	Object.defineProperty( z2.AnimationSet.prototype, 'currentFrame',
	{
		get: function()
		{
			if( this.cur_animation )
				return this.cur_animation[this._cur_frame][0];
			else
				return 0;
		}
	} );
	/** @property {string} playing Get the name (key) of the current
	 * animation, null if none */
	Object.defineProperty( z2.AnimationSet.prototype, 'playing',
	{
		get: function()
		{
			return this._playing;
		}
	} );
	/** Add an animation sequence
	 * @method z2.AnimationSet#add
	 * @memberof z2.AnimationSet
	 * @arg {string} name Friendly name of sequence, to be used as look-up key
	 * @arg {Array} anim An array containing the frames of the animation
	 * sequence, with each frame being a two-element array consisting of the
	 * frame index and the ms spent on this frame (e.g. [0, 250])
	 */
	z2.AnimationSet.prototype.add = function( name, anim )
	{
		this.animations[name] = anim;
	};
	/** Start playing an animation sequence
	 * @method z2.AnimationSet#play
	 * @arg {string} name The (friendly) name of the sequence to play
	 */
	z2.AnimationSet.prototype.play = function( name )
	{
		this._playing = name;
		this.cur_animation = this.animations[name];
		this._cur_frame = 0;
		this._frame_time = 0;
	};
	/** Stop playing any animation sequence
	 * @method z2.AnimationSet#stop
	 */
	z2.AnimationSet.prototype.stop = function()
	{
		this._playing = null;
		this.cur_animation = null;
		this._frame_time = 0;
	};
	/** Update the current frame given a time delta
	 * @method z2.AnimationSet#update
	 * @arg {number} dt The time delta (elapsed time since last frame)
	 */
	z2.AnimationSet.prototype.update = function( dt )
	{
		// if there is an animation playing,
		// find the frame that should be displayed,
		// given the elapsed time
		if( this.cur_animation !== null )
		{
			this._frame_time += dt;
			var f = this._cur_frame;
			var next = this.cur_animation[f][1];
			if( this._frame_time < next )
				return;
			// calculate the correct frame for the elapsed time
			while( this._frame_time > next )
			{
				// wrap around to first frame?
				if( f == this.cur_animation.length )
				{
					this._frame_time -= next;
					next = 0;
					f = 0;
				}
				next += this.cur_animation[f][1];
				f++;
			}
			// wrap around to first frame?
			if( f < this.cur_animation.length )
				this._cur_frame = f;
			else
				this._cur_frame = 0;
			this._frame_time = 0;
		}
	};

	/////////////////////////////////////////////////////////////////////////
	// System factories
	/////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////
	/** RenderingSystem factory function
	 * requires: renderable
	 * optional: image, sprite, tileLayer, size, rotation, scale, center
	 * (MUST be an image or sprite or nothing can be rendered)
	 * @function z2.createRenderingSystem
	 * @arg {Canvas} canvas The HTML5 canvas to draw to
	 * @arg {z2.View} view The View object for this transform system
	 * @arg {boolean} [force_canvas_rendering] If 'true', forces the renderer to
	 * use 2d Canvas rendering instead of WebGL
	 * @arg {number} [priority] Priority of system. Override only if you need
	 * the renderer to NOT run last
	 */
	z2.createRenderingSystem = function( canvas, view, force_canvas_rendering, priority )
	{
		// TODO: support different widths/heights than the canvas'
		var renderer;
		if( force_canvas_rendering )
			renderer = new PIXI.CanvasRenderer( canvas.width, canvas.height, canvas );
		else
			renderer = PIXI.autoDetectRenderer( canvas.width, canvas.height, canvas );

		var stage = view.scene.stage;

		return new z2.System( Number.MAX_VALUE, [z2.renderableFactory],
		{
//			onStart: function()
//			{
//			},
			update: function( e, dt )
			{
				// get the image...
				var disp = e.getComponent( z2.imageFactory.mask );

				// ...or sprite...
				var anims;
				if( !disp )
				{
					disp = e.getComponent( z2.spriteFactory.mask );
					if( disp )
						anims = disp.animations;
				}

				// ...or tile layer...
				if( !disp )
				{
					disp = e.getComponent( z2.tileLayerFactory.mask );
					if( disp )
					{
						disp.layer.render( view.x, view.y );
						return;
					}
				}

				// ...or image layer
				if( !disp )
				{
					disp = e.getComponent( z2.imageLayerFactory.mask );
					if( disp )
					{
						disp.layer.render( view.x, view.y );
						return;
					}
				}

				// can't operate on nothing...
				if( !disp )
					return;

				// get the position component
				var pc = e.getComponent( z2.positionFactory.mask );
				var x = pc.x;
				var y = pc.y;

				// get the size component
				var szc = e.getComponent( z2.sizeFactory.mask );

				// get the rotation component
				var rc = e.getComponent( z2.rotationFactory.mask );

				// get the scale component
				var sc = e.getComponent( z2.scaleFactory.mask );

				// get the center point
				var cc = e.getComponent( z2.centerFactory.mask );

				// get the PIXI sprite
				var spr = disp.sprite;

				// apply the size
				if( szc )
				{
					// TODO: cache values so that we're not re-setting the frame
					// unnecessarily

					// offset to the image in the sprite strip
					var w = szc.width;
					var h = szc.height;
					var offs;
					if( anims ) offs = anims.currentFrame * w;
					else offs = 0;
					
					// update the current frame & image
					if( anims )
						anims.update( dt );

					spr.texture.setFrame( new PIXI.Rectangle( offs, 0, w, h ) );
				}

				// apply the transforms to the PIXI sprite

				// position
				spr.position.x = x;
				spr.position.y = y;

				// scale
				if( sc )
				{
					spr.scale.x = sc.sx;
					spr.scale.y = sc.sy;
				}

				// rotation
				if( rc )
					spr.rotation = rc.theta;

				// center
				if( cc )
				{
					spr.anchor.x = cc.cx;
					spr.anchor.y = cc.cy;
				}
			},
			onEnd: function()
			{
				view.update();
				renderer.render( stage );
			}
		} );
	};

	/////////////////////////////////////////////////////////////////////////
	/** MovementSystem factory function
	 * requires: position, velocity, transform
	 * optional: positionConstraints, collisionMap, physicsBody (*required* if
	 * there is a collisionMap or Group), gravity, collisionGroup
	 * @function z2.createMovementSystem
	 * @arg {number} priority Priority of system (lower = higher priority)
	 */
	z2.createMovementSystem = function( priority )
	{
		return new z2.System( priority, [z2.positionFactory, z2.velocityFactory],
		{
			// define these here, access to 'this.foo' generally faster than to
			// 'foo' captured by closure...
			aabb1 : new Float64Array( 4 ),
			aabb2 : new Float64Array( 4 ),
			pv : new Float64Array( 2 ),

			update: function( e, dt )
			{
				// get the position component
				var pc = e.getComponent( z2.positionFactory.mask );

				// get the velocity component
				var vc = e.getComponent( z2.velocityFactory.mask );

				// get the gravity component
				var gc = e.getComponent( z2.gravityFactory.mask );

				// get the pos constraints component
				var pcc = e.getComponent( z2.positionConstraintsFactory.mask );

				// get the collision map component
				var cmc = e.getComponent( z2.collisionMapFactory.mask );

				// get the physics body
				var bc = e.getComponent( z2.physicsBodyFactory.mask );

				// get the collision group (sprite vs sprite collisions)
				var cgc = e.getComponent( z2.collisionGroupFactory.mask );

				// if the object is out of the world bounds, just bail
				if( window.game && game.scene && game.scene.map )
				{
					// TODO: should we be checking the object's bounds instead
					// of just its position? (don't want objects stopping while
					// still partially visible)
					if( pc.x > game.scene.map.worldWidth ||
						pc.y > game.scene.map.worldHeight )
						return;
				}

				// get pos constraints
				var minx = -Number.MAX_VALUE, maxx = Number.MAX_VALUE;
				var miny = -Number.MAX_VALUE, maxy = Number.MAX_VALUE;
				if( pcc )
				{
					minx = pcc.minx;
					maxx = pcc.maxx;
					miny = pcc.miny;
					maxy = pcc.maxy;
				}

				// dt factor
				var idt = dt / 1000;

				// save previous position
				var px = pc.x;
				var py = pc.y;

				// gravity? apply first half prior to changing position
				// (see www.niksula.cs.hut.fi/~hkankaan/Homepages/gravity.html) 
				// for an explanation of why we split physics mods into two
				// parts)
				if( gc )
				{
					vc.x += gc.x * idt * 0.5;
					vc.y += gc.y * idt * 0.5;
				}
				// cap velocity
				if( vc.x > vc.maxx ) vc.x = vc.maxx;
				else if( vc.x < -vc.maxx ) vc.x = -vc.maxx;
				if( vc.y > vc.maxy ) vc.y = vc.maxy;
				else if( vc.x < -vc.maxy ) vc.y = -vc.maxy;

				// account for elapsed time since last frame
				var xmod;
				if( bc && bc.blocked_left && vc.x < 0 )
					xmod = 0;
				else if( bc && bc.blocked_right && vc.x > 0 )
					xmod = 0;
				else
					xmod = vc.x * idt;
				var ymod;
				if( bc && bc.blocked_up && vc.y < 0 )
					ymod = 0;
				else if( bc && bc.blocked_down && vc.y > 0 )
					ymod = 0;
				else
					ymod = vc.y * idt;

				// test constraints & set position
				var x = pc.x + xmod;
				var y = pc.y + ymod;
				// TODO: these should set the 'bc.blocked_X' vars
				if( x > maxx || x < minx )
					vc.x = 0;
				else
					pc.x = x;
				if( y > maxy || y < miny )
					vc.y = 0;
				else
					pc.y = y;


				// collisions:

				var m;
				var collision = false;

				// handle sprite vs sprite collisions
				if( cgc )
				{
					// TODO: friction only makes sense for 'full' (non-AABB)
					// collisions (using circles, for example)

					var entities = cgc.entities;
					if( entities )
					{
						// TODO: optimize! figure out a better way to do this,
						// it is potentially n^2 behaviour (e.g. if we need to
						// collide two groups together)
						// (keep a list of already collided sprites?)
						for( var i = 0; i < entities.length; i++ )
						{
							var ent = entities[i];
							var body = ent.getComponent( z2.physicsBodyFactory.mask );
							var pos = ent.getComponent( z2.positionFactory.mask );
							var vel = ent.getComponent( z2.velocityFactory.mask );

							// don't collide against self
							if( bc === body )
								continue;

							// setup the bounding boxes
							this.aabb1[0] = bc.aabb[0] + pc.y;
							this.aabb1[1] = bc.aabb[1] + pc.x;
							this.aabb1[2] = bc.aabb[2] + pc.y;
							this.aabb1[3] = bc.aabb[3] + pc.x;

							this.aabb2[0] = body.aabb[0] + pos.y;
							this.aabb2[1] = body.aabb[1] + pos.x;
							this.aabb2[2] = body.aabb[2] + pos.y;
							this.aabb2[3] = body.aabb[3] + pos.x;

							// collide
							m = z2.collideAabbVsAabb( this.aabb1, this.aabb2, this.pv );

							// separate the aabb and stop velocity
							if( m )
							{
								collision = true;

								// separate
								pc.x += this.pv[0];
								pc.y += this.pv[1];
								
								// m = mass, u = init vel, v = resultant vel
								// cr = coefficient of restitution
								// from wikipedia:
								// (http://en.wikipedia.org/wiki/Coefficient_of_restitution#Speeds_after_impact)
								// v1 = [(m1)(u1) + (m2)(u2) + (m2)(cr)(u2-u1)] / (m1+m2)
								// v2 = [(m1)(u1) + (m2)(u2) + (m1)(cr)(u1-u2)] / (m1+m2)

								var m1 = bc.mass;
								var m2 = body.mass;
								var mt = m1 + m2;

								var u1, u2, term;

								// CoR is a properly a property of a *collision*, 
								// not an object... we'll just take the average
								var cr = (bc.restitution + body.restitution) / 2;

								// left separation
								if( this.pv[0] < 0 )
								{
									u1 = vc.x; u2 = vel.x;
									term = (m1*u1)+(m2*u2);
									vc.x = (term + (m2*cr) * (u2-u1)) / mt;
									vel.x = (term + (m1*cr) * (u1-u2)) / mt;
									bc.blocked_right = true;
									body.blocked_left = true;
								}
								// right separation
								if( this.pv[0] > 0 )
								{
									u1 = vc.x; u2 = vel.x;
									term = (m1*u1)+(m2*u2);
									vc.x = (term + (m2*cr) * (u2-u1)) / mt;
									vel.x = (term + (m1*cr) * (u1-u2)) / mt;
									bc.blocked_left = true;
									body.blocked_right = true;
								}
								// up separation
								if( this.pv[1] < 0 )
								{
									u1 = vc.y; u2 = vel.y;
									term = (m1*u1)+(m2*u2);
									vc.y = (term + (m2*cr) * (u2-u1)) / mt;
									vel.y = (term + (m1*cr) * (u1-u2)) / mt;
									bc.blocked_down = true;
									body.blocked_up = true;
								}
								// down separation
								if( this.pv[1] > 0 )
								{
									u1 = vc.y; u2 = vel.y;
									term = (m1*u1)+(m2*u2);
									vc.y = (term + (m2*cr) * (u2-u1)) / mt;
									vel.y = (term + (m1*cr) * (u1-u2)) / mt;
									bc.blocked_up = true;
									body.blocked_down = true;
								}
							}
						}
					}
				}

				// handle collision with collision map
				if( cmc )
				{
					// TODO: non-AABB collision body??

					// TODO: friction only makes sense for 'full' (non-AABB)
					// collisions (using circles, for example)

					this.aabb1[0] = bc.aabb[0] + pc.y;
					this.aabb1[1] = bc.aabb[1] + pc.x;
					this.aabb1[2] = bc.aabb[2] + pc.y;
					this.aabb1[3] = bc.aabb[3] + pc.x;

					// perform the collision
					m = z2.collideAabbVsCollisionMap( this.aabb1, cmc.data, cmc.map.widthInTiles, cmc.map.heightInTiles, cmc.map.tileWidth, cmc.map.tileHeight, this.pv );

					// separate the aabb and stop velocity
					if( m )
					{
						collision = true;
						pc.x += this.pv[0];
						pc.y += this.pv[1];

						// set velocity & 'blocked' in direction of collision

						// left
						if( this.pv[0] > 0 )
						{
							vc.x = vc.x * -bc.restitution;
							bc.blocked_left = true;
							bc.blocked_right = false;
							bc.blocked_up = false;
							bc.blocked_down = false;
						}
						// right
						else if( this.pv[0] < 0 )
						{
							vc.x = vc.x * -bc.restitution;
							bc.blocked_left = true;
							bc.blocked_right = true;
							bc.blocked_left = false;
							bc.blocked_up = false;
							bc.blocked_down = false;
						}
						// top
						else if( this.pv[1] > 0 )
						{
							vc.y = vc.y * -bc.restitution;
							bc.blocked_up = true;
							bc.blocked_left = false;
							bc.blocked_right = false;
							bc.blocked_down = false;
						}
						// bottom
						else if( this.pv[1] < 0 )
						{
							vc.y = vc.y * -bc.restitution;
							bc.blocked_down = true;
							bc.blocked_left = false;
							bc.blocked_right = false;
							bc.blocked_up = false;
						}
					}
				}

				// no collision, un-set blocked status
				if( !collision )
				{
					bc.blocked_left = false;
					bc.blocked_right = false;
					bc.blocked_up = false;
					bc.blocked_down = false;
				}

				// apply basic "air resistance" friction-like component
				vc.x *= 1 - bc.resistance_x * idt;
				vc.y *= 1 - bc.resistance_y * idt;

				// gravity? apply second half after changing position
				// (see www.niksula.cs.hut.fi/~hkankaan/Homepages/gravity.html) 
				// for an explanation of why we split physics mods into two
				// parts)
				if( gc )
				{
					vc.x += gc.x * idt * 0.5;
					vc.y += gc.y * idt * 0.5;
				}
				// cap velocity
				if( vc.x > vc.maxx ) vc.x = vc.maxx;
				else if( vc.x < -vc.maxx ) vc.x = -vc.maxx;
				if( vc.y > vc.maxy ) vc.y = vc.maxy;
				else if( vc.x < -vc.maxy ) vc.y = -vc.maxy;
			}
		} );
	};
};

