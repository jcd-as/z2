// input.js
// Copyright 2013 Joshua C Shepard
// input module for zed-squared
//
// TODO:
// - use pixi.js for touch handling??
// x keyboard
// ? events on keypress ?
// ? track time keys are down
// - mouse
// x touchscreen basics
// x touchscreen 2d platformer controls (2-way, 2 buttons)
// - touchscreen 2d overhead controls (4-way, 2 buttons)
// - touchscreen 'joypad'
// - 'down' images for touchscreen buttons
// - 'gutter' between touchscreen buttons ?
// -

import zSquared from './z2.js'


/** Input (keyboard, touchscreen, mouse) module.
 * @module
 */

/////////////////////////////////////////////////////////////////////////
// keyboard functionality
/////////////////////////////////////////////////////////////////////////

/** Keyboard object.
 * @namespace
 */
export const kbd =
{
	// keys that we're interested in
	captured: {},
	// keys that are currently pressed
	pressed: {},
	// keys triggering key-up events this frame
	up: {},

	/** Start watching keyboard events.
	 * @function module:input.kbd.start
	 */
	start: function()
	{
		this._onKeyDown = e => {
			if(this.captured[e.keyCode]) {
				e.preventDefault()

				// TODO: track time that key has been pressed

				this.pressed[e.keyCode] = true
			}
		}

		this._onKeyUp = e => {
			if(this.captured[e.keyCode]) {
				e.preventDefault()

				// TODO: track time that key has been pressed

				this.pressed[e.keyCode] = false
				this.up[e.keyCode] = true
			}
		}

		document.body.addEventListener('keydown', this._onKeyDown, false)
		document.body.addEventListener('keyup', this._onKeyUp, false)
	},

	/** Stop watching keyboard events.
	 * @function module:input.kbd.stop
	 */
	stop: function()
	{
		document.body.removeEventListener('keydown', this._onKeyDown)
		document.body.removeEventListener('keyup', this._onKeyUp)
		this.captured = {}
		this.pressed = {}
		this.up = {}
	},

	/** Update the 'keyUp' status. In order for keyUp() to work, this needs
	* to be called in the game update loop, *after* input is read.
	* @function module:input.kbd.refresh
	*/
	refresh: function()
	{
		// clear the key-up list
		this.up = {}
	},

	/** Add a key to watch for.
	* @function module:input.kbd.addKey
	* @arg {number} keycode The keycode for the key to watch
	*/
	addKey: function( keycode )
	{
		this.captured[keycode] = true
	},

	/** Remove a watched key.
	* @function module:input.kbd.removeKey
	* @arg {number} keycode The keycode for the key to not watch
	*/
	removeKey: function( keycode )
	{
		delete this.captured[keycode]
	},

	/** Is a key currently down (pressed)?
	* @function module:input.kbd.isDown
	* @arg {number} keycode The keycode for the key to check
	*/
	isDown: function( keycode )
	{
		return this.pressed[keycode]
	},

	/** Did a key-up event happen this frame for this key?
	* @function module:input.kbd.keyUp
	* @arg {number} keycode The keycode for the key to check
	*/
	keyUp: function( keycode )
	{
		return this.up[keycode]
	},

	// keycodes:
	A: "A".charCodeAt(0),
	B: "B".charCodeAt(0),
	C: "C".charCodeAt(0),
	D: "D".charCodeAt(0),
	E: "E".charCodeAt(0),
	F: "F".charCodeAt(0),
	G: "G".charCodeAt(0),
	H: "H".charCodeAt(0),
	I: "I".charCodeAt(0),
	J: "J".charCodeAt(0),
	K: "K".charCodeAt(0),
	L: "L".charCodeAt(0),
	M: "M".charCodeAt(0),
	N: "N".charCodeAt(0),
	O: "O".charCodeAt(0),
	P: "P".charCodeAt(0),
	Q: "Q".charCodeAt(0),
	R: "R".charCodeAt(0),
	S: "S".charCodeAt(0),
	T: "T".charCodeAt(0),
	U: "U".charCodeAt(0),
	V: "V".charCodeAt(0),
	W: "W".charCodeAt(0),
	X: "X".charCodeAt(0),
	Y: "Y".charCodeAt(0),
	Z: "Z".charCodeAt(0),
	ZERO: "0".charCodeAt(0),
	ONE: "1".charCodeAt(0),
	TWO: "2".charCodeAt(0),
	THREE: "3".charCodeAt(0),
	FOUR: "4".charCodeAt(0),
	FIVE: "5".charCodeAt(0),
	SIX: "6".charCodeAt(0),
	SEVEN: "7".charCodeAt(0),
	EIGHT: "8".charCodeAt(0),
	NINE: "9".charCodeAt(0),
	NUMPAD_0: 96,
	NUMPAD_1: 97,
	NUMPAD_2: 98,
	NUMPAD_3: 99,
	NUMPAD_4: 100,
	NUMPAD_5: 101,
	NUMPAD_6: 102,
	NUMPAD_7: 103,
	NUMPAD_8: 104,
	NUMPAD_9: 105,
	NUMPAD_MULTIPLY: 106,
	NUMPAD_ADD: 107,
	NUMPAD_ENTER: 108,
	NUMPAD_SUBTRACT: 109,
	NUMPAD_DECIMAL: 110,
	NUMPAD_DIVIDE: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	F13: 124,
	F14: 125,
	F15: 126,
	COLON: 186,
	EQUALS: 187,
	UNDERSCORE: 189,
	QUESTION_MARK: 191,
	TILDE: 192,
	OPEN_BRACKET: 219,
	BACKWARD_SLASH: 220,
	CLOSED_BRACKET: 221,
	QUOTES: 222,
	BACKSPACE: 8,
	TAB: 9,
	CLEAR: 12,
	ENTER: 13,
	SHIFT: 16,
	CONTROL: 17,
	ALT: 18,
	CAPS_LOCK: 20,
	ESC: 27,
	SPACEBAR: 32,
	PAGE_UP: 33,
	PAGE_DOWN: 34,
	END: 35,
	HOME: 36,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	INSERT: 45,
	DELETE: 46,
	HELP: 47,
	NUM_LOCK: 144
}


