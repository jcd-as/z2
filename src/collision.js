// collision.js
// Copyright 2013 Joshua C Shepard
// Collision detection for zed-squared
//
// TODO:
// - AABB vs poly
// - AABB vs circle
// - AABB vs AA right triangles 
// - optimize
// - (optimized) routines to just detect intersection, not resolve collision
// - 

"use strict";

zSquared.collision = function( z2 )
{
	z2.require( ["math"] );

	/////////////////////////////////////////////////////////////////////////
	// collision detection routines
	/////////////////////////////////////////////////////////////////////////
	// polygons should be defined with vertices in clockwise order
	// (so we use left-hand normals)

	// get the normal for a polygon side
	function getNormal( pt1, pt2, out )
	{
		out[0] = pt2[0] - pt1[0];
		out[1] = pt2[1] - pt1[1];
		z2.math.vecNormalize( out );
		// left-hand normal (-y,x)
		var temp = out[0];
		out[0] = -out[1];
		out[1] = temp;
		return out;
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

	// module scope vars, to avoid (re)allocations & frees
	var vec = [Number.NaN, Number.NaN];
	var p1minmax = [Number.NaN, Number.NaN];
	var p2minmax = [Number.NaN, Number.NaN];

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

		var pen1 = Number.MAX_VALUE, pen2 = Number.MAX_VALUE;
		var temp1, temp2, temp3;
		var pv1x, pv1y, pv2x, pv2y;

		// for each side, poly 1
		for( i = 0; i < p1.length; i += 2 )
		{
			j = i+2;
			if( j === p1.length )
				j = 0;
			// get the normal for this side
			getNormal( [p1[i], p1[i+1]], [p1[j], p1[j+1]], vec );

			// project the min/max pts onto the normal/axis, poly1
			projectMinMax( p1, vec, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p2, vec, p2minmax );

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
					pv1x = vec[0];
					pv1y= vec[1];
				}
			}
		}
		
		// for each side, poly 2
		for( i = 0; i < p2.length; i +=2 )
		{
			j = i+2;
			if( j === p1.length )
				j = 0;
			// get the normal
			getNormal( [p2[i], p2[i+1]], [p2[j], p2[j+1]], vec );

			// project the min/max pts onto the normal/axis, poly1
			projectMinMax( p1, vec, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p2, vec, p2minmax );

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
					pv2x = vec[0];
					pv2y = vec[1];
				}
			}
		}

		// return least penetration & vector
		if( pen1 < pen2 )
		{
			if( pv )
			{
				pv[0] = pv1x;
				pv[1] = pv1y;
			}
			return pen1;
		}
		else
		{
			if( pv )
			{
				pv[0] = pv2x;
				pv[1] = pv2y;
			}
			return pen2;
		}
	};

	/** Collide two Axis-Aligned Bounding Boxes
	 * @function z2.collideAabbVsAabb
	 * @arg {Array} p1 (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} p2 (flat) Array of values for aabb 2: top, left, bottom, right
	 * @arg {Array} pv (optional, out) Vector (2 element array) for returning penetration direction
	 * @returns {Number} magnitude of penetration, or boolean false if no
	 * collision
	 */
	z2.collideAabbVsAabb = function( p1, p2, pv )
	{
		var pen1, pen2;

		// horizontal axis:
		// y overlaps:
		var t1 = p1[3] - p2[1];
		var t2 = p2[3] - p1[1];

		// vertical axis:
		// x overlaps:
		var t3 = p1[2] - p2[0];
		var t4 = p2[2] - p1[0];

		// no overlap?
		if( t1 < 0 || t2 < 0 || t3 < 0 || t4 < 0 )
			return false;
		else
		{
			pen1 = Math.min( t1, t2 );
			pen2 = Math.min( t3, t4 );

			// if we need the penetration vector
			if( pv )
			{
				// penetration direction
				var nx = (p2[0] + p2[2]) - (p1[0] + p1[2]);
				var ny = (p2[1] + p2[3]) - (p1[1] + p1[3]);

				// least penetration is vertical
				if( pen1 < pen2 )
				{
					pv[0] = 0;
					if( ny > 0 )
						pv[1] = -1;
					else
						pv[1] = 1;
					return pen1;
				}
				// least penetration is horizontal
				else
				{
					if( nx > 0 )
						pv[0] = -1;
					else
						pv[0] = 1;
					pv[1] = 0;
					return pen2;
				}
			}
			else
				return Math.min( pen1, pen2 );
		}
	};

	/** Collide two circles
	 * @function z2.collideCircleVsCircle
	 * @arg {Array} p1 Center of circle 1
	 * @arg {Number} r1 Radius of circle 1
	 * @arg {Array} p2 Center of circle 2
	 * @arg {Number} r2 Radius of circle 2
	 * @arg {Array} pv (optional, out) Vector (2 element array) for returning penetration direction
	 * @returns {Number} magnitude of penetration, or boolean false if no
	 * collision
	 */
	z2.collideCircleVsCircle = function( p1, r1, p2, r2, pv )
	{
		var dx = p2[0] - p1[0];
		var dy = p2[1] - p1[1];
		var dist = Math.sqrt( dx * dx + dy * dy );
		if( dist === 0 )
		{
			// same center, 
			// choose some consistant return value(s)
			if( pv )
			{
				pv[0] = 0;
				pv[1] = 1;
				return r1;
			}
		}
		var pen = r1 + r2 - dist;
		if( pen <= 0 )
			return false;
		if( pv )
		{
			pv[0] = dx;
			pv[1] = dy;
			z2.math.vecNormalize( pv );
		}
		return pen;
	};


	var bc = [];
	var b2c = [];
	var b2cn = [];

	/** const */
	var LEFT = 0, TOP = 1, RIGHT = 2, BOTTOM = 3;
	/** const */
	var X = 0, Y = 1;
	/** Collide an AABB and a circle
	 * @function z2.collideAabbVsCircle
	 * @arg {Array} p (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} c Center of circle 2
	 * @arg {Number} r Radius of circle 2
	 * @arg {Array} pv (optional, out) Vector (2 element array) for returning penetration direction
	 * @returns {Number} magnitude of penetration, or boolean false if no
	 * collision
	 */
	z2.collideAabbVsCircle = function( p, c, r, pv )
	{
		var dx, dy, dist, overlap;

		// is the center of the circle inside the AABB? 
		if( c[X] >= p[LEFT] && c[X] <= p[RIGHT] &&
			c[Y] >= p[TOP] && c[Y] <= p[BOTTOM] )
		{
			// TODO: penetration & vector
			// x distance center circle to center AABB
			dx = c[X] - (p[RIGHT] + p[LEFT])/2;
			dy = c[Y] - (p[BOTTOM] + p[TOP])/2;
			if( Math.abs(dx) > Math.abs(dy) )
			{
				if( dx < 0 )
				{
					pv[X] = -1;
					overlap = c[X] + r - p[LEFT];
				}
				else
				{
					pv[X] = 1;
					overlap = p[RIGHT] - c[X] - r;
				}
				pv[Y] = 0;
			}
			else
			{
				pv[X] = 0;
				if( dy < 0 )
				{
					pv[Y] = -1;
					overlap = c[Y] + r - p[TOP];
				}
				else
				{
					pv[Y] = 1;
					overlap = p[BOTTOM] - c[Y] - r;
				}
			}
			return overlap;
		}

		// test against the AABBs Voronoi regions
		// left
		if( c[X] < p[LEFT] )
		{
			// top left
			if( c[Y] < p[TOP] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[X] - p[LEFT];
				dy = c[Y] - p[TOP];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return false;
				// collision vector is from corner to circle's center
				if( pv )
				{
					pv[X] = dx;
					pv[Y] = dy;
				}
				return overlap;
			}
			// bottom left
			else if( c[Y] > p[BOTTOM] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[X] - p[LEFT];
				dy = c[Y] - p[BOTTOM];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return false;
				// collision vector is from corner to circle's center
				if( pv )
					{
						pv[X] = dx;
						pv[Y] = dy;
					}
					return overlap;
			}
			// left side
			else
			{
				var dl = p[LEFT] - c[X];
				overlap = r - dl;
				if( overlap <= 0 )
					return false;
				// collision vector is directly left
				if( pv )
				{
					pv[X] = -1;
					pv[Y] = 0;
				}
				return overlap;
			}
		}
		// right
		else if( c[X] > p[RIGHT] )
		{
			// top right
			if( c[Y] < p[TOP] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[X] - p[RIGHT];
				dy = c[Y] - p[TOP];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return false;
				// collision vector is from corner to circle's center
				if( pv )
				{
					pv[X] = dx;
					pv[Y] = dy;
				}
				return overlap;
			}
			else if( c[Y] > p[BOTTOM] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[X] - p[RIGHT];
				dy = c[Y] - p[BOTTOM];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return false;
				// collision vector is from corner to circle's center
				if( pv )
				{
					pv[X] = dx;
					pv[Y] = dy;
				}
				return overlap;
			}
			// right side
			else
			{
				var dr = c[X] - p[RIGHT];
				overlap = r - dr;
				if( overlap <= 0 )
					return false;
				// collision vector is directly right
				if( pv )
				{
					pv[X] = 1;
					pv[Y] = 0;
				}
				return overlap;
			}
		}
		// top
		else if( c[Y] < p[TOP] )
		{
			var dt = p[TOP] - c[Y];
			overlap = r - dt;
			if( overlap <= 0 )
				return false;
			// collision vector is directly up
			if( pv )
			{
				pv[X] = 0;
				pv[Y] = -1;
			}
			return overlap;
		}
		// bottom
		else if( c[Y] > p[BOTTOM] )
		{
			var db = c[Y] - p[BOTTOM];
			overlap = r - db;
			if( overlap <= 0 )
				return false;
			// collision vector is directly down
			if( pv )
			{
				pv[X] = 0;
				pv[Y] = 1;
			}
			return overlap;
		}

		// shouldn't get here...
		console.error( "something went wrong in AABBvsCircle collision - reached end of procedure without position detection..." );
		return false;
	};
