// view.js
// Copyright 2013 Joshua C Shepard
// Canvas view class/module for zed-squared
//
// TODO:
// - fcn to set custom follow-mode parameters
// -


/**
* @class View
* @classdesc View class. Represents a view into a Scene
*/
export default class View
{
	static FOLLOW_MODE_NONE = 'follow-mode-none'
	static FOLLOW_MODE_TIGHT = 'follow-mode-tight'
	static FOLLOW_MODE_PLATFORMER = 'follow-mode-platformer'
	static FOLLOW_MODE_OVERHEAD_SCROLLER = 'follow-mode-overhead-scroller'

	scene = null
	width = 0
	height = 0
	_target = null

	doc = undefined
	// camera space
	camera_doc = undefined

	// follow-mode data
	tbuf = 0
	bbuf = 0
	lbuf = 0
	rbuf = 0
	toffs = 0
	boffs = 0
	loffs = 0
	roffs = 0
	follow_mode = undefined

	/**
	* @property {string} follow_mode The angle of rotation of the view (in
	* @property {number} rotation The angle of rotation of the view (in
	* radians). (Note that the View is, like a camera, 'looking at' the scene,
	* so if you rotate the view clockwise, the displayed scene will appear to
	* rotate CCW, and vice-versa)
	* @property {number} sx The scale factor for the view in the X dimension
	* @property {number} sy The scale factor for the view in the Y dimension
	* @property {number} x The X coordinate of the center of the View
	* @property {number} y The Y coordinate of the center of the View
	* @constructor
	* @arg {Object} game Instance of the Game class
	* @arg {number} width The width of the View, in pixels
	* @arg {number} height The height of the View, in pixels
	* @arg {Object} target The target object to follow. (Must support x and y
	* coordinates)
	* @arg {string} [follow_mode] The 'follow mode' to use
	* @arg {number} [x] Initial x coordinate of the (center of the) View
	* @arg {number} [y] Initial y coordinate of the (center of the) View
	*/
	constructor(game, width, height, target, follow_mode, x, y)
	{
		this.game = game
		this.width = width
		this.height = height
		if( target )
			this.target = target

		// PIXI display object container for camera / view space
		// eslint-disable-next-line no-undef
		this.camera_doc = new PIXI.DisplayObjectContainer()
		// PIXI display object container for scene / world space
		// eslint-disable-next-line no-undef
		this.doc = new PIXI.DisplayObjectContainer()
		this.camera_doc.addChild(this.doc)
		this.game.stage.addChild(this.camera_doc)
		// PIXI display object container for objects 'fixed to the camera'
		// eslint-disable-next-line no-undef
		this.fixed = new PIXI.DisplayObjectContainer()
		this.game.stage.addChild(this.fixed)
		// position in scene / world space
		const px = x || 0
		const py = y || 0
		this.doc.position.x = -px
		this.doc.position.y = -py
		// camera space
		this.camera_doc.position.x = this.width/2
		this.camera_doc.position.y = this.height/2

		// follow-mode data
		this.follow_mode = follow_mode || View.FOLLOW_MODE_NONE
	}

	/** Update the view for the frame
	* @function View#update
	* @memberof View
	*/
	update()
	{
		// adjust for follow-mode
		if(this.follow_mode !== View.FOLLOW_MODE_NONE)
			this._follow()
	}

	/** Add a (Pixi DisplayObject) to the view
	* @function View#add
	* @memberof View
	* @arg {Pixi.DisplayObject} obj The object to add
	* @arg {boolean} [fixed] Is the object fixed to the camera or not? fixed
	* objects do not move (e.g. a HUD or life-meter). default is false
	*/
	add(obj, fixed)
	{
		if(fixed)
			this.fixed.addChild(obj)
		else
			this.doc.addChild(obj)
	}

	/** Remove a (Pixi DisplayObject) from the view
	* @function View#add
	* @memberof View
	* @arg {Pixi.DisplayObject} obj The object to remove
	* @arg {boolean} [fixed] Is the object fixed to the camera or not? fixed
	* objects do not move (e.g. a HUD or life-meter). default is false
	*/
	remove(obj, fixed)
	{
		if(fixed)
			this.fixed.removeChild(obj)
		else
			this.doc.removeChild(obj)
	}

	/** Remove all (Pixi DisplayObjects) from the view
	* @function View#clear
	* @memberof View
	*/
	clear()
	{
		// clear the camera objects
		this.camera_doc.removeChild(this.doc)
		// eslint-disable-next-line no-undef
		this.doc = new PIXI.DisplayObjectContainer()
		this.camera_doc.addChild(this.doc)

		// clear the 'fixed' objects
		this.game.stage.removeChild(this.fixed)
		// eslint-disable-next-line no-undef
		this.fixed = new PIXI.DisplayObjectContainer()
		this.game.stage.addChild(this.fixed)
	}

