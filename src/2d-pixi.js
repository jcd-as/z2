// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - physics in movement system: gravity (x), mass (x), friction ( ), 'bounce'
// (coefficient of restitution) (x)
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
	z2.physicsBodyFactory = z2.createComponentFactory( {aabb:null, restitution: 0, mass:1, blocked_top: false, blocked_left:false, blocked_down:false, blocked_right:false} );

	/** Component Factory for 2d gravity */
	z2.gravityFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory for sprite vs sprite collision */
	z2.collisionGroupFactory = z2.createComponentFactory( {entities:null} );


	/** @class z2.AnimationSet
	 * @classdesc Helper class for sprite animations */
	z2.AnimationSet = function()
	{
		this.animations = [];
		this.cur_animation = null;
		this._cur_frame = 0;
		this._frame_time = 0;
	};
	/** @property {number} currentFrame Get the index (in the sprite sheet) of
	 * the current frame to be displayed */
	Object.defineProperty( z2.AnimationSet.prototype, 'currentFrame',
	{
		get: function()
		{
			return this.cur_animation[this._cur_frame][0];
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
		this.cur_animation = this.animations[name];
		this._cur_frame = 0;
		this._frame_time = 0;
	};
	/** Stop playing any animation sequence
	 * @method z2.AnimationSet#stop
	 */
	z2.AnimationSet.prototype.stop = function()
	{
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
	/** GroupSystem factory function. Creates a System that will operate on a
	 * group of Entities and apply another System to each of them during update
	 * requires: group
	 * optional: ...
	 * @function z2.createGroupSystem
	 * @arg {z2.System} sys The System to apply to the members of the group
	 * @arg {z2.Bitset} mask The mask to use for this system
	 * @arg {Function} [grpsys] The system to call for the entire
	 * group's init/onStart/update/onEnd functionality
	 */
//	z2.createGroupSystem = function( sys, mask, grpsys )
//	{
//		return new z2.System( [z2.groupFactory, mask],
//		{
//			init: function()
//			{
//				if( grpsys && grpsys.init )
//					sys.init();
//			},
//			onStart: function()
//			{
//				if( grpsys && grpsys.onStart )
//					sys.onStart();
//			},
//			update: function( e, dt )
//			{
//				if( grpsys )
//					grpsys.update( e, dt );
//
//				// get the group
//				var rgc = e.getComponent( z2.groupFactory.mask );
//				var grp = rgc.group;
//
//				// update each object in our group
//				for( var i = 0; i < grp.length; i++ )
//				{
//					sys.update( grp[i], dt, e );
//				}
//			},
//			onEnd: function()
//			{
//				if( grpsys && grpsys.onEnd )
//					sys.onEnd();
//			}
//		} );
//	};

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
	 */
	z2.createRenderingSystem = function( canvas, view, force_canvas_rendering )
	{
		// TODO: support different widths/heights than the canvas'
		var renderer;
		if( force_canvas_rendering )
			renderer = new PIXI.CanvasRenderer( canvas.width, canvas.height, canvas );
		else
			renderer = PIXI.autoDetectRenderer( canvas.width, canvas.height, canvas );

		var stage = view.scene.stage;

		return new z2.System( [z2.renderableFactory],
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

				// ... or tile layer
				if( !disp )
				{
					disp = e.getComponent( z2.tileLayerFactory.mask );
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
					// offset to the image in the sprite strip
					var w;
					if( szc ) w = szc.width;
					else w = spr.width;
					var offs;
					if( anims ) offs = anims.currentFrame * w;
					else offs = 0;
					
					// update the current frame & image
					if( anims )
						anims.update( dt );

					spr.texture.setFrame( new PIXI.Rectangle( offs, 0, w, szc.height ) );
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
	/** TransformGroupSystem factory function
	 * requires: group, transform, position
	 * optional: size, rotation, scale, center
	 * @function z2.createTransformGroupSystem
	 * @arg {z2.System} sys The TransformSystem to apply to this group
	 */
//	z2.createTransformGroupSystem = function( sys )
//	{
//		return z2.createGroupSystem( sys, z2.transformGroupFactory, sys );
//	};

	/////////////////////////////////////////////////////////////////////////
	/** MovementSystem factory function
	 * requires: position, velocity, transform
	 * optional: positionConstraints, collisionMap, physicsBody (*required* if
	 * there is a collisionMap), gravity, collisionGroup
	 * @function z2.createMovementSystem
	 */
	z2.createMovementSystem = function()
	{
		return new z2.System( [z2.positionFactory, z2.velocityFactory],
		{
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
				if( vc.y > vc.maxy ) vc.y = vc.maxy;

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

				var m, pv = [0,0];
				var collision = false;

				// handle sprite vs sprite collisions
				if( cgc )
				{
					pv = [0,0];

					var entities = cgc.entities;
					if( entities )
					{
						// TODO: optimize! figure out a better way to do this,
						// it is potentially n^2 behaviour
						for( var i = 0; i < entities.length; i++ )
						{
							var ent = entities[i];
							var body = ent.getComponent( z2.physicsBodyFactory.mask );
							var pos = ent.getComponent( z2.positionFactory.mask );
							var vel = ent.getComponent( z2.velocityFactory.mask );

							// don't collide against self
							if( bc === body )
								continue;

							var aabb1 = bc.aabb.slice(0);
							aabb1[0] += pc.y;
							aabb1[1] += pc.x;
							aabb1[2] += pc.y;
							aabb1[3] += pc.x;

							var aabb2 = body.aabb.slice(0);
							aabb2[0] += pos.y;
							aabb2[1] += pos.x;
							aabb2[2] += pos.y;
							aabb2[3] += pos.x;

							// collide
							m = z2.collideAabbVsAabb( aabb1, aabb2, pv );

							// separate the aabb and stop velocity
							if( m )
							{
								collision = true;

								// TODO: modify collideAabbVsAabb() to set
								// the magnitude in the return vector, then
								// change this code to use it
								// separate
								pc.x += m * pv[0];
								pc.y += m * pv[1];
								
								// TODO: apply friction

								// m = mass, u = init vel, v = resultant vel
								// v1 = (u1(m1 - m2) + 2m2u2) / (m1 + m2)
								// v2 = (u2(m2 - m1) + 2m1u1) / (m1 + m2)
								var m1 = bc.mass;
								var m2 = body.mass;
								var mt = m1 + m2;

								// left
								if( pv[0] < 0 )
								{
									var u1 = vc.x, u2 = vel.x;
									vc.x = (u1 * (m1 - m2) + (2 * m2 * u2)) / mt * bc.restitution;
									vel.x = (u2 * (m2 - m1) + (2 * m1 * u1)) / mt * body.restitution;
									bc.blocked_right = true;
									body.blocked_left = true;
								}
								// right
								if( pv[0] > 0 )
								{
									var u1 = vc.x, u2 = vel.x;
									vc.x = (u1 * (m1 - m2) + (2 * m2 * u2)) / mt * bc.restitution;
									vel.x = (u2 * (m2 - m1) + (2 * m1 * u1)) / mt * body.restitution;
									bc.blocked_left = true;
									body.blocked_right = true;
								}
								// up 
								if( pv[1] < 0 )
								{
									var u1 = vc.y, u2 = vel.y;
									vc.y = (u1 * (m1 - m2) + (2 * m2 * u2)) / mt * -bc.restitution;
									vel.y = (u2 * (m2 - m1) + (2 * m1 * u1)) / mt * -body.restitution;
									bc.blocked_down = true;
									body.blocked_up = true;
								}
								// down
								if( pv[1] > 0 )
								{
									var u1 = vc.y, u2 = vel.y;
									vc.y = (u1 * (m1 - m2) + (2 * m2 * u2)) / mt * -bc.restitution;
									vel.y = (u2 * (m2 - m1) + (2 * m1 * u2)) / mt * -body.restitution;
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
					if( !bc )
						throw new Error( "Entity processed by MovementSystem has collisionMap component, but no physicsBodyComponent!" );
					// TODO: non-AABB collision body??
					var aabb = bc.aabb.slice(0); // [top, left, bottom, right]
					// add to the entity's position
					aabb[0] += pc.y;
					aabb[1] += pc.x;
					aabb[2] += pc.y;
					aabb[3] += pc.x;

					// perform the collision
					m = z2.collideAabbVsCollisionMap( aabb, cmc.data, cmc.map.widthInTiles, cmc.map.heightInTiles, cmc.map.tileWidth, cmc.map.tileHeight, pv );

					// separate the aabb and stop velocity
					if( m )
					{
						collision = true;
						pc.x += pv[0];
						pc.y += pv[1];
						// set velocity & 'blocked' in direction of collision
						//
						// TODO: apply friction 
						//
						// left
						if( pv[0] > 0 )
						{
							vc.x = vc.x * -bc.restitution;
							bc.blocked_left = true;
							bc.blocked_right = false;
							bc.blocked_up = false;
							bc.blocked_down = false;
						}
						// right
						else if( pv[0] < 0 )
						{
							vc.x = vc.x * -bc.restitution;
							bc.blocked_left = true;
							bc.blocked_right = true;
							bc.blocked_left = false;
							bc.blocked_up = false;
							bc.blocked_down = false;
						}
						// top
						else if( pv[1] > 0 )
						{
							vc.y = vc.y * -bc.restitution;
							bc.blocked_up = true;
							bc.blocked_left = false;
							bc.blocked_right = false;
							bc.blocked_down = false;
						}
						// bottom
						else if( pv[1] < 0 )
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
				if( vc.y > vc.maxy ) vc.y = vc.maxy;
			}
		} );
	};
};

