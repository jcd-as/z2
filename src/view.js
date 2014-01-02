// view.js
// Copyright 2013 Joshua C Shepard
// Canvas view class/module for zed-squared
//
// TODO:
// - implement follow-mode
// -

"use strict";

zSquared.view = function( z2 )
{
	z2.require( ["math", "scene"] );

	z2.FOLLOW_MODE_NONE = 'follow-mode-none';
	z2.FOLLOW_MODE_TIGHT = 'follow-mode-tight';
	z2.FOLLOW_MODE_PLATFORMER = 'follow-mode-platformer';
	z2.FOLLOW_MODE_OVERHEAD_SCROLLER = 'follow-mode-overhead-scroller';

	/** 
	 * @class z2#z2.View
	 * @classdesc View class. Represents a view into a Scene
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
		this.follow_mode = follow_mode || z2.FOLLOW_MODE_NONE;
		this._theta = 0;
		this._sx = 1;
		this._sy = 1;
		this._x = 0;
		this._y = 0;
		this._xform = z2.math.matCreateIdentity();

		this.setPosition( x || 0, y || 0 );
	};

	/** Transform to view-space
	 * @method z2.View#transform
	 * @memberof z2.View
	 * @arg {Float64Array} mat The matrix to transform
	 */
	z2.View.prototype.transform = function( mat )
	{
		// transform to screen space
		z2.math.matMul( mat, this._xform );
		// and then translate over to view space
		var x = this.width/2;
		var y = this.height/2;
		z2.math.matTranslate( mat, x, y );
		return mat;
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

    /**
    * @property {number} rotation The angle of rotation of the view (in
	* radians). (Note that the View is, like a camera, 'looking at' the scene,
	* so if you rotate the view clockwise, the displayed scene will appear to
	* rotate CCW, and vice-versa)
    */
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

    /**
    * @property {number} sx The scale factor for the view in the X dimension
    */
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
    /**
    * @property {number} sy The scale factor for the view in the Y dimension
    */
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

    /**
    * @property {number} x The X coordinate of the center of the View
    */
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
    /**
    * @property {number} y The Y coordinate of the center of the View
    */
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

