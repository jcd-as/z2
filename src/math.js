// math.js
// Copyright 2013 Joshua C Shepard
// math, incl vector & matrix, routines for zed-squared

"use strict";

zSquared.math = function( z2 )
{
	// helpers

	/** const */
	var D2R_CONVERSION_FACTOR = Math.PI/180;
	var R2D_CONVERSION_FACTOR = 180/Math.PI;

	z2.d2r = function( d )
	{
		return d * D2R_CONVERSION_FACTOR;
	};

	z2.r2d = function( r )
	{
		return r * R2D_CONVERSION_FACTOR;
	};


	// vector math routines

	z2.vecAdd = function( v1, v2, out )
	{
		if( !out )
			out = v1;
		out[0] = v1[0] + v2[0];
		out[1] = v1[1] + v2[1];
	};
	
	z2.vecSub = function( v1, v2, out )
	{
		if( !out )
			out = v1;
		out[0] = v1[0] - v2[0];
		out[1] = v1[1] - v2[1];
	};
	
	z2.vecMul = function( v1, v2, out )
	{
		if( !out )
			out = v1;
		out[0] = v1[0] * v2[0];
		out[1] = v1[1] * v2[1];
	};

	z2.vecDiv = function( v1, v2, out )
	{
		if( !out )
			out = v1;
		out[0] = v1[0] / v2[0];
		out[1] = v1[1] / v2[1];
	};

	z2.vecAddTo = function( v, n, out )
	{
		if( !out )
			out = v;
		out[0] = v[0] * n;
		outv[1] = v[1] * n;
	};

	z2.vecSubFrom = function( v, n, out )
	{
		if( !out )
			out = v;
		out[0] = v[0] - n;
		out[1] = v[1] = n;
	};

	z2.vecMulBy = function( v, n, out )
	{
		if( !out )
			out = v;
		out[0] = v[0] * n;
		out[1] = v[1] * n;
	};

	z2.vecDivBy = function( v, n, out )
	{
		if( !out )
			out = v;
		out[0] = v[0] / n;
		out[1] = v[1] / n;
	};

	z2.vecDot = function( v1, v2 )
	{
		return v1[0] * v2[0] + v1[1] * v2[1];
	};

	z2.vecMag = function( v )
	{
		return Math.sqrt( v[0] * v[0] + v[1] * v[1] );
	};

	z2.vecNormalize = function( v, out )
	{
		if( !out )
			out = v;
		var mag = z2.vecMag( v );
		out[0] = v[0] / mag;
		out[1] = v[1] / mag;
	};


	// (3x3) matrix math routines

	z2.matCreateIdentity = function()
	{
		var m = new Float64Array( 9 );

		m[0] = 1;
		m[1] = 0;
		m[2] = 0;
		m[3] = 0;
		m[4] = 1;
		m[5] = 0;
		m[6] = 0;
		m[7] = 0;
		m[8] = 1;
		
		return m;
	};

	z2.matSetIdentity = function( m )
	{
		m[0] = 1;
		m[1] = 0;
		m[2] = 0;
		m[3] = 0;
		m[4] = 1;
		m[5] = 0;
		m[6] = 0;
		m[7] = 0;
		m[8] = 1;
		
		return m;
	};

	z2.matSetTranslation = function( m, dx, dy )
	{
		m[2] = dx;
		m[5] = dy;
		return m;
	};

	z2.matSetScale = function( m, sx, sy )
	{
		m[0] = sx;
		m[4] = sy;
		return m;
	};

	z2.matSetRotation = function( m, theta )
	{
		var c = Math.cos( theta );
		var s = Math.sin( theta );
		m[0] = c;
		m[1] = s;
		m[3] = -s;
		m[4] = c;
		return m;
	};

	z2.matSetRotationAndScale = function( m, theta, sx, sy )
	{
		var c = Math.cos( theta );
		var s = Math.sin( theta );
		m[0] = c * sx;
		m[1] = -s * sy;
		m[3] = s * sx;
		m[4] = c * sy;
		return m;
	};

	z2.matTranslate = function( m, dx, dy, out )
	{
		if( !out )
			out = m;
		var t = z2.matCreateIdentity();
		z2.matSetTranslation( t, dx, dy );
		z2.matMul( m, t, out );
		return out;
	};

	z2.matScale = function( m, sx, sy, out )
	{
		if( !out )
			out = m;
		var s = z2.matCreateIdentity();
		s.matSetScale( sx, sy );
		z2.matMul( m, s, out );
		return out;
	};

	z2.matRotate = function( m, theta, out )
	{
		if( !out )
			out = m;
		var r = z2.matCreateIdentity();
		r.matSetRotation( theta );
		z2.matMul( m, r, out );
		return out;
	};

	z2.matMul = function( m1, m2, out ) 
	{
		if( !out )
			out = m1;
		
		// cache values
		var a00 = m1[0], a01 = m1[1], a02 = m1[2],
			a10 = m1[3], a11 = m1[4], a12 = m1[5],
			a20 = m1[6], a21 = m1[7], a22 = m1[8],
		
			b00 = m2[0], b01 = m2[1], b02 = m2[2],
			b10 = m2[3], b11 = m2[4], b12 = m2[5],
			b20 = m2[6], b21 = m2[7], b22 = m2[8];
		
		out[0] = b00 * a00 + b01 * a10 + b02 * a20;
		out[1] = b00 * a01 + b01 * a11 + b02 * a21;
		out[2] = b00 * a02 + b01 * a12 + b02 * a22;

		out[3] = b10 * a00 + b11 * a10 + b12 * a20;
		out[4] = b10 * a01 + b11 * a11 + b12 * a21;
		out[5] = b10 * a02 + b11 * a12 + b12 * a22;

		out[6] = b20 * a00 + b21 * a10 + b22 * a20;
		out[7] = b20 * a01 + b21 * a11 + b22 * a21;
		out[8] = b20 * a02 + b21 * a12 + b22 * a22;
		
		return out;
	};

	z2.matClone = function( m )
	{
		var m1 = new Float64Array( 9 );

//		m1[0] = m[0];
//		m1[1] = m[1];
//		m1[2] = m[2];
//		m1[3] = m[3];
//		m1[4] = m[4];
//		m1[5] = m[5];
//		m1[6] = m[6];
//		m1[7] = m[7];
//		m1[8] = m[8];
		
		m1.set( m );
		return m1;
	};

	z2.matTranspose = function( m, out ) 
	{
		// If we are transposing ourselves we can skip a few steps but have to cache some values
		if( !out || m === out )
		{
			var a01 = m[1], a02 = m[2], a12 = m[5];

			m[1] = m[3];
			m[2] = m[6];
			m[3] = a01;
			m[5] = m[7];
			m[6] = a02;
			m[7] = a12;
			return m;
		}
		else
		{
			out[0] = m[0];
			out[1] = m[3];
			out[2] = m[6];
			out[3] = m[1];
			out[4] = m[4];
			out[5] = m[7];
			out[6] = m[2];
			out[7] = m[5];
			out[8] = m[8];
			return out;
		}
	};
};

