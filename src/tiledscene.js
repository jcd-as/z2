// tiledscene.js
// Copyright 2014 Joshua C Shepard
// Scene class for Tiled-created maps
//
// TODO:
// - BUG: restarting a level doesn't re-display touch controls
// - 
//

zSquared.tiledscene = function( z2 )
{
	"use strict";

	z2.require( ["2d", "view", "tilemap", "ecs"] );

	/** 
	 * @class z2#z2.TiledScene
	 * @classdesc Scene class which loads from a Tiled (json) map file. Represents a game scene/level/area
	 * @constructor
	 * @arg {string} url The asset URL for the Tiled level (e.g. 'level.json')
	 * @arg {Object} scene An object defining the functions for the scene: load,
	 * init, create and destroy
	 */
	z2.TiledScene = function( url, scene )
	{
		this.load = scene.load || function() {};
		this.init = scene.init || function() {};
		this.create = scene.create || function() {};
		this.destroy = scene.destroy || function() {};

		this.map = null;
		this.width = 0;
		this.height = 0;

		// queue the Tiled map json
		z2.loader.queueAsset( 'level', url, 'tiled' );
	};

	/** Start the scene
	 * @method z2.TiledScene#start
	 * @memberof z2.TiledScene
	 */
	z2.TiledScene.prototype.start = function()
	{
		// queue the assets
		this.load();

		// start the loader
		z2.loader.load( this._start, this );
	};

	/** Stop the scene
	 * @method z2.TiledScene#stop
	 * @memberof z2.TiledScene
	 */
	z2.TiledScene.prototype.stop = function()
	{
		// stop touch input handling
		z2.touch.stop();

		// stop kbd handling
		z2.kbd.stop();

		// clear the view (& thus Pixi)
		game.view.clear();

		// reset the ecs system
		z2.manager.reset();

		// tear-down the scene
		this.destroy();
	};

	/** Re-start a scene
	 * @method z2.TiledScene#restart
	 * @memberof z2.TileScene
	 */
	z2.TiledScene.prototype.restart = function()
	{
		this.stop();
		game.view.scene = null;
		this._start();
	};

	z2.TiledScene.prototype._loadMap = function( tiled )
	{
		this.map = new z2.TileMap( game.view );
		this.map.load( tiled );
		this.width = this.map.worldWidth;
		this.height = this.map.worldHeight;

		// start this tile map / level
		this.map.start();

		// TODO: call a method to setScene ?
		game.view.scene = this;
	};

	z2.TiledScene.prototype._start = function()
	{
		var json = z2.loader.getAsset( 'level' );

		// get the ecs manager (force it to init)
		z2.manager.get();

		// init the scene (pre-tiled load)
		this.init();

		// load the tiled json
		this._loadMap( json );

		// create the objects for the scene
		this.create();

		// create rendering system
		this.renderer = z2.createRenderingSystem( game.canvas, game.view, game.force_canvas );
		z2.manager.get().addSystem( this.renderer );
	};
};

