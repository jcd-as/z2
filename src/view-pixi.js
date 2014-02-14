// view.js
// Copyright 2013 Joshua C Shepard
// Canvas view class/module for zed-squared
//
// TODO:
// -

zSquared.view = function( z2 )
{
	"use strict";

	z2.require( ["math", "scene"] );

	z2.FOLLOW_MODE_NONE = 'follow-mode-none';
	z2.FOLLOW_MODE_TIGHT = 'follow-mode-tight';
	z2.FOLLOW_MODE_PLATFORMER = 'follow-mode-platformer';
	z2.FOLLOW_MODE_OVERHEAD_SCROLLER = 'follow-mode-overhead-scroller';

	/** 
	 * @class z2#z2.View
	 * @classdesc View class. Represents a view into a Scene
    * @property {string} follow_mode The angle of rotation of the view (in
    * @property {number} rotation The angle of rotation of the view (in
	* radians). (Note that the View is, like a camera, 'looking at' the scene,
	* so if you rotate the view clockwise, the displayed scene will appear to
	* rotate CCW, and vice-versa)
    * @property {number} sx The scale factor for the view in the X dimension
    * @property {number} sy The scale factor for the view in the Y dimension
    * @property {number} x The X coordinate of the center of the View
    * @property {number} y The Y coordinate of the center of the View
	 * @constructor
	 * @arg {number} width The width of the View, in pixels
	 * @arg {number} height The height of the View, in pixels
	 * @arg {Object} target The target object to follow. (Must support x and y
	 * coordinates)
	 * @arg {string} [follow_mode] The 'follow mode' to use
	 * @arg {number} [x] Initial x coordinate of the (center of the) View
	 * @arg {number} [y] Initial y coordinate of the (center of the) View
	 */
	z2.View = function( width, height, target, follow_mode, x, y )
	{
		this.scene = null;
		this.width = width;
		this.height = height;
		this._target = null;
		if( target )
			this.target = target;

		// PIXI display object container for camera / view space
		this.camera_doc = new PIXI.DisplayObjectContainer();
		// PIXI display object container for scene / world space
		this.doc = new PIXI.DisplayObjectContainer();
		this.camera_doc.addChild( this.doc );
		// position in scene / world space
		var px = x || 0;
		var py = y || 0;
		this.doc.position.x = -px;
		this.doc.position.y = -py;
		// camera space
		this.camera_doc.position.x = this.width/2;
		this.camera_doc.position.y = this.height/2;

		// follow-mode data
		this._hbuf = 0;
		this._vbuf = 0;
		this._hoffs = 0;
		this._voffs = 0;
		this.follow_mode = follow_mode || z2.FOLLOW_MODE_NONE;
	};

	/** Update the view for the frame
	 * @function z2.View#update
	 * @memberof z2.View
	 */
	z2.View.prototype.update = function()
	{
		// adjust for follow-mode
		if( this.follow_mode !== z2.FOLLOW_MODE_NONE )
			this._follow();
	};

	/** Add a (Pixi DisplayObject) to the view
	 * @function z2.View#add
	 * @memberof z2.View
	 * @arg {Pixi.DisplayObject} obj The object to add
	 * @arg {boolean} [fixed] Is the object fixed to the camera or not? fixed
	 * objects do not move (e.g. a HUD or life-meter). default is false
	 */
	z2.View.prototype.add = function( obj, fixed )
	{
		if( fixed )
			game.stage.addChild( obj );
		else
			this.doc.addChild( obj );
	};

	/** Remove a (Pixi DisplayObject) from the view
	 * @function z2.View#add
	 * @memberof z2.View
	 * @arg {Pixi.DisplayObject} obj The object to remove
	 * @arg {boolean} [fixed] Is the object fixed to the camera or not? fixed
	 * objects do not move (e.g. a HUD or life-meter). default is false
	 */
	z2.View.prototype.remove = function( obj, fixed )
	{
		if( fixed )
			game.stage.removeChild( obj );
		else
			this.doc.removeChild( obj );
	};

	Object.defineProperty( z2.View.prototype, 'follow_mode',
	{
		get: function()
		{
			return this._follow_mode;
		},
		set: function( val )
		{
			this._follow_mode = val;
			// TODO: move these calcs to 'follow_mode' property setter
			// horizontal and vertical "buffer spaces"
			switch( this.follow_mode )
			{
			case z2.FOLLOW_MODE_TIGHT:
				this.hbuf = this.width/2;
				this.vbuf = this.height/2;
				break;
			case z2.FOLLOW_MODE_PLATFORMER:
				// TODO: better values? different 'top' value than 'bottom'
				// (instead of same 'vbuf' for top & bottom)
				this.hbuf = this.width/2.5;
				this.vbuf = this.height/3;
				break;
			case z2.FOLLOW_MODE_OVERHEAD_SCROLLER:
				this.hbuf = this.width/3;
				this.vbuf = this.height/3;
				break;
			}

			// horizontal and vertical offset from center
			// (ie distance from center of view to target)
			this.hoffs = this.width/2 - this.hbuf;
			this.voffs = this.height/2 - this.vbuf;
		}
	} );

	z2.View.prototype._follow = function()
	{
		var l = -this.doc.position.x - this.hoffs;
		var r = -this.doc.position.x + this.hoffs;
		var t = -this.doc.position.y - this.voffs;
		var b = -this.doc.position.y + this.voffs;

		// get the target's x/y coordinates in scene space
		var x = this._target.x;
		var y = this._target.y;

		var xstop = false, ystop = false;

		// account for scene size
		if( this.scene )
		{
			if( x > this.scene.width - this.hbuf || x < this.hbuf )
			{
				// x can't change
				xstop = true;
			}
			if( y > this.scene.height - this.vbuf || y < this.vbuf )
			{
				// y can't change
				ystop = true;
			}
		}

		var setx = false;
		var sety = false;

		// account for buffer space
		if( !xstop )
		{
			if( x < l )
			{
				x += this.hoffs;
				setx = true;
			}
			else if( x > r )
			{
				x -= this.hoffs;
				setx = true;
			}
		}
		if( !ystop )
		{
			if( y < t )
			{
				y += this.voffs;
				sety = true;
			}
			else if( y > b )
			{
				y -= this.voffs;
				sety = true;
			}
		}

		if( setx )
			this.doc.position.x = Math.round(-x);
		if( sety )
			this.doc.position.y = Math.round(-y);
	};

	Object.defineProperty( z2.View.prototype, 'rotation',
	{
		get: function()
		{
			return -this.camera_doc.rotation;
		},
		set: function( val )
		{
			this.camera_doc.rotation = -val;
		}
	} );

	/** Set the View scale
	 * @method z2.View#setScale
	 * @memberof z2.View
	 * @arg {Number} sx The x scale factor
	 * @arg {Number} sy The y scale factor
	 */
	z2.View.prototype.setScale = function( sx, sy )
	{
		this.camera_doc.scale.x = sx;
		this.camera_doc.scale.y = sy;
	};

	Object.defineProperty( z2.View.prototype, 'sx',
	{
		get: function()
		{
			return this.camera_doc.scale.x;
		},
		set: function( val )
		{
			this.camera_doc.scale.x = val;
		}
	} );
	Object.defineProperty( z2.View.prototype, 'sy',
	{
		get: function()
		{
			return this.camera_doc.scale.y;
		},
		set: function( val )
		{
			this.camera_doc.scale.y = val;
		}
	} );

	/** Set the (center of) the View position (in the Scene)
	 * @method z2.View#setPosition
	 * @memberof z2.View
	 * @arg {Number} x The x coordinate for the position
	 * @arg {Number} y The y coordinate for the position
	 */
	z2.View.prototype.setPosition = function( x, y )
	{
		// do nothing if we're following
		if( this.follow_mode !== z2.FOLLOW_MODE_NONE )
			return;

		this.doc.position.x = x;
		this.doc.position.y = y;
	};

	Object.defineProperty( z2.View.prototype, 'target',
	{
		get: function()
		{
			return this._target;
		},
		set: function( val )
		{
			this._target = val;
			// center the view on the target
			this.doc.position.x = Math.round( -val.x );
			this.doc.position.y = Math.round( -val.y );
			// if the view exceeds the scene boundaries, we need to adjust
			var left = -this.doc.position.x - this.width/2;
			var right = -this.doc.position.x + this.width/2;
			var top = -this.doc.position.y - this.height/2;
			var bottom = -this.doc.position.y + this.height/2;
			if( this.scene )
			{
				if( left < 0 || right > this.scene.width || top < 0 || bottom > this.scene.height )
				{
					// adjust the view so that we're not 'out of bounds'
					var xoff = 0, yoff = 0;
					if( left < 0 )
						xoff = left;
					else if( right > this.scene.width )
						xoff = right - this.scene.width;
					if( top < 0 )
						yoff = top;
					else if( bottom > this.scene.height )
						yoff = bottom - this.scene.height;

					this.doc.position.x += xoff;
					this.doc.position.y += yoff;
				}
			}
		}
	} );

	Object.defineProperty( z2.View.prototype, 'x',
	{
		get: function()
		{
			return -this.doc.position.x;
		},
		set: function( val )
		{
			this.doc.position.x = -val;
		}
	} );
	Object.defineProperty( z2.View.prototype, 'y',
	{
		get: function()
		{
			return -this.doc.position.y;
		},
		set: function( val )
		{
			this.doc.position.y = -val;
		}
	} );

};

