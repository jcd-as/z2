// tilemap.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d tilemapped games
//
// TODO:
// - support Tiled's multiple tilsets 
// - 
//

zSquared.tilemap = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "loader"] );

	/** Tile map layer class
	 * @class z2.TileLayer
	 * @constructor
	 * @arg {z2.View} view The view for this tile map layer
	 */
	z2.TileLayer = function( view )
	{
		this.view = view;

		// create a canvas for this layer to be drawn on
		this.canvas = z2.createCanvas( this.view.width, this.view.height );
		this.context = this.canvas.getContext( '2d' );

		// tiles image
		this.tiles = null;
		this.tileWidth = 0;
		this.tileHeight = 0;
		this.tileImageWidthInTiles = 0;
		this.tileImageHeightInTiles = 0;

		// tiles data
		this.data = null;
		// these, times the tile width/height, must be the same as the scene
		// width & height...
		this.width = 0;
		this.height = 0;
		this.widthInTiles = 0;
		this.heightInTiles = 0;
		this.viewWidthInTiles = 0;
		this.viewHeightInTiles = 0;

		// TODO: the x,y coordinate into this layer should be tracked separately
		// from the view, as it can move at different speeds ("parallax
		// scrolling")
//		this.viewX = 0;
//		this.viewY = 0;
	};

	/** Load a tile layer from Tiled object
	 * @method z2.TileLayer#load
	 * @arg {Object} lyr Layer data from a Tiled json file
	 * @arg {Object} ts Tileset data from a Tiled json file
	 */
	z2.TileLayer.prototype.load = function( lyr, ts )
	{
		// TODO: support Tiled multiple tilesets
		// TODO: impl

		this.tiles = z2.loader.getAsset( ts.name );
		this.tileWidth = ts.tilewidth;
		this.tileHeight = ts.tileheight;
		this.tileImageWidthInTiles = ts.imagewidth / ts.tilewidth;
		this.tileImageHeightInTiles = ts.imageheight / ts.tileheight;

		// tiles data
		this.data = lyr.data;
		// these, times the tile width/height, must be the same as the scene
		// width & height...
		this.width = lyr.width * this.tileWidth;
		this.height = lyr.height * this.tileHeight;
		this.widthInTiles = lyr.width;
		this.heightInTiles = lyr.height;
		this.viewWidthInTiles = this.view.width / this.tileWidth;
		this.viewHeightInTiles = this.view.height / this.tileHeight;
	};

	/** Render the tilemap to its canvas
	 * @method z2.TileLayer#render
	 */
	z2.TileLayer.prototype.render = function()
	{
		// TODO: support Tiled multiple tilesets
		// TODO: dirty checks - don't draw if not dirty
		// TODO: track previous (view) coordinates and only update the necessary
		// areas of the canvas (i.e. if we have just move a bit to the left we
		// can copy the bulk of the image over and only draw a single column of
		// new tiles)

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		var x = ~~(this.view.x - this.view.width/2);
		var y = ~~(this.view.y - this.view.height/2);
		tx = ~~(x / this.tileWidth);
		ty = ~~(y / this.tileHeight);
		xoffs = -(x - (tx * this.tileWidth));
		yoffs = -(y - (ty * this.tileHeight));

		// TODO: account for edges (extra tile row/col)
		var tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_xoffs = xoffs;
		for( var j = 0; j <= this.viewHeightInTiles; j++, ty++ )
		{
			for( var i = 0, tx = orig_tx; i <= this.viewWidthInTiles; i++, tx++ )
			{
				tile = this.data[ty * this.tileImageWidthInTiles + tx];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					// actual index is one less than the Tiled index
					tile--;
					tile_y = ~~(tile / this.tileImageWidthInTiles);
					tile_x = tile - (tile_y * this.tileImageWidthInTiles);
					// draw this tile to the canvas
					this.context.drawImage( this.tiles,
						tile_x * this.tileWidth,// source x 
						tile_y *this.tileHeight,// source y
						this.tileWidth,			// source width
						this.tileHeight,		// source height
						xoffs,					// dest x 
						yoffs,					// dest y
						this.tileWidth,			// dest width
						this.tileHeight			// dest height
					);
				}
				xoffs += this.tileWidth;
			}
			xoffs = orig_xoffs;
			yoffs += this.tileHeight;
		}
	};

	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////

	/** Component Factory for tile map */
	z2.tileMapFactory = z2.createComponentFactory( {layers: null} );

	/** Component Factory for tile map layer */
//	z2.tileLayerFactory = z2.createComponentFactory( {data: null} );

	/////////////////////////////////////////////////////////////////////////
	// System factories
	/////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////
	/** TileMapSystem factory function.
	 * requires: tileMap
	 * optional: ...
	 * @function z2.createTileMapSystem
	 */
	z2.createTileMapSystem = function( context )
	{
		return new z2.System( [z2.tileMapFactory],
		{
//			init: function()
//			{
//			},
			onStart: function()
			{
				// set transform to identity
				context.setTransform( 1, 0, 0, 1, 0, 0 );
			},
			update: function( e, dt )
			{
				var tmc = e.getComponent( z2.tileMapFactory.mask );

				// draw each layer
				for( var i = 0; i < tmc.layers.length; i++ )
				{
					// render the layer
					tmc.layers[i].render();
					// draw the layer to the main context
					context.drawImage( tmc.layers[i].canvas, 0, 0 );
				}
			},
//			onEnd: function()
//			{
//			}
		} );
	};

};
