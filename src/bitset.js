// bitset.js
// Copyright 2013 Joshua C Shepard
// rudimentary bit-set for zed-squared

"use strict";

zSquared.bitset = function( z2 )
{
	/** @constant */
	z2.DEFAULT_BITSET_LENGTH = 2;
	/** @constant */
	z2.MAX_BITSET_BITS = (z2.DEFAULT_BITSET_LENGTH * 32) - 1;

	/** 
	 * @class z2#z2.Bitset
	 * @classdesc Rudimentary bit-set for zed-squared
	 *
	 * @constructor
	 */
	z2.Bitset = function( num_dwords )
	{
		this.length = +num_dwords || 1;
		if( this.length === 1 )
			this.data = 0;
		else
			this.data = new Uint32Array( this.length );
		this.key = this._generateKey();
	};
	/** Reset to zero
	 * @method z2.Bitset#clear
	 * @memberof z2.Bitset
	 */
	z2.Bitset.prototype.clear = function()
	{
		if( this.length === 1 )
			this.data = 0;
		else
		{
			for( var i = 0; i < this.length; i++ )
			{
				this.data[i] = 0;
			}
		}
	};

	/**
	 * @method z2.Bitset#setBit
	 * @memberof z2.Bitset
	 * @arg {Number} bit The bit to set (the 'nth' bit)
	 */
	z2.Bitset.prototype.setBit = function( bit )
	{
		if( this.length === 1 && bit <= 31 )
			this.data |= (1 << bit);
		else
		{
			// find which dword this bit falls into
			var dw = ~~(bit / 32);
			if( dw > this.length )
			{
				console.error( "Array argument to Bitset.setBit of incorrect length" );
				return;
			}
			// find which bit in the dword we're setting
			var n = bit - (dw * 32);
			// set the bit in the appropriate dword
			this.data[dw] |= (1 << n);
		}

		this.key = this._generateKey();
	};
	/**
	 * @method z2.Bitset#setBits
	 * @memberof z2.Bitset
	 * @arg {Uint32Array}|{Number} bits A typed array of 32 bit unsigned integers 
	 * or a single number containing the bits to set. If an array it must be the 
	 * same length as 'this.length'
	 */
	z2.Bitset.prototype.setBits = function( bits )
	{
		if( this.length === 1 && typeof( bits ) === 'number' )
			this.data |= bits;
		else
		{
			if( !(bits instanceof z2.Bitset) )
			{
				console.error( "Non-number, non-Uint32Array passed to Bitset.setBits()" );
				return;
			}
			if( bits.length != this.length )
			{
				console.error( "Array argument to Bitset.setBits of incorrect length" );
				return;
			}
			for( var i = 0; i < bits.length; i++ )
			{
				this.data[i] |= bits.data[i];
			}
		}

		this.key = this._generateKey();
	};
	/** See if any bits match
	 * @method z2.Bitset#matchAny
	 * @arg {z2.Bitset} bits The Bitset to match against
	 */
	z2.Bitset.prototype.matchAny = function( bits )
	{
		if( this.length === 1 && typeof( bits ) === 'number' )
			return !!(this.data & bits);
		// TODO: matchAny should match different length arrays
		else
		{
			if( !(bits instanceof z2.Bitset) )
			{
				console.error( "Non-number, non-Uint32Array passed to Bitset.setBits()" );
				return false;
			}
			if( bits.length != this.length )
			{
				console.error( "Array argument to Bitset.setBits of incorrect length" );
				return false;
			}
			for( var i = 0; i < bits.length; i++ )
			{
				var match = this.data[i] & bits.data[i];
				if( match )
					return true;
			}
			return false;
		}
	};
	/** See if all bits match
	 * @method z2.Bitset#matchAll
	 * @arg {z2.Bitset} bits The Bitset to match against
	 */
	z2.Bitset.prototype.matchAll = function( bits )
	{
		if( this.length === 1 && typeof( bits ) === 'number' )
			return !!(this.data & bits);
		else
		{
			if( !(bits instanceof z2.Bitset) )
				console.error( "Non-number, non-Uint32Array passed to Bitset.setBits()" );
			if( bits.length != this.length )
				console.error( "Array argument to Bitset.setBits of incorrect length" );
			for( var i = 0; i < bits.length; i++ )
			{
				var match = this.data[i] & bits.data[i];
				if( match !== this.data[i] )
					return false;
			}
			return true;
		}
	};

	z2.Bitset.prototype._generateKey = function()
	{
		// TODO: generate better keys
		if( this.length === 1 )
			return '' + this.data;
		else
		{
			var key = '';
			for( var i = this.length-1; i >= 0 ; i-- )
			{
				key += this.data[i];
				if( i > 0 )
					key += '-';
			}
			return key;
		}
	};
};


