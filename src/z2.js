// z2.js
// Copyright 2013 Joshua C Shepard
// zed-squared html5 game components

var zSquared = function( opts )
{
	"use strict";

	var loaded = {};

	/** Main z2 namespace object
	 * @global
	 * @namespace
	 */
	var z2 = 
	{
		require : function( modules )
		{
			if( !(modules instanceof Array) )
				throw new Error( "Non-array type passed to require()" );
			for( var i = 0; i < modules.length; i++ )
			{
				// don't reload modules
				var m = loaded[modules[i]];
				if( !m )
				{
					m = zSquared[modules[i]] || modules[i];
					if( !(m instanceof Function) )
						throw new Error( "Non-function passed to require()" );
					m( z2 );
					loaded[modules[i]] = true;
				}
			}
		},

		/** Main game loop helper. Starts main loop with given fcn.
		 * @function z2.main
		 * @arg {Function} update Function to be called each frame. Takes a
		 * single parameter: the elapsed time since the loop was first started
		 * (the same param that requestAnimationFrame passes)
		 */
		main : function( update )
		{
			// start the main loop
			var f = function( et )
			{
				update( et );
				requestAnimationFrame( f );
			};
			requestAnimationFrame( f );
		}
	};

	// return the main (namespace) object
	return z2;

};
