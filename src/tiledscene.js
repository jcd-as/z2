// tiledscene.js
// Copyright 2014 Joshua C Shepard
// Scene class for Tiled-created maps
//
// TODO:
// - BUG: restarting a level doesn't re-display touch controls
// -
//

/** Module supporting Game Scenes loaded from Tiled editor JSON file.
 * @module
 */

import loader from './loader.js'
import * as tilemap from './tilemap.js'
import * as ecs from './ecs.js'
import * as input from './input.js'
import * as _2d from './2d-pixi.js'


/** Scene class which loads from a Tiled (json) map file. Represents a game scene/level/area. */
class TiledScene
{
	game = undefined
	load = undefined
	init = undefined
	create = undefined
	update = undefined
	destroy = undefined

	loadProgressImage = null
	loadProgressSprite = null

	map = null
	width = 0
	height = 0

	collidables = null

	ready = false

	/*
	* @constructor
	* @arg {Object} game Instance of the Game object
	* @arg {string} url The asset URL for the Tiled level (e.g. 'level.json')
	* @arg {Object} scene An object defining the functions for the scene: load,
	* init, create, update and destroy
	*/
	constructor(game, url, scene)
	{
		this.game = game
		this.load = scene.load || function() {}
		this.init = scene.init || function() {}
		this.create = scene.create || function() {}
		this.update = scene.update || function() {}
		this.destroy = scene.destroy || function() {}

		// queue the Tiled map json
		loader.queueAsset('level', url, 'tiled')
	}

	/** Start the scene. */
	start()
	{
		// queue the assets
		this.load()

		// if we have a loading image, display it
		if(this.loadProgressImage) {
			// eslint-disable-next-line no-undef
			const bt = new PIXI.BaseTexture( this.loadProgressImage )
			// eslint-disable-next-line no-undef
			const tex = new PIXI.Texture( bt )
			// eslint-disable-next-line no-undef
			this.loadProgressSprite = new PIXI.Sprite( tex )
			// center the sprite
			this.loadProgressSprite.position.x = this.game.view.width / 2 - bt.width/2
			this.loadProgressSprite.position.y = this.game.view.height / 2 - bt.height/2
			// crop the sprite
			tex.frame.width = 0
			this.game.view.add(this.loadProgressSprite, true)
			this.game.renderer.render(this.game.stage)
		}

		// start the loader
		loader.load(this._start, this._loadProgressCallback, this)
	}

	/** Stop the scene. */
	stop()
	{
		// stop touch input handling
		input.touch.stop()

		// stop kbd handling
		input.kbd.stop()

		// clear the view (& thus Pixi)
		this.game.view.clear()

		// reset the ecs system
		ecs.manager.reset()
	}

	/** Re-start a scene. */
	restart()
	{
		this.stop()
		this.game.view.scene = null
		this._start()
	}

	_loadMap(tiled)
	{
		this.map = new tilemap.TileMap(this.game.view)
		this.map.load(tiled)
		this.width = this.map.worldWidth
		this.height = this.map.worldHeight

		// start this tile map / level
		this.map.start()

		// TODO: call a method to setScene ?
		this.game.view.scene = this
	}

	_start()
	{
		this.collidables = []

		// if we have a loading image, remove it
		if(this.loadProgressSprite) {
			this.game.view.remove(this.loadProgressSprite, true)
			this.loadProgressSprite = null
		}

		const json = loader.getAsset('level')

		// get the ecs manager (force it to init)
		ecs.manager.get()

		// init the scene (pre-tiled load)
		this.init()

		// load the tiled json
		this._loadMap(json)

		// create the objects for the scene
		this.create()

		// create rendering system
		this.renderer = _2d.createRenderingSystem(this.game.canvas, this.game.view, this.game.force_canvas)
		ecs.manager.get().addSystem(this.renderer)

		// tell the main loop that it is okay to call 'update' on us
		this.ready = true
	}

	_loadProgressCallback(percent_done)
	{
		if(this.loadProgressSprite) {
			// crop the sprite
			const tex = this.loadProgressSprite.texture
			let fr = tex.frame
			fr.width = tex.baseTexture.width * percent_done
			tex.frame = fr
			tex.updateUvs()
			// force a render
			this.game.renderer.render(this.game.stage)
		}
	}
}
export default TiledScene

