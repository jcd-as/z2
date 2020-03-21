// scene.js
// Copyright 2013 Joshua C Shepard
// game scene class/module for zed-squared
//
// TODO:
// -

/** Game Scene module.
 * @module
 */

import * as ecs from './ecs.js'
import loader from './loader.js'
import * as input from './input.js'


/** Scene class. Represents a game scene/level/area. */
class Scene
{
	#load = undefined
	#init = undefined
	#create = undefined
	#update = undefined
	#destroy = undefined

	// callback fcn can be set
	#loadProgressCallbackFn = null

	#width = 0
	#height = 0

	#collidables = null

	ready = false

	/**
	* @constructor
	* @arg {Canvas} canvas The HTML5 Canvas on which to draw the scene
	* @arg {number} width Width of the scene, in pixels
	* @arg {number} height Height of the scene, in pixels
	* @arg {Object} scene An object defining the functions for the scene: load,
	* init, create, update and destroy
	*/
	constructor(width, height, scene)
	{
		this.load = scene.load || function() {}
		this.init = scene.init || function() {}
		this.create = scene.create || function() {}
		this.update = scene.update || function() {}
		this.destroy = scene.destroy || function() {}

		this.width = width || 0
		this.height = height || 0
	}

	/** Start the scene. */
	start()
	{
		// queue the assets
		this.load()

		// start the loader
		loader.load(this.internalStart, this.loadProgressCallback, this)
	}

	/** Stop the scene. */
	stop()
	{
		// stop touch input handling
		input.touch.stop()

		// stop kbd handling
		input.kbd.stop()

		// clear the view (& thus Pixi)
		// TODO: fix using global 'game' object
		// eslint-disable-next-line no-undef
		game.view.clear()

		// reset the ecs system
		ecs.manager.reset()
	}


	/** Re-start a scene. */
	restart()
	{
		this.stop()
		this.internalStart()
	}

	internalStart()
	{
		this.collidables = []

		// get the ecs manager (force it to init)
		ecs.manager.get()

		// init the scene
		this.init()

		// create the objects for the scene
		this.create()

		// tell the main loop that it is okay to call 'update' on us
		this.ready = true
	}

	loadProgressCallback(percent_done)
	{
		if(this.loadProgressCallbackFn)
			this.loadProgressCallbackFn(percent_done)
	}
}
export default Scene

