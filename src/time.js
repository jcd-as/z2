// time.js
// Copyright 2013 Joshua C Shepard
// Time module for zed-squared
//
// TODO:
// - 

zSquared.time = function( z2 )
{
	"use strict";

//	z2.require( [] );

	// the total time the game has been on pause
	var _totalPaused = 0;
	var _pauseStart = 0;

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
			return Date.now() - _totalPaused;
		},

		pause : function()
		{
			_pauseStart = Date.now();
		},

		resume : function()
		{
			_totalPaused += Date.now() - _pauseStart;
		}
	};

};