	get follow_mode()
	{
		return this._follow_mode
	}
	set follow_mode(val)
	{
		this._follow_mode = val
		// TODO: move these calcs to 'follow_mode' property setter
		// horizontal and vertical "buffer spaces"
		switch(this.follow_mode) {
			case View.FOLLOW_MODE_TIGHT:
				this.lbuf = this.rbuf = this.width/2
			this.tbuf = this.bbuf = this.height/2
			break
			case View.FOLLOW_MODE_PLATFORMER:
				this.lbuf = this.rbuf = this.width/2.5
			this.bbuf = this.height/3
			this.tbuf = this.height/4
			break
			case View.FOLLOW_MODE_OVERHEAD_SCROLLER:
				this.lbuf = this.rbuf = this.width/3
			this.tbuf = this.bbuf = this.height/3
			break
		}

		// horizontal and vertical offsets from center
		// (ie distance from center of view to target)
		this.loffs = this.width/2 - this.lbuf
		this.roffs = this.width/2 - this.rbuf
		this.toffs = this.height/2 - this.tbuf
		this.boffs = this.height/2 - this.bbuf
	}

	_follow()
	{
		const l = -this.doc.position.x - this.loffs
		const r = -this.doc.position.x + this.roffs
		const t = -this.doc.position.y - this.toffs
		const b = -this.doc.position.y + this.boffs

		// get the target's x/y coordinates in scene space
		let x = this._target.x
		let y = this._target.y

		let xstop = false, ystop = false

		// account for scene size
		if(this.scene) {
			if(x > this.scene.width - this.rbuf || x < this.lbuf) {
				// x can't change
				xstop = true
			}
			if(y > this.scene.height - this.bbuf || y < this.tbuf) {
				// y can't change
				ystop = true
			}
		}

		let setx = false
		let sety = false

		// account for buffer space
		if(!xstop) {
			if(x < l) {
				x += this.loffs
				setx = true
			}
			else if(x > r) {
				x -= this.roffs
				setx = true
			}
		}
		if(!ystop) {
			if(y < t) {
				y += this.toffs
				sety = true
			}
			else if(y > b) {
				y -= this.boffs
				sety = true
			}
		}

		if(setx)
			this.doc.position.x = Math.round(-x)
		if(sety)
			this.doc.position.y = Math.round(-y)
	}

	get rotation()
	{
		return -this.camera_doc.rotation
	}
	set rotation(val)
	{
		this.camera_doc.rotation = -val
	}

	/** Set the View scale
	* @method View#setScale
	* @memberof View
	* @arg {Number} sx The x scale factor
	* @arg {Number} sy The y scale factor
	*/
	setScale(sx, sy)
	{
		this.camera_doc.scale.x = sx
		this.camera_doc.scale.y = sy
	}

	get sx()
	{
		return this.camera_doc.scale.x
	}
	set sx(val)
	{
		this.camera_doc.scale.x = val
	}
	get sy()
	{
		return this.camera_doc.scale.y
	}
	set sy(val)
	{
		this.camera_doc.scale.y = val
	}

	/** Set the (center of) the View position (in the Scene)
	* @method View#setPosition
	* @memberof View
	* @arg {Number} x The x coordinate for the position
	* @arg {Number} y The y coordinate for the position
	*/
	setPosition(x, y)
	{
		// do nothing if we're following
		if(this.follow_mode !== View.FOLLOW_MODE_NONE)
			return

		this.doc.position.x = x
		this.doc.position.y = y
	}

	get target()
	{
		return this._target
	}
	set target(val)
	{
		this._target = val
		// center the view on the target
		this.doc.position.x = Math.round(-val.x)
		this.doc.position.y = Math.round(-val.y)
		// if the view exceeds the scene boundaries, we need to adjust
		const left = -this.doc.position.x - this.width/2
		const right = -this.doc.position.x + this.width/2
		const top = -this.doc.position.y - this.height/2
		const bottom = -this.doc.position.y + this.height/2
		if(this.scene) {
			if(left < 0 || right > this.scene.width || top < 0 || bottom > this.scene.height) {
				// adjust the view so that we're not 'out of bounds'
				let xoff = 0, yoff = 0
				if(left < 0)
					xoff = left
				else if(right > this.scene.width)
					xoff = right - this.scene.width
				if(top < 0)
					yoff = top
				else if(bottom > this.scene.height)
					yoff = bottom - this.scene.height

				this.doc.position.x += xoff
				this.doc.position.y += yoff
			}
		}
	}

	get x()
	{
		return -this.doc.position.x
	}
	set x(val)
	{
		this.doc.position.x = -val
	}

	get y()
	{
		return -this.doc.position.y
	}
	set y(val)
	{
		this.doc.position.y = -val
	}
}

