// tilemap.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d tilemapped games
//
// TODO:
// - optimize 
// - can we separate the need for the view size from the map? (this would allow
// the same map to (conceptually anyway) have different views. e.g. a main view
// and a 'minimap' view
// -


zSquared.tilemap = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "loader"] );

	/** Tile map class
	 * @class z2.TileMap
	 * @constructor
	 * @arg {Number} view_width The width of the view
	 * @arg {Number} view_height The height of the view
	 */
	z2.TileMap = function( view_width, view_height )
	{
		// view dimensions
		// (size for the layers' canvases)
		this.viewWidth = view_width;
		this.viewHeight = view_height;

		// tiles image
		this.tilesets = [];

		// tiles data
		this.data = null;
		this.tileWidth = 0;
		this.tileHeight = 0;

		// map size data
		// these, times the tile width/height, must be the same as the scene
		// width & height...
		this.width = 0;
		this.height = 0;
		this.widthInTiles = 0;
		this.heightInTiles = 0;
		this.viewWidthInTiles = 0;
		this.viewHeightInTiles = 0;

		// layer data
		this.layers = [];
	};

	/** Load a tile map from Tiled object
	 * @method z2.TileMap#load
	 * @arg {Object} map map data from a Tiled json file
	 */
	z2.TileMap.prototype.load = function( map )
	{
		var i;

		this.tileWidth = map.tilewidth;
		this.tileHeight = map.tileheight;
		this.widthInTiles = map.width;
		this.heightInTiles = map.height;
		this.viewWidthInTiles = this.viewWidth / this.tileWidth;
		this.viewHeightInTiles = this.viewHeight / this.tileHeight;
		// these, times the tile width/height, must be the same as the scene
		// width & height...
		this.width = map.width * this.tileWidth;
		this.height = map.height * this.tileHeight;

		// load each tileset
		for( i = 0; i < map.tilesets.length; i++ )
		{
			var ts = map.tilesets[i];
			var w = ts.imagewidth / ts.tilewidth;
			var h = ts.imageheight / ts.tileheight;
			var tileset =
			{
				widthInTiles: w,
				heightInTiles: h,
				tiles: z2.loader.getAsset( ts.name ),
				start: ts.firstgid,
				end: ts.firstgid + w * h
			};
			// store the start tile
			this.tilesets.push( tileset );
		}

		// load each tile layer
		for( i = 0; i < map.layers.length; i++ )
		{
			var lyr = map.layers[i];
			if( lyr.type == 'tilelayer' )
			{
				var l = new z2.TileLayer( this );
				l.load( lyr );
				this.layers.push( l );
			}
			// TODO: load image layers
//			else if( lyr.type == 'imagelayer' )
//			{
//			}
			// TODO: load object layers
//			else if( lyr.type == 'objectlayer' )
//			{
//			}
		}
	};

	/** Get the tileset for a given tile index
	 * @method z2.TileMap#getTilesetForIndex
	 * @arg {Number} idx Index of the tile whose tileset we want
	 * @returns {Object} The tileset object
	 */
	z2.TileMap.prototype.getTilesetForIndex = function( idx )
	{
		// TODO: binary search?
		// check each tileset
		for( var i = 0; i < this.tilesets.length; i++ )
		{
			if( idx >= this.tilesets[i].start && idx < this.tilesets[i].end )
				return this.tilesets[i];
		}
		return null;
	};

	/** Tile map layer class
	 * @class z2.TileLayer
	 * @constructor
	 * @arg {z2.View} view The view for this tile map layer
	 */
	z2.TileLayer = function( map )
	{
		// reference to the TileMap that contains the layer
		this.map = map;

		// create a canvas for this layer to be drawn on
		this.canvas = z2.createCanvas( map.viewWidth, map.viewHeight );
		this.context = this.canvas.getContext( '2d' );

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
		// tiles data
		this.data = lyr.data;
	};

	/** Render the tilemap to its canvas
	 * @method z2.TileLayer#render
	 * @arg {Number} viewx The x-coordinate that the view is centered on
	 * @arg {Number} viewy The y-coordinate that the view is centered on
	 */
	z2.TileLayer.prototype.render = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty
		// TODO: track previous (view) coordinates and only update the necessary
		// areas of the canvas (i.e. if we have just move a bit to the left we
		// can copy the bulk of the image over and only draw a single column of
		// new tiles)

		// TODO: flag to indicate whether to clear or not
		// TODO: customizable clear color (?)
		// clear canvas
		this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		var x = ~~(viewx - this.map.viewWidth/2);
		var y = ~~(viewy - this.map.viewHeight/2);
		tx = ~~(x / this.map.tileWidth);
		ty = ~~(y / this.map.tileHeight);
		xoffs = -(x - (tx * this.map.tileWidth));
		yoffs = -(y - (ty * this.map.tileHeight));

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_xoffs = xoffs;
		var i;
		for( var j = 0; j <= this.map.viewHeightInTiles; j++, ty++ )
		{
			for( i = 0, tx = orig_tx; i <= this.map.viewWidthInTiles; i++, tx++ )
			{
				tile = this.data[ty * this.map.tilesets[0].widthInTiles + tx];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					// get the actual tile index in the tileset
					var tileset = this.map.getTilesetForIndex( tile );
					tile -= tileset.start;
					tile_y = ~~(tile / tileset.widthInTiles);
					tile_x = tile - (tile_y * tileset.widthInTiles);
					// draw this tile to the canvas
					this.context.drawImage( 
						tileset.tiles,				// source image
						tile_x * this.map.tileWidth,// source x 
						tile_y *this.map.tileHeight,// source y
						this.map.tileWidth,			// source width
						this.map.tileHeight,		// source height
						xoffs,						// dest x 
						yoffs,						// dest y
						this.map.tileWidth,			// dest width
						this.map.tileHeight			// dest height
					);
				}
				xoffs += this.map.tileWidth;
			}
			xoffs = orig_xoffs;
			yoffs += this.map.tileHeight;
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
	z2.createTileMapSystem = function( view, canvas )
	{
		var context = canvas.getContext( '2d' );
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
					tmc.layers[i].render( view.x, view.y );
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
