// z2.js
// Copyright 2013 Joshua C Shepard
// zed-squared html5 game components
// TODO:
// -

/** zSquared 'globals' module.
 * @module
 */


let raf = null


/** Main zSquared class */
class zSquared
{
	/** Main game loop helper. Starts main loop with a given function.
	* @arg {Function} update Function to be called each frame. Takes a
	* single parameter: the elapsed time since the loop was first started
	* (the same param that requestAnimationFrame passes)
	*/
	static startMain(update)
	{
		const requestAnimationFrame = window.requestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.msRequestAnimationFrame

		// start the main loop
		const f = et => {
			update( et )
			raf = requestAnimationFrame(f)
		}
		raf = requestAnimationFrame(f)
	}

	/** Stop the main loop. */
	static stopMain()
	{
		const cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame
		cancelAnimationFrame( raf )
	}

	/** Create an HTML canvas object.
	* @arg {Number} w Canvas width, in pixels
	* @arg {Number} h Canvas height, in pixels
	* @arg {boolean} [add_to_doc] Should this canvas be added to the * document?
	* @arg {DOMElement} [parent] Parent element in DOM
	* @returns {Canvas} The Canvas object
	*/
	static createCanvas(w, h, parent, add_to_doc)
	{
		let canvas = document.createElement('canvas')
		canvas.width = w
		canvas.height = h
		if(add_to_doc) {
			if(parent)
				parent.appendChild(canvas)
			else
				document.body.appendChild(canvas)
		}
		return canvas
	}

	/** Wrap text at 'width' columns.
	* @arg {string} text Text to wrap
	* @arg {number} width Column at which to wrap text
	* @returns {string} Wrapped text (input with newlines added)
	*/
	static wrapText(text, width)
	{
		width = width || 75
		const regex = '.{1,' + width + '}(\\s|$)' + '|\\S+?(\\s|$)'
		return text.match(RegExp(regex, 'g')).join('\n')
	}

	/** Generate a random number within bounds.
	* @arg {number} min minimum value to generate
	* @arg {number} max maximum value to generate
	* @arg {Function} mod Function to be applied to result prior to * returning (e.g. pass 'Math.round' to get a number rounded to an
	* integer value)
	* @returns {number} random number in [min,max] range
	*/
	static random(min, max, round)
	{
		let val
		if(min === max)
			val = min
		else
			val = (Math.random() * (max - min)) + min
		if(round)
			return round((Math.random() * (max - min)) + min)
		else
			return val
	}

	/** Find an item in an array by 'name' property.
	* @arg {array} array Array in which to find object
	* @arg {string} name
	* @returns item with given name
	*/
	static findByName(array, name)
	{
		return array.find(i => i.name === name)
	}

	/** Toggle fullscreen mode, when available. */
	static toggleFullScreen()
	{
		const doc = window.document
		const de = doc.documentElement

		const requestFullScreen = de.requestFullScreen ||
			de.mozRequestFullScreen ||
			de.webkitRequestFullScreen ||
			de.msRequestFullscreen
		const cancelFullScreen = doc.exitFullScreen ||
			doc.mozCancelFullScreen ||
			doc.webkitExitFullscreen ||
			doc.msExitFullscreen

		if(!doc.fullscreenElement && !doc.mozFullScreenElement	&&
			!doc.webkitFullscreenElement && !doc.msFullscreenElement)
			requestFullScreen.call(de)
		else
			cancelFullScreen.call(doc)
	}

	/** Save state to local storage.
	* @arg {string} file
	* @arg {string} state
	*/
	static saveState(file, state)
	{
		window.localStorage.setItem(file, JSON.stringify(state))
	}

	/** Load state from local storage.
	* @arg {string} file
	* @returns {Object}
	*/
	static loadState(file)
	{
		const state = window.localStorage.getItem(file)
		if(state)
			return JSON.parse(state)
		else
			return null
	}
}

export default zSquared

