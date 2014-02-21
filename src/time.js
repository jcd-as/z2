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
		/** Get the current game time
		 * @function z2.time#now
		 */
		now : function()
		{
			return Date.now() - _totalPaused;
		},

		/** Get the current system time 
		 * (does NOT account for time spent paused)
		 * @function z2.time#system
		 */
		system : function()
		{
			return Date.now();
		},

		/** Pause - stop counting game time
		 * @function z2.time#pause
		 */
		pause : function()
		{
			_pauseStart = Date.now();
		},

		/** Resume - re-start counting game time
		 * @function z2.time#resume
		 */
		resume : function()
		{
			_totalPaused += Date.now() - _pauseStart;
		}
	};

};

