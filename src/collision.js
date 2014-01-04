// collision.js
// Copyright 2013 Joshua C Shepard
// Collision detection for zed-squared
//
// TODO:
// - calculate penetration vector
// - 

"use strict";

zSquared.collision = function( z2 )
{
	z2.require( ["math"] );

	// collision detection routines
	// polygons should be defined with vertices in clockwise order
	// (so we use left-hand normals)

	// get the normal for a polygon side
	function getNormal( pt1, pt2 )
	{
		var vec = [pt2[0] - pt1[0], pt2[1] - pt1[1]];
		z2.math.vecNormalize( vec );
		// left-hand normal (-y,x)
		var temp = vec[0];
		vec[0] = -vec[1];
		vec[1] = temp;
		return vec;
	}

	// get the min & max of poly projected onto vec
	// (return min & max in 2-element array out)
	function projectMinMax( poly, vec, out )
	{
		var min, max, cur;
		min = max = z2.math.vecDot( [poly[0], poly[1]], vec );
		for( var i = 2; i < poly.length; i += 2 )
		{
			cur = z2.math.vecDot( [poly[i], poly[i+1]], vec );
			if( cur < min )
				min = cur;
			if( cur > max )
				max = cur;
		}
		out[0] = min;
		out[1] = max;
	}

	/** Collide two polygons
	 * @function z2.collidePolyVsPoly
	 * @arg {Array} p1 (flat) Array of vertices defining polygon 1
	 * @arg {Array} p2 (flat) Array of vertices defining polygon 2
	 * @arg {Array} pv (optional) Vector (2 element array) for returning penetration direction
	 * @returns {Number} magnitude of penetration, or boolean false if no
	 * collision
	 */
	z2.collidePolyVsPoly = function( p1, p2, pv )
	{
		var i, j;

		var p1minmax = [null, null];
		var p2minmax = [null, null];

		var axis;

		var pen1 = Number.MAX_VALUE, pen2 = Number.MAX_VALUE;
		var pv1 = {}, pv2 = {};
		var temp1, temp2, temp3;

		// for each normal, poly1
		for( i = 0; i < p1.length; i += 2 )
		{
			j = i+2;
			if( j === p1.length )
				j = 0;
			// get the normal for this side
			axis = getNormal( [p1[i], p1[i+1]], [p1[j], p1[j+1]] );

			// project the min/max pts onto the normal/axis, poly1
			projectMinMax( p1, axis, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p2, axis, p2minmax );

			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
			if( p1minmax[1] < p2minmax[0] )
				return false;
			else if( p2minmax[1] < p1minmax[0] )
				return false;
			// possible collision, save penetration vector
			else
			{
				temp1 = p1minmax[1] - p2minmax[0];
				temp2 = p2minmax[1] - p1minmax[0];
				temp3 = temp1 < temp2 ? temp1 : temp2;
				if( temp3 < pen1 )
				{
					pen1 = temp3;
					pv1[0] = axis[0];
					pv1[1]= axis[1];
				}
			}
		}
		
		// for each normal, poly2
		for( i = 0; i < p2.length; i +=2 )
		{
			j = i+2;
			if( j === p1.length )
				j = 0;
			// get the normal
			axis = getNormal( [p2[i], p2[i+1]], [p2[j], p2[j+1]] );

			// project the min/max pts onto the normal/axis, poly1
			projectMinMax( p1, axis, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p2, axis, p2minmax );

			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
			if( p1minmax[1] < p2minmax[0] )
				return false;
			else if( p2minmax[1] < p1minmax[0] )
				return false;
			// possible collision, save penetration vector
			else
			{
				temp1 = p1minmax[1] - p2minmax[0];
				temp2 = p2minmax[1] - p1minmax[0];
				temp3 = temp1 < temp2 ? temp1 : temp2;
				if( temp3 < pen2 )
				{
					pen2 = temp3;
					pv2[0] = axis[0];
					pv2[1] = axis[1];
				}
			}
		}

		if( pen1 < pen2 )
		{
			if( pv )
			{
				pv[0] = pv1[0];
				pv[1] = pv1[1];
			}
			return pen1;
		}
		else
		{
			if( pv )
			{
				pv[0] = pv2[0];
				pv[1] = pv2[1];
			}
			return pen2;
		}
	};


	// old routines with vectors as objects e.g. {x:n, y:n}
//	function mag( v )
//	{
//		return Math.sqrt( v.x * v.x + v.y * v.y );
//	}
//
//	function normalize( v )
//	{
//		var m = mag( v );
//		v.x /= m;
//		v.y /= m;
//		return v;
//	}
//
//	function dot( v1, v2 )
//	{
//		return v1.x * v2.x + v1.y * v2.y;
//	}
//
//	function projectMinMax( poly, vec, minmax )
//	{
//		var min, max, cur;
//		min = max = dot( poly[0], vec );
//		for( var i = 1; i < poly.length; i++ )
//		{
//			cur = dot( poly[i], vec );
//			if( cur < min )
//				min = cur;
//			if( cur > max )
//				max = cur;
//		}
//		minmax.min = min;
//		minmax.max = max;
//	}
//
//	/** Collide two polygons
//	 * @function z2.collidePolyVsPoly
//	 * @arg {Array} p1 Array of vertices defining polygon 1
//	 * @arg {Array} p2 Array of vertices defining polygon 2
//	 * @arg {Object} pv (optional) Vector for returning penetration direction
//	 * @returns {Number} magnitude of penetration, or boolean false if no
//	 * collision
//	 */
//	z2.collidePolyVsPoly = function( p1, p2, pv )
//	{
//		var i;
//
//		// convert args from straight arrays
//		var poly1 = [];
//		var poly2 = [];
//		for( i = 0; i < p1.length-1; i += 2 )
//		{
//			poly1.push( {x:p1[i], y:p1[i+1]} );
//		}
//		for( i = 0; i < p2.length-1; i += 2 )
//		{
//			poly2.push( {x:p2[i], y:p2[i+1]} );
//		}
//
//		var p1minmax = {min:null, max:null};
//		var p2minmax = {min:null, max:null};
//
//		var pt1, pt2, vec = {};
//
//		var pen1 = Number.MAX_VALUE, pen2 = Number.MAX_VALUE;
//		var pv1 = {}, pv2 = {};
//		var temp1, temp2, temp3;
//
//		// for each normal, poly1
//		for( i = 0; i < poly1.length; i++ )
//		{
//			// get the normal for this side
//			pt1 = poly1[i];
//			if( i === poly1.length-1 )
//				pt2 = poly1[0];
//			else
//				pt2 = poly1[i+1];
//			vec.x = pt2.x - pt1.x;
//			vec.y = pt2.y - pt1.y;
//			normalize( vec );
//			// left-hand normal
//			temp1 = vec.x;
//			vec.x = -vec.y;
//			vec.y = temp1;
//
//			// project the min/max pts onto the normal/axis, poly1
//			projectMinMax( poly1, vec, p1minmax );
//
//			// project the min/max pts onto the normal/axis, poly2
//			projectMinMax( poly2, vec, p2minmax );
//
//			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
//			if( p1minmax.max < p2minmax.min )
//				return false;
//			else if( p2minmax.max < p1minmax.min )
//				return false;
//			// possible collision, save penetration vector
//			else
//			{
//				temp1 = p1minmax.max - p2minmax.min;
//				temp2 = p2minmax.max - p1minmax.min;
//				temp3 = temp1 < temp2 ? temp1 : temp2;
//				if( temp3 < pen1 )
//				{
//					pen1 = temp3;
//					pv1.x = vec.x;
//					pv1.y = vec.y;
//				}
//			}
//		}
//		
//		// for each normal, poly2
//		for( i = 0; i < poly2.length; i++ )
//		{
//			// get the normal
//			pt1 = poly2[i];
//			if( i === poly2.length-1 )
//				pt2 = poly2[0];
//			else
//				pt2 = poly2[i+1];
//			vec.x = pt2.x - pt1.x;
//			vec.y = pt2.y - pt1.y;
//			normalize( vec );
//			// left-hand normal
//			temp1 = vec.x;
//			vec.x = -vec.y;
//			vec.y = temp1;
//
//			// project the min/max pts onto the normal/axis, poly1
//			projectMinMax( poly1, vec, p1minmax );
//
//			// project the min/max pts onto the normal/axis, poly2
//			projectMinMax( poly2, vec, p2minmax );
//
//			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
//			if( p1minmax.max < p2minmax.min )
//				return false;
//			else if( p2minmax.max < p1minmax.min )
//				return false;
//			// possible collision, save penetration vector
//			else
//			{
//				temp1 = p1minmax.max - p2minmax.min;
//				temp2 = p2minmax.max - p1minmax.min;
//				temp3 = temp1 < temp2 ? temp1 : temp2;
//				if( temp3 < pen2 )
//				{
//					pen2 = temp3;
//					pv2.x = vec.x;
//					pv2.y = vec.y;
//				}
//			}
//		}
//
//		if( pen1 < pen2 )
//		{
//			if( pv )
//			{
//				pv.x = pv1.x;
//				pv.y = pv1.y;
//			}
//			return pen1;
//		}
//		else
//		{
//			if( pv )
//			{
//				pv.x = pv2.x;
//				pv.y = pv2.y;
//			}
//			return pen2;
//		}
//	};

	// angle between two vectors
	function getAngle( a, b )
	{
		// cos(theta) = a.b / |a| |b|
//		var maga = mag( a );
//		var magb = mag( b );
//		var ct = dot( a, b ) / (maga * magb);
//		return Math.acos( ct );

//		return Math.acos( z2.math.vecDot( a, b ) / (z2.math.vecMag( a ) * z2.math.vecMag( b )) );
		var maga = z2.math.vecMag( a );
		var magb = z2.math.vecMag( b );
		var ct = z2.math.vecDot( a, b ) / (maga * magb);
		return Math.acos( ct );
	}

	// sort a (SIMPLE, CONVEX) polygon's vertices into CW order
	z2.sortVertices = function( vertices )
	{
		// create a copy of the vertex array
		var clone = vertices.slice( 0 );

		var numpts = vertices.length/2;

		// centroid
		var i, cx = 0, cy = 0;
		for( i = 0; i < vertices.length; i +=2 )
		{
			cx += vertices[i];
			cy += vertices[i+1];
		}
		cx /= numpts;
		cy /= numpts;

		// determine the angle of the vector from each point to the centroid,
		// w/ respect to 12 o'clock
		var angles = [];
		// "noon" = a point directly above the centroid
		var noon = [cx, cy - 1];
		for( i = 0; i < vertices.length; i += 2 )
		{
			var v = [vertices[i] - cx, vertices[i+1] - cy];
			angles.push( {theta:getAngle( noon, v ), vertex:{x:clone[i], y:clone[i+1]} } );
		}

		// sort by their angles
		angles.sort( function( a, b ) { return a.theta - b.theta; } );

		// set the original array
		var j;
		for( i = 0, j = 0; i < vertices.length; i += 2, j++ )
		{
			vertices[i] = angles[j].vertex.x;
			vertices[i+1] = angles[j].vertex.y;
		}
	};

};


