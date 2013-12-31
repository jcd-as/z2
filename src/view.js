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
		this._xform = z2.matCreateIdentity();

		this.setPosition( x || 0, y || 0 );
	};

	/** Transform to view-space
	 * @method z2.View#transform
	 * @memberof z2.View
	 * @arg {Float64Array} mat The matrix to transform
	 */
	z2.View.prototype.transform = function( mat )
	{
		return z2.matMul( mat, this._xform );
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
				z2.matSetRotationAndScale( this._xform, this._theta, this._sx, this._sy );
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
			z2.matSetRotationAndScale( this._xform, this._theta, this._sx, this._sy );
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
			z2.matSetTranslation( this._xform, this._x, this._y );
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
			this.setPosition( val, this._x );
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
			this.setPosition( this._x, val );
		}
	} );

};

