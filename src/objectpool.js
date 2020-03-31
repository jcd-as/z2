// objectpool.js
// Copyright 2013 Joshua C Shepard
// Object Pool based on array
// TODO:
// -

/** Small object pool memory management module.
 * @module
 */


/** Object pool class. */
class ObjectPool
{
	/**
	* @constructor
	* @arg {Function} constr The constructor fcn (no args!) used to create
	* a new object
	* @arg {Function} reset The method (no args!) used to reset an object to a
	* @arg {Number} max_size The maximum size of the pool
	* default state
	*/
	constructor(constr, max_size)
	{
		// object pool array
		this.max = max_size || Number.MAX_VALUE
		this.constr = constr

		this.numObjects = 0
		this.free = []
	}

	/** Get an Object from the pool.
	* @returns {Object}
	*/
	get()
	{
		// if there are no more open slots, return null
		if( this.numObjects == this.max )
			return null

		// if there are no open slots, allocate a new object
		if( this.free.length === 0 )
		{
			const o = new this.constr()
			this.numObjects++
			return o
		}
		// otherwise get the first open slot
		else
		{
			const o = this.free.pop()
			return o
		}
	}

	/** Release an Object we acquired from the pool.
	* @arg {Object} obj The object that we acquired via 'ObjectPool.get()'
	*/
	release(obj)
	{
		// reset the object to a default state
		if( obj.reset && typeof(obj.reset) == 'function' )
			obj.reset()
		// add it to the free list
		this.free.push( obj )
	}
}
export default ObjectPool

