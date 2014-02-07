// collision.js
// Copyright 2013 Joshua C Shepard
// Collision detection for zed-squared
//
// TODO:
// - AABB vs AA right triangles 
// - (optimized) routines to just detect intersection, not resolve collision
// - convert all collision routines to return boolean and use out param for
// separation vector (not just direction normal)
// - 

zSquared.collision = function( z2 )
{
	"use strict";

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

	// get the min & max of AABB projected onto vec
	// (return min & max in 2-element array out)
	var temp = [0, 0, 0, 0, 0, 0, 0, 0];
	function projectAabbMinMax( aabb, vec, out )
	{
		// top left
		temp[0] = aabb[0];
		temp[1] = aabb[1];
		// top right
		temp[2] = aabb[2];
		temp[3] = aabb[1];
		// bottom right
		temp[4] = aabb[2];
		temp[5] = aabb[3];
		// bottom left
		temp[6] = aabb[0];
		temp[7] = aabb[3];

		var min, max, cur;
		min = max = z2.math.vecDot( [temp[0], temp[1]], vec );
		for( var i = 2; i < temp.length; i += 2 )
		{
			cur = z2.math.vecDot( [temp[i], temp[i+1]], vec );
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
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration direction vector (normal)
	 * @returns {Number} magnitude of penetration, or 0 if no collision
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
				return 0;
			else if( p2minmax[1] < p1minmax[0] )
				return 0;
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
			if( j === p2.length )
				j = 0;
			// get the normal
			getNormal( [p2[i], p2[i+1]], [p2[j], p2[j+1]], vec );

			// project the min/max pts onto the normal/axis, poly1
			projectMinMax( p1, vec, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p2, vec, p2minmax );

			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
			if( p1minmax[1] < p2minmax[0] )
				return 0;
			else if( p2minmax[1] < p1minmax[0] )
				return 0;
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
			pv[0] = pv1x;
			pv[1] = pv1y;
			return pen1;
		}
		else
		{
			pv[0] = pv2x;
			pv[1] = pv2y;
			return pen2;
		}
	};

	/** Collide two Axis-Aligned Bounding Boxes
	 * @function z2.collideAabbVsAabb
	 * @arg {Array} p1 (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} p2 (flat) Array of values for aabb 2: top, left, bottom, right
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration vector (direction and magnitude)
	 * @returns {boolean} true if collision, or false if no collision
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

			// penetration direction
			var nx = (p2[1] + p2[3]) - (p1[1] + p1[3]);
			var ny = (p2[0] + p2[2]) - (p1[0] + p1[2]);

			// least penetration is vertical
			if( pen1 > pen2 )
			{
				pv[0] = 0;
				if( ny > 0 )
					pv[1] = -pen2;
				else
					pv[1] = pen2;
				return true;
			}
			// least penetration is horizontal
			else
			{
				if( nx > 0 )
					pv[0] = -pen1;
				else
					pv[0] = pen1;
				pv[1] = 0;
				return true;
			}
		}
	};

	/** Collide AABB vs a polygon
	 * @function z2.collideAabbVsPoly
	 * @arg {Array} b (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} p (flat) Array of vertices defining polygon 2
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration direction vector (normal)
	 * @returns {Number} magnitude of penetration, or 0 if no collision
	 */
	z2.collideAabbVsPoly = function( b, p, pv )
	{
		var i, j;

		var pen1 = Number.MAX_VALUE, pen2 = Number.MAX_VALUE;
		var temp1, temp2, temp3;
		var pv1x, pv1y, pv2x, pv2y;

		// for top and left sides, AABB
		// (since we know that sides are parallel we don't need to calc 
		// for both sides)
		for( i = 0; i < 2; i++ )
		{
			// top / vertical axis
			if( i === 0 )
			{
				vec[0] = 1;
				vec[1] = 0;

				// project the min/max pts onto the normal/axis, AABB
				if( b[0] > b[2] )
				{
					p1minmax[0] = b[2];
					p1minmax[1] = b[0];
				}
				else
				{
					p1minmax[0] = b[0];
					p1minmax[1] = b[2];
				}
			}
			// left / horizontal axis
			else
			{
				vec[0] = 0;
				vec[1] = 1;
				// project the min/max pts onto the normal/axis, AABB
				if( b[1] > b[3] )
				{
					p1minmax[0] = b[3];
					p1minmax[1] = b[1];
				}
				else
				{
					p1minmax[0] = b[1];
					p1minmax[1] = b[3];
				}
			}

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p, vec, p2minmax );

			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
			if( p1minmax[1] < p2minmax[0] )
				return 0;
			else if( p2minmax[1] < p1minmax[0] )
				return 0;
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
		for( i = 0; i < p.length; i +=2 )
		{
			j = i+2;
			if( j === p.length )
				j = 0;
			// get the normal
			getNormal( [p[i], p[i+1]], [p[j], p[j+1]], vec );

			// project the min/max pts onto the normal/axis, AABB
			projectAabbMinMax( b, vec, p1minmax );

			// project the min/max pts onto the normal/axis, poly2
			projectMinMax( p, vec, p2minmax );

			// penetration is poly1.max < poly2.min || poly2.max < poly1.min
			if( p1minmax[1] < p2minmax[0] )
				return 0;
			else if( p2minmax[1] < p1minmax[0] )
				return 0;
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
			pv[0] = pv1x;
			pv[1] = pv1y;
			return pen1;
		}
		else
		{
			pv[0] = pv2x;
			pv[1] = pv2y;
			return pen2;
		}
	};

	/** Collide two circles
	 * @function z2.collideCircleVsCircle
	 * @arg {Array} p1 Center of circle 1
	 * @arg {Number} r1 Radius of circle 1
	 * @arg {Array} p2 Center of circle 2
	 * @arg {Number} r2 Radius of circle 2
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration direction (normal)
	 * @returns {Number} magnitude of penetration, or 0 if no collision
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
			pv[0] = 0;
			pv[1] = 1;
			return r1;
		}
		var pen = r1 + r2 - dist;
		if( pen <= 0 )
			return 0;
		pv[0] = dx / dist;
		pv[1] = dy / dist;
		return pen;
	};

	/** Collide an AABB and a circle
	 * @function z2.collideAabbVsCircle
	 * @arg {Array} p (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} c Center of circle 2
	 * @arg {Number} r Radius of circle 2
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration direction
	 * @returns {Number} magnitude of penetration, or 0 if no collision
	 */
	z2.collideAabbVsCircle = function( p, c, r, pv )
	{
		// LEFT = 0, TOP = 1, RIGHT = 2, BOTTOM = 3
		// X = 0, Y = 1

		var dx, dy, dist, overlap;

		// test against the AABBs Voronoi regions
		// left
		if( c[0] < p[0] )
		{
			// top left
			if( c[1] < p[1] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[0] - p[0];
				dy = c[1] - p[1];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return 0;
				// collision vector is from corner to circle's center
				dx /= dist;
				dy /= dist;
			}
			// bottom left
			else if( c[1] > p[3] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[0] - p[0];
				dy = c[1] - p[3];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return 0;
				// collision vector is from corner to circle's center
				dx /= dist;
				dy /= dist;
			}
			// left side
			else
			{
				var dl = p[0] - c[0];
				overlap = r - dl;
				if( overlap <= 0 )
					return 0;
				// collision vector is directly left
				dx = -1;
				dy = 0;
			}
		}
		// right
		else if( c[0] > p[2] )
		{
			// top right
			if( c[1] < p[1] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[0] - p[2];
				dy = c[1] - p[1];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return 0;
				// collision vector is from corner to circle's center
				dx /= dist;
				dy /= dist;
			}
			else if( c[1] > p[3] )
			{
				// collision if distance from center of circle to corner is less
				// than the circle's radius
				dx = c[0] - p[2];
				dy = c[1] - p[3];
				dist = Math.sqrt( dx * dx + dy * dy );
				overlap = r - dist;
				if( overlap <= 0 )
					return 0;
				// collision vector is from corner to circle's center
				dx /= dist;
				dy /= dist;
			}
			// right side
			else
			{
				var dr = c[0] - p[2];
				overlap = r - dr;
				if( overlap <= 0 )
					return 0;
				// collision vector is directly right
				dx = 1;
				dy = 0;
			}
		}
		// top
		else if( c[1] < p[1] )
		{
			var dt = p[1] - c[1];
			overlap = r - dt;
			if( overlap <= 0 )
				return 0;
			// collision vector is directly up
			dx = 0;
			dy = -1;
		}
		// bottom
		else if( c[1] > p[3] )
		{
			var db = c[1] - p[3];
			overlap = r - db;
			if( overlap <= 0 )
				return 0;
			// collision vector is directly down
			dx = 0;
			dy = 1;
		}
		// otherwise the center of the circle is inside the AABB
		else
		{
			// x distance center circle to center AABB
			dx = c[0] - (p[2] + p[0])/2;
			// y distance center circle to center AABB
			dy = c[1] - (p[3] + p[1])/2;
			if( Math.abs(dx) > Math.abs(dy) )
			{
				dy = 0;
				if( dx < 0 )
				{
					dx = -1;
					overlap = c[0] + r - p[0];
				}
				else
				{
					dx = 1;
					overlap = p[2] - (c[0] - r);
				}
			}
			else
			{
				dx = 0;
				if( dy < 0 )
				{
					dy = -1;
					overlap = c[1] + r - p[1];
				}
				else
				{
					dy = 1;
					overlap = p[3] - (c[1] - r);
				}
			}
		}

		pv[0] = dx;
		pv[1] = dy;
		return overlap;
	};


	/////////////////////////////////////////////////////////////////////////
	// tile map collision routines
	/////////////////////////////////////////////////////////////////////////

	/** Build a collision map for a given layer & 'solid' tiles array
	 * @function z2.buildCollisionMap
	 * @arg {Array} l TileLayer data (array of tile indices)
	 * @arg {Number} w width of data array
	 * @arg {Number} h width of data array
	 * @arg {Array} solid Array of indices of the tiles that are considered for
	 * collision ('solid' tiles)
	 * @returns {Array} collision map - an array of objects, one for each tile,
	 * null for tiles that cannot be collided against ("non-solid"), 
	 * { left: n, right: n, top: n, bottom: n } for solid tiles (n is 1 for
	 * solid, 0 for non-solid and -1 for 'interesting' [which is not-yet-impl])
	 *
	 */
	z2.buildCollisionMap = function( l, w, h, solid )
	{
		var i, j, k, t;

		// create a collision map var
		var map = new Array( w * h );

		// iterate over each tile in the layer
		for( i = 0; i < h; i++ )
		{
			for( j = 0; j < w; j++ )
			{
				// if it is solid, mark all edges solid
				k = i * w + j;
				t = l[k];
				// in Tiled, tile indices of 0 indicate 'empty tile'
				if( t !== 0 )
				{
					// true index is one less than stored in the Tiled file
					t--;
					if( solid.indexOf( t ) !== -1 )
						map[k] = {left:1, right:1, top:1, bottom:1};
					else
						map[k] = null;
				}
			}
		}

		// walk the _edges_ (instead of the tiles),
		// checking the tile on either side of the edge

		var left, right, top, bottom;
		// walk the vertical edges (left & right)
		for( i = 0; i < h; i++ )
		{
			for( j = 1; j < w; j++ )
			{
				k = i * w + j;
				left = map[k-1];
				right = map[k];
				if( left && right )
				{
					if( left.right && right.left )
					{
						left.right = 0;
						right.left = 0;
					}
				}
			}
		}
		// walk the horizontal edges (top & bottom)
		for( i = 1; i < h; i++ )
		{
			for( j = 0; j < w; j++ )
			{
				k = i * w + j;
				top = map[k-w];
				bottom = map[k];
				if( top && bottom )
				{
					if( top.bottom && bottom.top )
					{
						top.bottom = 0;
						bottom.top = 0;
					}
				}
			}
		}

		return map;
	};

	/** Collide an Axis-Aligned Bounding Box and a Tile
	 * @function z2.collideAabbVsTile
	 * @arg {Array} box (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} tile (flat) Array of values for tile: top, left, bottom, right
	 * @arg {Object} td Object containing the tile data for this tile (e.g.
	 * {left:n, right:n, top:n, bottom:n} )
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration (direction and magnitude)
	 * @returns {boolean} true if collision / penetration, false if none
	 */
	z2.collideAabbVsTile = function( box, tile, td, pv )
	{
		// overlap values
		var t, l, b, r;

		// left, right, top & bottom overlaps
		l = box[3] - tile[1];
		r = tile[3] - box[1];
		t = box[2] - tile[0];
		b = tile[2] - box[0];

		// no overlap?
		if( t < 0 || l < 0 || b < 0 || r < 0 )
			return 0;

		// don't allow overlap greater than the tile size
		var tw = tile[3] - tile[1];
		var th = tile[2] - tile[0];
		if( t > th ) t = 0;
		if( l > tw ) l = 0;
		if( b > th ) b = 0;
		if( r > tw ) r = 0;

		// only check against the sides of the tile that are marked for
		// collision
		if( !td.top )
			t = 0;
		if( !td.left )
			l = 0;
		if( !td.bottom )
			b = 0;
		if( !td.right )
			r = 0;

		// if there is any overlap, select the least overlap
		if( t || l || b || r )
		{
			var set = [];
			if( t ) set.push( t );
			if( l ) set.push( l );
			if( b ) set.push( b );
			if( r ) set.push( r );

			var p = Math.min.apply( null, set );
			if( p === t )
			{
				pv[0] = 0;
				pv[1] = -p;
			}
			else if( p === l )
			{
				pv[0] = -p;
				pv[1] = 0;
			}
			else if( p === b )
			{
				pv[0] = 0;
				pv[1] = p;
			}
			else if( p === r )
			{
				pv[0] = p;
				pv[1] = 0;
			}
			return true;
		}
		else
			return false;
	};

	/** Collide an AABB against a collision map
	 * @function z2.collideAabbVsCollisionMap
	 * @arg {Array} b (flat) Array of values for aabb 1: top, left, bottom, right
	 * @arg {Array} map collision map (Array of objects)
	 * @arg {Number} w width of collision map array
	 * @arg {Number} h height of collision map array
	 * @arg {Number} tw width of tiles (in pixels)
	 * @arg {Number} th height of tiles (in pixels)
	 * solid, 0 for non-solid and -1 for 'interesting' [which is not-yet-impl])
	 * @arg {Array} pv (out) Vector (2 element array) for returning penetration (direction and magnitude)
	 * @returns {boolean} true if collision, false if none
	 */
	var _v = new Float64Array( 2 );
	z2.collideAabbVsCollisionMap = function( b, map, w, h, tw, th, pv )
	{
		// get the coordinates of the AABB, 
		// rounded to the tile boundary and restricted to inside the map

		// top, rounds down, disallow negative values
		var btt = Math.floor( b[0] / th );
		if( btt < 0 ) btt = 0;
		// left, rounds down, disallow negative values
		var btl = Math.floor( b[1] / tw );
		if( btl < 0 ) btl = 0;
		// bottom, rounds up, disallow negative values
		var btb = Math.ceil( b[2] / th );
		if( btb > h ) btb = w;
		// right, rounds up, disallow negative values
		var btr = Math.ceil( b[3] / tw );
		if( btr > w ) btr = w;

		// possible collisions are with tiles from btl to btr and btt to btb
		// collide with each tile & find maximum penetration in each axis
		var m = 0, t;
		pv[0] = 0;
		pv[1] = 0;
		var collision = false;
		var row = btt * w;
		var top, left, right, bottom;
		var first_left = btl * tw;
		top = btt * th;
		bottom = top + th;
		for( var i = btt; i < btb; i++ )
		{
			left = first_left;
			right = left + tw;
			for( var j = btl; j < btr; j++ )
			{
				t = map[row + j];
				// ignore null tiles - can't collide with them
				if( t )
				{
					var tile_bounds = [ top, left, bottom, right ];
					// collide vs tile
					if( z2.collideAabbVsTile( b, tile_bounds, t, _v ) )
					{
						collision = true;
						// combine the penetration
						if( _v[0] && Math.abs(_v[0]) > Math.abs(pv[0]) )
							pv[0] = _v[0];
						if( _v[1] && Math.abs(_v[1]) > Math.abs(pv[1]) )
							pv[1] = _v[1];
					}
				}
				left += tw;
				right += tw;
			}
			row += w;
			top += th;
			bottom += th;
		}
		return collision;
	};



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


