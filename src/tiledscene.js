// tiledscene.js
// Copyright 2014 Joshua C Shepard
// Scene class for Tiled-created maps
//
// TODO:
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
	 * create and update
	 */
	z2.TiledScene = function( url, scene )
	{
		this.load = scene.load || function() {};
		this.create = scene.create || function() {};
		this.update = scene.update || function(dt) {};

		this.map = null;
		this.width = 0;
		this.height = 0;

		// get the ecs manager
		this.mgr = z2.manager.get();

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

	z2.TiledScene.prototype._loadMap = function( tiled )
	{
		this.map = new z2.TileMap( game.view );
		this.map.load( tiled );
		this.width = this.map.worldWidth;
		this.height = this.map.worldHeight;

		// start this tile map / level
		this.map.start( this.mgr );

		// TODO: call a method to setScene ?
		game.view.scene = this;
	};

	z2.TiledScene.prototype._start = function()
	{
		var json = z2.loader.getAsset( 'level' );

		this._loadMap( json );

		// create the objects for the scene
		this.create();
	};
};

