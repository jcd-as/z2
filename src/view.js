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
	 * @arg {z2.Scene} scene The Scene object on which this View looks
	 * @arg {number} width The width of the View, in pixels
	 * @arg {number} height The height of the View, in pixels
	 * @arg {Object} target The target object to follow. (Must support x and y
	 * coordinates)
	 * @arg {string} follow_mode (optional) The 'follow mode' to use
	 * @arg {number} x (optional) Initial x coordinate of the (center of the) View
	 * @arg {number} y (optional) Initial y coordinate of the (center of the) View
	 */
	z2.View = function( scene, width, height, target, follow_mode, x, y )
	{
		this.scene = scene;
		this.width = width;
		this.height = height;
		this.target = target;

		// follow-mode data
		this._hbuf = 0;
		this._vbuf = 0;
		this._hoffs = 0;
		this._voffs = 0;
		this.follow_mode = follow_mode || z2.FOLLOW_MODE_NONE;

		// rotation
		this._theta = 0;
		// scale
		this._sx = 1;
		this._sy = 1;
		// position
		this._x = 0;
		this._y = 0;
		// transform
		this._xform = z2.math.matCreateIdentity();

		this.setPosition( x || 0, y || 0 );
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
				this.hbuf = this.width/3;
				this.vbuf = this.height/4;
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

	/** Transform to view-space
	 * @method z2.View#transform
	 * @memberof z2.View
	 * @arg {Float64Array} mat The matrix to transform
	 */
	z2.View.prototype.transform = function( mat )
	{
		// TODO: adjust for follow-mode
		if( this.follow_mode !== z2.FOLLOW_MODE_NONE )
			this._follow();

		// transform to screen space
		z2.math.matMul( mat, this._xform );
		// and then translate over to view space
		var x = this.width/2;
		var y = this.height/2;
		z2.math.matTranslate( mat, x, y );
		return mat;
	};

	z2.View.prototype._follow = function()
	{
		var l = -this._x - this.hoffs;
		var r = -this._x + this.hoffs;
		var t = -this._y - this.voffs;
		var b = -this._y + this.voffs;

		var x = this.target.x;
		var y = this.target.y;

		var xstop = false, ystop = false;

		// account for scene size
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
			this._x = -x;
		if( sety )
			this._y = -y;

		if( setx || sety )
		{
			// update the transform (translation only)
			// pivot point (in screen space)
			var px = this.scene.width/2;
			var py = this.scene.height/2;
			this._xform[2] = this._x - (this._xform[0] * px) - (this._xform[1] * py) + this.scene.width/2;
			this._xform[5] = this._y - (this._xform[4] * py) - (this._xform[3] * px) + this.scene.height/2;
		}
	};

	z2.View.prototype._setTransform = function()
	{
		z2.math.matSetIdentity( this._xform );

		// set (local) transform 

		// pivot point (in screen space)
		var px = this.scene.width/2;
		var py = this.scene.height/2;

		// TODO: cache these & only re-compute when rotation changes
		var c = Math.cos( this._theta );
		var s = Math.sin( this._theta );
		// scale & rotation
		this._xform[0] = c * this._sx;
		this._xform[1] = -s * this._sy;
		this._xform[3] = s * this._sx;
		this._xform[4] = c * this._sy;
		// translation
		// (& account for pivot point & screen space)
		this._xform[2] = this._x - (this._xform[0] * px) - (this._xform[1] * py) + this.scene.width/2;
		this._xform[5] = this._y - (this._xform[4] * py) - (this._xform[3] * px) + this.scene.height/2;
	};

	Object.defineProperty( z2.View.prototype, 'rotation',
	{
		get: function()
		{
			return -this._theta;
		},
		set: function( val )
		{
			if( val !== -this._theta )
			{
				this._theta = -val;
				this._setTransform();
			}
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
		var setx = false, sety = false;
		if( sx !== this._sx ) setx = true;
		if( sy !== this._sy ) sety = true;

		if( setx ) this._sx = sx;
		if( sety ) this._sy = sy;

		if( setx || sety )
		{
			this._setTransform();
		}
	};

	Object.defineProperty( z2.View.prototype, 'sx',
	{
		get: function()
		{
			return this._sx;
		},
		set: function( val )
		{
			this.setScale( val, this._sx );
		}
	} );
	Object.defineProperty( z2.View.prototype, 'sy',
	{
		get: function()
		{
			return this._y;
		},
		set: function( val )
		{
			this.setScale( this._sx, val );
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

		var setx = false, sety = false;
		if( -x !== this._x ) setx = true;
		if( -y !== this._y ) sety = true;

		if( setx ) this._x = -x;
		if( sety ) this._y = -y;

		if( setx || sety )
		{
			this._setTransform();
		}
	};

	Object.defineProperty( z2.View.prototype, 'x',
	{
		get: function()
		{
			return -this._x;
		},
		set: function( val )
		{
			this.setPosition( val, -this._x );
		}
	} );
	Object.defineProperty( z2.View.prototype, 'y',
	{
		get: function()
		{
			return -this._y;
		},
		set: function( val )
		{
			this.setPosition( -this._x, val );
		}
	} );

};

