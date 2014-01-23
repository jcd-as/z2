// 2d.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d games
//
// TODO:
// - 

zSquared['2d'] = function( z2 )
{
	"use strict";

	z2.require( ["math", "ecs", "time", "tilemap"] );


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
	z2.spriteFactory = z2.createComponentFactory( {sprite: null, width: 0, animations: null } );

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
				// test constraints
				var x = pc.x + xmod;
				var y = pc.y + ymod;
				if( x < maxx && x > minx )
					pc.x = x;
				if( y < maxy && y > miny )
					pc.y = y;
			}
		} );
	};
};