//	z2.collideAabbVsCircle = function( p, c, r, pv )
//	{
//		// center of AABB
//		bc[0] = (p[2] + p[0]) / 2;
//		bc[1] = (p[3] + p[1]) / 2;
//
//		// get the vector for the AABB (box) center to the circle center
////		z2.math.vecSub( bc, c, b2c );
////		z2.math.vecSub( c, bc, b2c );
//		b2c[0] = c[0] - bc[0];
//		b2c[1] = c[1] - bc[1];
//		// normalized
//		b2cn[0] = b2c[0];
//		b2cn[1] = b2c[1];
////		z2.math.vecNormalize( b2cn );
//		var mag = Math.sqrt( b2cn[0] * b2cn[0] + b2cn[1] * b2cn[1] );
//		b2cn[0] /= mag;
//		b2cn[1] /= mag;
//
//		// find the closest corner
//		var max = Number.MIN_VALUE;
//		var x, y;
//		// upper left
//		vec[0] = p[0] - bc[0];
//		vec[1] = p[1] - bc[1];
//		var n = z2.math.vecDot( vec, b2cn );
//		if( n > max ) max = n;
//		// upper right
//		vec[0] = p[2] - bc[0];
//		vec[1] = p[1] - bc[1];
//		n = z2.math.vecDot( vec, b2cn );
//		if( n > max ) max = n;
//		// lower left
//		vec[0] = p[0] - bc[0];
//		vec[1] = p[3] - bc[1];
//		n = z2.math.vecDot( vec, b2cn );
//		if( n > max ) max = n;
//		// lower right
//		vec[0] = p[2] - bc[0];
//		vec[1] = p[3] - bc[1];
//		n = z2.math.vecDot( vec, b2cn );
//		if( n > max ) max = n;
//
//		// distance from center to center, minus the closest corner 'leg' and
//		// the circle's radius
//		var b2c_mag = z2.math.vecMag( b2c );
////		var dist = (max + r) - b2c_mag;
//		var dist = b2c_mag - max - r;
////		if( dist <= 0 && b2c_mag > 0 )
//		if( dist > 0 && b2c_mag > 0 )
//			return false;
//		else
//		{
//			if( pv )
//			{
//				// TODO: this is not correct
//				// to properly calculate this we need to know if the circle was
//				// in a voronoi region for a side or a corner of the aabb 
//				// - if for a side then pv is normal to that side, 
//				// if for a corner then pv is along the line from corner to
//				// center of the circle
//				pv[0] = b2cn[0];
//				pv[1] = b2cn[1];
//			}
//			return -dist;
//		}
//	};



	/////////////////////////////////////////////////////////////////////////
	// helper routines for testing:
	/////////////////////////////////////////////////////////////////////////

	// angle between two vectors
	function getAngle( a, b )
	{
		// cos(theta) = a.b / |a| |b|
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


