// time.js
// Copyright 2013 Joshua C Shepard
// Time module for zed-squared
//
// TODO:
// - 

"use strict";

zSquared.time = function( z2 )
{
//	z2.require( [] );

	/** Time namespace object
	 * @namespace z2.time
	 */
	z2.time = 
	{
		/** Get the current system time
		 * @function z2.time#now
		 */
		now : function()
		{
			return Date.now();
		}
	};

};

