// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// x Render System
// . Transform System
//	- parent (group) transforms
// x Animated sprite System
// - 

"use strict";

zSquared['2d'] = function( z2 )
{
	z2.require( ["math", "ecs", "time"] );


	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////
	
	/** Component Factory for 2d renderable
	 * (empty 'dummy' components that just indicate they can be drawn) */
	z2.renderableFactory = z2.createComponentFactory();

	/** Component Factory for 2d image */
	z2.imageFactory = z2.createComponentFactory( {img: null} );

	/** Component Factory 2d polygon */
	z2.polygonFactory = z2.createComponentFactory( {vertices: []} );

	/** Component Factory 2d position */
	z2.positionFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory 2d size */
	z2.sizeFactory = z2.createComponentFactory( {width:0, height:0} );

	/** Component Factory 2d velocity */
	z2.velocityFactory = z2.createComponentFactory( {x: 0, y: 0} );

	/** Component Factory 2d rotation */
	z2.rotationFactory = z2.createComponentFactory( {theta: 0} );

	/** Component Factory 2d scale */
	z2.scaleFactory = z2.createComponentFactory( {sx: 1, sy: 1} );

	/** Component Factory 2d center point */
	z2.centerFactory = z2.createComponentFactory( {cx: 0.5, cy: 0.5} );

	/** Component Factory 2d transform */
	z2.transformFactory = z2.createComponentFactory( {xform: null} );

	/** Component Factory 2d (animated) sprite */
	z2.spriteFactory = z2.createComponentFactory( {img: null, width: 0, animations: null } );

	/** @class z2.Animations
	  * @classdesc Helper class for sprite animations */
	// TODO: support per-frame time in animation sequences
	z2.Animations = function()
	{
		this.animations = [];
		this.cur_animation = null;
		this._cur_frame = 0;
		this._frame_time = 0;
	};
	/** @property {number} currentFrame Get the index (in the sprite sheet) of
	 * the current frame to be displayed */
	Object.defineProperty( z2.Animations.prototype, 'currentFrame',
	{
		get: function()
		{
			return this.cur_animation[this._cur_frame][0];
		}
	} );
	/** Add an aniation sequence
	 * @method z2.Animations#add
	 * @memberof z2.Animation
	 * @arg {string} name Friendly name of sequence, to be used as look-up key
	 * @arg {Array} anim An array containing the frames of the animation
	 * sequence, with each frame being a two-element array consisting of the
	 * frame index and the ms spent on this frame (e.g. [0, 250])
	 */
	z2.Animations.prototype.add = function( name, anim )
	{
		this.animations[name] = anim;
	};
	/** Start playing an animation sequence
	 * @method z2.Animations#play
	 * @arg {string} name The (friendly) name of the sequence to play
	 */
	z2.Animations.prototype.play = function( name )
	{
		this.cur_animation = this.animations[name];
		this._cur_frame = this.cur_animation[0][0];
		this._frame_time = 0;
	};
	/** Stop playing any animation sequence
	 * @method z2.Animations#stop
	 */
	z2.Animations.prototype.stop = function()
	{
		this.cur_animation = null;
		this._frame_time = 0;
	};
	/** Update the current frame given a time delta
	 * @method z2.Animations#update
	 * @arg {number} dt The time delta (elapsed time since last frame)
	 */
	z2.Animations.prototype.update = function( dt )
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

				var w, h, szc;

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
						// TODO: set the correct fill style
						context.fillStyle = '#ff0000';
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
	 * requires: transform, position, size
	 * optional: rotation, scale, center
	 * @function z2.createTransformSystem
	 * @arg {z2.View} view The View object for this transform system
	 */
	z2.createTransformSystem = function( view )
	{
		return new z2.System( [z2.transformFactory, z2.positionFactory, z2.sizeFactory],
		{
			update: function( e, dt )
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
				var w = szc.width;
				var h = szc.height;

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

				// TODO: parent transform(s)...

				// transform for view-space
				view.transform( xf );
			}
		} );
	};

	/////////////////////////////////////////////////////////////////////////
	/** MovementSystem factory function
	 * requires: position, velocity
	 * optional: ...
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
				
				// TODO: account for elapsed time since last frame !
				// (instead of assuming 60 fps)
				pc.x += vc.x / 60;
				pc.y += vc.y / 60;
			}
		} );
	};
};