/////////////////////////////////////////////////////////////////////////
// touchscreen functionality
/////////////////////////////////////////////////////////////////////////

const hasTouch = !!('ontouchstart' in window)

/** Touchscreen controls object.
 * @namespace
 */
export const touch =
{
	// pixi objects for buttons
	numButtons : 0,
	buttons : [],
	buttonDim : 0,

	buttonsPressed : [],

	/** Start the touchscreen controls.
	 * @function module:input.touch.start
	 * @arg {number} num_buttons Number of on-screen buttons to support.
	 */
	start : function(num_buttons)
	{
		if(!hasTouch) return
		// TODO: dimension handling doesn't work well for small numbers of buttons (1-2)
		this.numbuttons = num_buttons
		this.buttonDim = zSquared.game.view.width / num_buttons

		// our own touch event handling
		this._touchHandler = e => {
			let i
			const touches = e.touches ? e.touches : [e]

			if(!touches)
				return

			// get x & y offsets of our canvas
			// TODO: offsetY isn't used...
			// eslint-disable-next-line no-unused-vars
			let offsetX, offsetY
			if(touches.length > 0) {
				offsetX = touches[0].offsetX
				offsetY = touches[0].offsetY
				if(offsetX === undefined) {
					let tox = 0
					let toy = 0
					let curElem = zSquared.game.app.view
					do {
						tox += curElem.offsetLeft
						toy += curElem.offsetTop
					}
					while((curElem = curElem.offsetParent))
					offsetX = tox
					offsetY = toy
				}
			}

			// clear all buttons
			for(i = 0; i < this.buttonsPressed.length; i++) {
				this.buttonsPressed[i] = false
			}

			// TODO: track button up 'events' too
			// (track 'wasDown' array)

			// set all buttons
			for(i = 0; i < touches.length; i++) {
				const touch = touches[i]
				const button = this._getButton( touch, offsetX )
				if(button !== -1)
					this.buttonsPressed[button] = true
			}

			// prevent default
			e.preventDefault()
		}
		this._getButton = (touch, offsetX) => {
			// was this touch inside one of our buttons?
			for(let i = 0; i < this.buttons.length; i++) {
				let d = 1
				const cssws = zSquared.game.app.view.style.width
				// strip the 'px;' off of the css width & convert to number
				if(cssws) {
					const cssw = +cssws.slice(0,-2)
					d = zSquared.game.app.view.width / cssw
				}
				const px = (touch.pageX - offsetX) * d
				if(px < (i+1) * this.buttonDim)
					return i
			}
			return -1
		}

		// add event listeners
		zSquared.game.app.view.addEventListener('touchstart', this._touchHandler, false)
		zSquared.game.app.view.addEventListener('touchend', this._touchHandler, false)
		zSquared.game.app.view.addEventListener('touchmove', this._touchHandler, false)
		zSquared.game.app.view.addEventListener('touchcancel', this._touchHandler, false)
	},

	/** Add a button.
	 * @function module:input.touch.addButton
	 * @arg {Image} image Image object (as returned by loader.loadImage())
	 */
	addButton : function(image)
	{
		if(!hasTouch) return

		// if we're not passed an image, make an 'empty' button
		if(!image) {
			this.buttons.push(null)
			this.buttonsPressed.push(false)
			return
		}

		const idx = this.buttons.length

		// eslint-disable-next-line no-undef
		const basetexture = new PIXI.BaseTexture(image)
		// eslint-disable-next-line no-undef
		const texture = new PIXI.Texture(basetexture)
		// eslint-disable-next-line no-undef
		const button = new PIXI.Sprite(texture)

		button.position.x = idx * this.buttonDim
		button.position.y = zSquared.game.view.height - this.buttonDim
		button.width = this.buttonDim
		button.height = this.buttonDim

		button.alpha = 0.4

		// add it to the view
		zSquared.game.view.add(button, true)

		this.buttons.push(button)
		this.buttonsPressed.push(false)
	},

	/** Is a specific button currently pressed?
	 * @function module:input.touch.isButtonDown
	 * @arg {number} index Numeric index of the button to check
	 */
	isButtonDown : function(index)
	{
		if(!hasTouch) return false
		return !!this.buttonsPressed[index]
	},

	/** Hide the buttons from view.
	 * @function module:input.touch.hideButtons
	 */
	hideButtons : function()
	{
		if(!hasTouch) return

		for(let i = 0; i < this.buttons.length; i++) {
			this.buttons[i].visible = false
		}
	},

	/** Show the buttons.
	 * @function module:input.touch.showButtons
	 */
	showButtons : function()
	{
		if(!hasTouch) return

		for(let i = 0; i < this.buttons.length; i++) {
			this.buttons[i].visible = true
		}
	},

	/** Stop using the touchscreen.
	 * @function module:input.touch.stop
	 */
	stop : function()
	{
		if(!hasTouch) return

		// remove event listeners
		zSquared.game.app.view.removeEventListener('touchstart', this._touchHandler)
		zSquared.game.app.view.removeEventListener('touchend', this._touchHandler)
		zSquared.game.app.view.removeEventListener('touchmove', this._touchHandler)
		zSquared.game.app.view.removeEventListener('touchcancel', this._touchHandler)

		// remove all the Pixi items
		for(let i = 0; i < this.buttons.length; i++)
			if(this.buttons[i])
				zSquared.game.view.remove(this.buttons[i], true)

		// reset fields
		this.buttons = []
		this.buttonsPressed = []
		this.numButtons = 0
		this.buttonDim = 0
	},
}

