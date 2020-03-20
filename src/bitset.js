// bitset.js
// Copyright 2013 Joshua C Shepard
// rudimentary bit-set for zed-squared


/** @constant */
export const DEFAULT_BITSET_LENGTH = 2
/** @constant */
export const MAX_BITSET_BITS = (DEFAULT_BITSET_LENGTH * 32) - 1

/**
* @class Bitset
* @classdesc Rudimentary bit-set for zed-squared
*/
export class Bitset
{
	/**
	* @constructor
	*/
	constructor( num_dwords )
	{
		this.length = +num_dwords || 1
		if(this.length === 1)
			this.data = 0
		else
			this.data = new Uint32Array(this.length)
	}

	/** Reset to zero
	* @method Bitset#clear
	* @memberof Bitset
	*/
	clear()
	{
		if(this.length === 1)
			this.data = 0
		else {
			for(let i = 0; i < this.length; i++) {
				this.data[i] = 0
			}
		}
	}

	/**
	* @method Bitset#setBit
	* @memberof Bitset
	* @arg {Number} bit The bit to set (the 'nth' bit)
	*/
	setBit(bit)
	{
		if(this.length === 1 && bit <= 31)
			this.data |= (1 << bit)
		else {
			// find which dword this bit falls into
			const dw = ~~(bit / 32)
			if(dw > this.length) {
				console.error("Array argument to Bitset.setBit of incorrect length")
				return
			}
			// find which bit in the dword we're setting
			const n = bit - (dw * 32)
			// set the bit in the appropriate dword
			this.data[dw] |= (1 << n)
		}
	}

	/**
	* @method Bitset#setBits
	* @memberof Bitset
	* @arg {Uint32Array}|{Number} bits A typed array of 32 bit unsigned integers
	* or a single number containing the bits to set. If an array it must be the
	* same length as 'this.length'
	*/
	setBits(bits)
	{
		if(this.length === 1 && typeof(bits) === 'number')
			this.data |= bits
		else {
			if(!(bits instanceof Bitset)) {
				console.error("Non-number, non-Uint32Array passed to Bitset.setBits()")
				return
			}
			if(bits.length != this.length) {
				console.error("Array argument to Bitset.setBits of incorrect length")
				return
			}
			for(let i = 0; i < bits.length; i++) {
				this.data[i] |= bits.data[i]
			}
		}
	}

	/** See if any bits match
	* @method Bitset#matchAny
	* @arg {Bitset} bits The Bitset to match against
	*/
	matchAny(bits)
	{
		if(this.length === 1 && typeof(bits) === 'number')
			return !!(this.data & bits)
		// TODO: matchAny should match different length arrays
		else {
			if(!(bits instanceof Bitset)) {
				console.error("Non-number, non-Uint32Array passed to Bitset.setBits()")
				return false
			}
			if(bits.length != this.length) {
				console.error("Array argument to Bitset.setBits of incorrect length")
				return false
			}
			for(let i = 0; i < bits.length; i++) {
				var match = this.data[i] & bits.data[i]
				if(match)
					return true
			}
			return false
		}
	}

	/** See if all bits match
	* @method Bitset#matchAll
	* @arg {Bitset} bits The Bitset to match against
	*/
	matchAll(bits)
	{
		if(this.length === 1 && typeof(bits) === 'number')
			return !!(this.data & bits)
		else {
			if(!(bits instanceof Bitset))
				console.error("Non-number, non-Uint32Array passed to Bitset.setBits()")
			if(bits.length != this.length)
				console.error("Array argument to Bitset.setBits of incorrect length")
			for(let i = 0; i < bits.length; i++) {
				// (handle overflow by casting to 32 bit integer [OR'ing with 0]
				// before and after AND)
				const match = (0 | this.data[i]) & (0 | bits.data[i])
				if(match !== (0 | this.data[i]))
					return false
			}
			return true
		}
	}
}

