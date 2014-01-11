// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - 

zSquared['2d'] = function( z2 )
{
	"use strict";

	z2.require( ["math", "ecs", "time"] );


	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////
	
	/** Component Factory for 2d renderable
	 * (empty 'dummy' components that just indicate they can be drawn) */
	z2.renderableFactory = z2.createComponentFactory();

	/** Component Factory for 2d image */
	z2.imageFactory = z2.createComponentFactory( {img: null} );

	/** Component Factory for 2d polygon */
	z2.polygonFactory = z2.createComponentFactory( {vertices: []} );

	/** Component Factory for 2d fill type */
	z2.fillFactory = z2.createComponentFactory( {fill: '#ffffff'} );

	/** Component Factory for 2d position */
	z2.positionFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory for 2d position constraints */
	z2.positionConstraintsFactory = z2.createComponentFactory( {minx: 0, maxx:0, miny:0, maxy:0} );

	/** Component Factory for 2d size */
	z2.sizeFactory = z2.createComponentFactory( {width:0, height:0} );

	/** Component Factory for 2d velocity */
	z2.velocityFactory = z2.createComponentFactory( {x: 0, y: 0} );

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
	z2.spriteFactory = z2.createComponentFactory( {img: null, width: 0, animations: null } );

	/** Component Factory for groups */
	z2.groupFactory = z2.createComponentFactory( {group: []} );

	/** Component Factory for 2d rendering groups */
	z2.renderGroupFactory = z2.createComponentFactory();

	/** Component Factory for 2d transform groups */
	z2.transformGroupFactory = z2.createComponentFactory();

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
		this._cur_frame = this.cur_animation[0][0];
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
	z2.createGroupSystem = function( sys, mask, grpsys )
	{
		return new z2.System( [z2.groupFactory, mask],
		{
			init: function()
			{
				if( grpsys && grpsys.init )
					sys.init();
			},
			onStart: function()
			{
				if( grpsys && grpsys.onStart )
					sys.onStart();
			},
			update: function( e, dt )
			{
				if( grpsys )
					grpsys.update( e, dt );

				// get the group
				var rgc = e.getComponent( z2.groupFactory.mask );
				var grp = rgc.group;

				// render each object in our group
				for( var i = 0; i < grp.length; i++ )
				{
					sys.update( grp[i], dt, e );
				}
			},
			onEnd: function()
			{
				if( grpsys && grpsys.onEnd )
					sys.onEnd();
			}
		} );
	};

	/////////////////////////////////////////////////////////////////////////
	/** RenderingSystem factory function
	 * requires: renderable
	 * optional: image, polygon, sprite
	 * @function z2.createRenderingSystem
	 * @arg {Canvas} canvas The HTML5 canvas object on which to render
	 * @arg {boolean} clear Should the canvas automatically be cleared each
	 * frame?
	 */
	z2.createRenderingSystem = function( canvas, clear )
	{
		var context = canvas.getContext( '2d' );
		if( !context )
			throw new Error( "No 2d canvas context. Unable to continue." );

		return new z2.System( [z2.renderableFactory],
		{
			onStart: function()
			{
				// clear screen?
				if( clear )
				{
					// set transform to identity
					context.setTransform( 1, 0, 0, 1, 0, 0 );
					// clear canvas
					// TODO: test code, remove
					////////
					context.fillStyle = '#800000';
					context.fillRect( 0, 0, canvas.width, canvas.height );
					////////
//					context.clearRect( 0, 0, canvas.width, canvas.height );
				}
			},
			update: function( e, dt )
			{
				// get the transform component...
				var xformc = e.getComponent( z2.transformFactory.mask );
				var xf = xformc.xform;
				// ... & set the canvas context's transform
				context.setTransform( xf[0], xf[3], xf[1], xf[4], xf[2], xf[5] );

				// check for different kinds of renderables

				// image Component?
				var imgc = e.getComponent( z2.imageFactory.mask );

				// polygon component?
				var polyc = e.getComponent( z2.polygonFactory.mask );

				// sprite component?
				var spritec = e.getComponent( z2.spriteFactory.mask );

				// center and radius components?
				var ctrc = e.getComponent( z2.centerFactory.mask );
				var radc = e.getComponent( z2.radiusFactory.mask );

				var w, h, szc;
				var fill, fc;

				// image
				if( imgc )
				{
					w = imgc.img.width;
					h = imgc.img.height;
					// get size component, if any
					szc = e.getComponent( z2.sizeFactory.mask );
					if( szc )
					{
						w = szc.width;
						h = szc.height;
					}
					context.drawImage( imgc.img, 0, 0, w, h, 0, 0, w, h );
				}

				// polygon
				if( polyc )
				{
					if( polyc.vertices.length >= 6 )
					{
						// TODO: vertices need to be transformed into view space
						fill = 'rgba( 255, 255, 255, 1 )';
						// get fill component
						fc = e.getComponent( z2.fillFactory.mask );
						if( fc )
							fill = fc.fill;
						context.fillStyle = fill;
						context.beginPath();
						context.moveTo( polyc.vertices[0], polyc.vertices[1] );
						for( var i = 2; i < polyc.vertices.length; i += 2 )
						{
							context.lineTo( polyc.vertices[i], polyc.vertices[i+1] );
						}
						context.closePath();
						context.fill();
					}
				}

				// circle
				if( ctrc && radc )
				{
					// TODO: center needs to be transformed into view space
					fill = 'rgba( 255, 255, 255, 1 )';
					fc = e.getComponent( z2.fillFactory.mask );
					if( fc )
						fill = fc.fill;
					context.fillStyle = fill;
					context.beginPath();
					context.arc( ctrc.cx, ctrc.cy, radc.radius, 0, Math.PI * 1.99 );
					context.closePath();
					context.fill();
				}

				// sprite
				if( spritec )
				{
					w = spritec.img.width;
					h = spritec.img.height;
					// get size component, if any
					szc = e.getComponent( z2.sizeFactory.mask );
					if( szc )
					{
						w = szc.width;
						h = szc.height;
					}
					// offset to the image in the sprite strip
					var offs = spritec.animations.currentFrame * w;
					
					context.drawImage( spritec.img, offs, 0, w, h, 0, 0, w, h );

					// update the current frame & image
					spritec.animations.update( dt );
				}

				// TODO: other renderables ?
			}
		} );
	};

	/////////////////////////////////////////////////////////////////////////
	/** TransformSystem factory function
	 * requires: rootTransform, transform, position
	 * optional: size, rotation, scale, center
	 * @function z2.createTransformSystem
	 * @arg {z2.View} view The View object for this transform system
	 */
	z2.createTransformSystem = function( view )
	{
		return new z2.System( [z2.rootTransformFactory, z2.transformFactory, z2.positionFactory],
		{
			onStart: function()
			{
				view.update();
			},
			// has optional 3rd argument which is the parent, from which to get
			// the xform to perform (instead of the view transform)
			update: function( e, dt, parent )
			{
				// get the transform component
				var xformc = e.getComponent( z2.transformFactory.mask );
				var xf = xformc.xform;
				z2.math.matSetIdentity( xf );

				// get the position component
				var pc = e.getComponent( z2.positionFactory.mask );
				var x = pc.x;
				var y = pc.y;

				// get the size component
				var szc = e.getComponent( z2.sizeFactory.mask );
				var w = 0, h = 0;
				if( szc )
				{
					w = szc.width;
					h = szc.height;
				}

				// get the rotation component
				var rc = e.getComponent( z2.rotationFactory.mask );
				var theta = 0;
				if( rc )
					theta = rc.theta;

				// get the scale component
				var sc = e.getComponent( z2.scaleFactory.mask );
				var sx = 1, sy = 1;
				if( sc )
				{
					sx = sc.sx;
					sy = sc.sy;
				}

				// get the center point
				var cc = e.getComponent( z2.centerFactory.mask );
				var cx = 0.5, cy = 0.5;
				if( cc )
				{
					cx = cc.cx;
					cy = cc.cy;
				}

				// set (local) transform 

				// center / pivot point
				var px = w * cx;
				var py = h * cy;

				// TODO: cache these & only re-compute when rotation changes
				var c = Math.cos( theta );
				var s = Math.sin( theta );
				// scale & rotation
				xf[0] = c * sx;
				xf[1] = -s * sy;
				xf[3] = s * sx;
				xf[4] = c * sy;
				// translation
				// (& account for pivot point)
				xf[2] = x - (xf[0] * px) - (xf[1] * py);
				xf[5] = y - (xf[4] * py) - (xf[3] * px);

				// if we have a parent transform, use it
				if( parent )
				{
					// get the parent transform
					var pxformc = parent.getComponent( z2.transformFactory.mask );
					var pxf = pxformc.xform;

					// TODO: this doesn't account for view rotation or scaling
					// save the scene ('world') x & y
					xformc.scene_x = x + pxformc.scene_x;
					xformc.scene_y = y + pxformc.scene_y;

					// transform to 'parent space'
					// TODO: anything to optimize out (?)
					z2.math.matMul( xf, pxf );
				}
				// otherwise we're the root, transform for view-space
				else
				{
					// TODO: this doesn't account for view rotation or scaling
					// save the scene ('world') x & y
					xformc.scene_x = xf[2] + px;
					xformc.scene_y = xf[5] + py;
					// transform to view space
					view.transform( xf );
				}
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
	z2.createTransformGroupSystem = function( sys )
	{
		return z2.createGroupSystem( sys, z2.transformGroupFactory, sys );
	};

	/////////////////////////////////////////////////////////////////////////
	/** MovementSystem factory function
	 * requires: position, velocity, transform
	 * optional: positionConstraints
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

				// get the transform component
				var xfc = e.getComponent( z2.transformFactory.mask );

				// get the pos constraints component
				var pcc = e.getComponent( z2.positionConstraintsFactory.mask );

				var minx = -Number.MAX_VALUE, maxx = Number.MAX_VALUE;
				var miny = -Number.MAX_VALUE, maxy = Number.MAX_VALUE;
				if( pcc )
				{
					minx = pcc.minx;
					maxx = pcc.maxx;
					miny = pcc.miny;
					maxy = pcc.maxy;
				}

				// account for elapsed time since last frame
				var idt = dt / 1000;
				var xmod = vc.x * idt;
				var ymod = vc.y * idt;
				var x = xfc.scene_x + xmod;
				var y = xfc.scene_y + ymod;
				if( x < maxx && x > minx )
					pc.x += xmod;
				if( y < maxy && y > miny )
					pc.y += ymod;
			}
		} );
	};
};

