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

	z2.require( ["tilemap"] );

	/** 
	 * @class z2#z2.TiledScene
	 * @classdesc Scene class which loads from a Tiled (json) map file. Represents a game scene/level/area
	 * @constructor
	 * @arg {string} tiled The key (friendly name) for a (previously loaded) Tiled map asset
	 */
	z2.TiledScene = function( tiled, view_width, view_height )
	{
		// load the tilemap
		this.map = new z2.TileMap( view_width, view_height );
		this.map.load( tiled );

		this.width = this.map.width;
		this.height = this.map.height;
	};
};

