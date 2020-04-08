// game.js
// Copyright 2014 Joshua C Shepard
// main 'game' object for the z-squared engine
//
// TODO:
// -

import View from './view-pixi.js'
import time from './time.js'
import * as audio from './audio.js'
import loader from './loader.js'
import * as ecs from './ecs.js'
import zSquared from './z2.js'


/** Game object module.
 * @module
 */


/** Game class - this is where it all starts. */
class Game
{
	#app = null

	/** Are we in debug mode? */
	#debug = false

	#_paused = false
	#_pausedSprite = null
	#_pausedBg = null
	#_scene = null
	#_player = null

	/**
	* @constructor
	* @arg {width} number Width of the game canvas, in pixels
	* @arg {height} number Height of the game canvas, in pixels
	*/
	constructor(width, height)
	{
		// create the Pixi application object
		// eslint-disable-next-line no-undef
		this.app = new PIXI.Application({width, height})

		// create a view with some default values
		this.view = new View(this, width, height)

		// setup handlers for visibility change events (pause game when focus is
		// lost)
		this._paused = false
		const visibilityChange = event => {
			if(this._paused === false && (event.type === 'pagehide' || event.type === 'blur' || document.hidden === true || document.webkitHidden === true))
				this.pause()
			else
				this.resume()
		}
		document.addEventListener('visibilitychange', visibilityChange, false)
		document.addEventListener('webkitvisibilitychange', visibilityChange, false)
		document.addEventListener('pagehide', visibilityChange, false)
		document.addEventListener('pageshow', visibilityChange, false)
		window.onblur = visibilityChange
		window.onfocus = visibilityChange
	}

	/** Are we currently paused? */
	get paused()
	{
		return this._paused
	}

	/** The player entity - must be set by the game code */
	get player()
	{
		return this._player
	}
	set player(val)
	{
		this._player = val
	}

	/** The current game scene. */
	get scene()
	{
		return this._scene
	}

	/** Render the current scene. */
	render()
	{
		this.app.render(this.app.stage)
	}

	/** Add a child to the current scene. */
	addChild(child)
	{
		this.app.stage.addChild(child)
	}

	/** Remove a child from the current scene. */
	removeChild(child)
	{
		this.app.stage.removeChild(child)
	}

	/** Clear the view. */
	clearView()
	{
		this.view.clear()
	}

	/** Pause the game. */
	pause()
	{
		if(this._paused)
			return

		this._paused = true
		time.pause()
		audio.pauseSounds()

		// display paused graphic, if we have one
		if(this._pausedSprite) {
			this.view.add(this._pausedBg, true)
			this.view.add(this._pausedSprite, true)
			this.render()
		}
		else {
			const img = loader.getAsset('paused-image')
			if(img) {
				// TODO: this potentially leaks (see Pixi.js docs)
				// need to call .destroy() on a PIXI.Graphics object when
				// finished with it
				// eslint-disable-next-line no-undef
				this._pausedBg = new PIXI.Graphics()
				this._pausedBg.beginFill(0x000000)
				this._pausedBg.alpha = 0.85
				this._pausedBg.drawRect(0, 0, this.view.width, this.view.height)
				this._pausedBg.endFill()

				// eslint-disable-next-line no-undef
				const bt = new PIXI.BaseTexture(img)
				// eslint-disable-next-line no-undef
				const t = new PIXI.Texture(bt)
				// eslint-disable-next-line no-undef
				this._pausedSprite = new PIXI.Sprite(t)

				this.view.add(this._pausedBg, true)
				this.view.add(this._pausedSprite, true)
				this.render()
			}
		}
	}

	/** Resume a paused game. */
	resume()
	{
		if(!this._paused)
			return

		this._paused = false
		audio.resumeSounds()
		time.resume()

		// hide paused graphic, if we have one
		if(this._pausedSprite) {
			this.view.remove(this._pausedBg, true)
			this.view.remove(this._pausedSprite, true)
			this.render()
		}
	}

	/** Start a scene by name or object
	* @arg {Scene|Function} scene The Scene object or the function to create
	* the Scene object which to start. If it is a function, any remaining args
	* will be passed to the function
	*/
	startScene(scene)
	{
		let new_scene
		if(typeof scene === 'object') {
			new_scene = scene
		}
		else if(typeof scene === 'function') {
			const extras = Array.prototype.slice.call(arguments, 1)
			if( extras )
				new_scene = scene.apply(null, extras)
			else
				new_scene = scene()
		}
		else
			throw new Error("Scene object passed to Game.startScene() is neither an object nor a function")

		// if we have a scene running, stop it first
		if(this._scene) {
			this._scene.stop()
			// then delete it
			this._scene.destroy()
		}
		// then start the new scene
		this._scene = new_scene
		this._scene.start()
	}

	// return the function to use to update the game inside the main loop
	_getMainloopUpdateFn()
	{
		return (et) => {
			if(this.debug && zSquared.stats)
				zSquared.stats.begin()

			// TODO: problem with this is that ecsUpdate calculates the time delta, so
			// by intercepting here the dt doesn't get updated properly
			if(!this._paused) {
				// update the scene
				// (lets it implement any non-ECS behaviour it wants)
				if(this.scene && this.scene.ready) {
					// let the scene do any specific updating that it needs
					this.scene.update()

					// update the ECS system
					ecs.ecsUpdate(et)
				}
			}

			if(this.debug && zSquared.stats)
				zSquared.stats.end()
		}
	}

	/** Start the main loop. */
	start()
	{
		// start the main game loop
		zSquared.startMain(this._getMainloopUpdateFn())
	}

}
export default Game

