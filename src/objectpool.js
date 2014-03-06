// objectpool.js
// Copyright 2013 Joshua C Shepard
// Object Pool based on array
// TODO:
// -

zSquared.objectpool = function( z2 )
{
	"use strict";

//	z2.require( ["ecs", "2d", "time"] );

	/** Object Pool class
	 * @class z2#ObjectPool
	 * @constructor
	 * @arg {Function} constr The constructor fcn (no args!) used to create
	 * a new object
	 * @arg {Function} reset The method (no args!) used to reset an object to a
	 * @arg {Number} max_size The maximum size of the pool
	 * default state
	 */
	z2.ObjectPool = function ( constr, max_size )
	{
		// object pool array
		this.max = max_size || Number.MAX_VALUE;
		this.constr = constr;
//		this.reset = reset;

		this.numObjects = 0;
		this.free = [];
	};

	/** Get an Object from the pool
	 * @function z2#ObjectPool.get
	 * @returns {Object}
	 */
	z2.ObjectPool.prototype.get = function()
	{
		// if there are no more open slots, return null
		if( this.numObjects == this.max )
			return null;

		// if there are no open slots, allocate a new object
		if( this.free.length === 0 )
		{
			var o = new this.constr();
			this.numObjects++;
			return o;
		}
		// otherwise get the first open slot
		else
		{
			var o = this.free.pop();
			return o;
		}
	};

	/** Release an Object we acquired from the pool
	 * @function z2#ObjectPool.release
	 * @arg {Object} obj The object that we acquired via 'ObjectPool.get()'
	 */
	z2.ObjectPool.prototype.release = function( obj )
	{
		// reset the object to a default state
		if( obj.reset && typeof(obj.reset) == 'function' )
			obj.reset();
		// add it to the free list
		this.free.push( obj );
	};

};

