// time.js
// Copyright 2013 Joshua C Shepard
// Time module for zed-squared
//
// TODO:
// -

/** Time module.
 * @module
 */


// the total time the game has been on pause
let _totalPaused = 0
let _pauseStart = 0

export default
{
	/** Get the current game time. */
	now : function()
	{
		return Date.now() - _totalPaused
	},

	/** Get the current system time.
	* (Does NOT account for time spent paused)
	*/
	system : function()
	{
		return Date.now()
	},

	/** Pause - stop counting game time. */
	pause : function()
	{
		_pauseStart = Date.now()
	},

	/** Resume - re-start counting game time. */
	resume : function()
	{
		_totalPaused += Date.now() - _pauseStart
	}
}

