// time.js
// Copyright 2013 Joshua C Shepard
// Time module for zed-squared
//
// TODO:
// -


// the total time the game has been on pause
let _totalPaused = 0
let _pauseStart = 0

/** Time namespace object
 * @namespace time
 */
export default
{
	/** Get the current game time
	* @function time#now
	*/
	now : function()
	{
		return Date.now() - _totalPaused
	},

	/** Get the current system time
	* (does NOT account for time spent paused)
	* @function time#system
	*/
	system : function()
	{
		return Date.now()
	},

	/** Pause - stop counting game time
	* @function time#pause
	*/
	pause : function()
	{
		_pauseStart = Date.now()
	},

	/** Resume - re-start counting game time
	* @function time#resume
	*/
	resume : function()
	{
		_totalPaused += Date.now() - _pauseStart
	}
}

