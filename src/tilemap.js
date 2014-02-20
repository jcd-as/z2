// tilemap.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d tilemapped games
//
// TODO:
// - can we separate the need for the view from the map? (this would allow
// the same map to (conceptually anyway) have different views. e.g. a main view
// and a 'minimap' view
// - RENDER_PIXI_ALL_SPR: track previous x/y & only set visible flags when we 
// have scrolled out of a tile boundary (ala RENDER_OPT_PIXI_SPR)
// -


zSquared.tilemap = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "loader", "device"] );

	// different ways to render the tile maps:
	// 'naive' renderer, draws all on-screen tiles on a Canvas each frame
	var RENDER_SIMPLE = 0;
	// optimized version of above, uses two canvases, only redraws tiles that
	// have scrolled onto the screen since last frame, copies the rest of the
	// screen
	var RENDER_OPT_PAGES = 1;
	// renders using a Pixi sprite for each tile that is on-screen, collected in
	// a Pixi DisplayObjectContainer which is drawn at the appropriate offset
	var RENDER_PIXI_SPR = 2;
	// optimized version of above, only resets all the tile frames when we've
	// scrolled out of tile bounds
	var RENDER_OPT_PIXI_SPR = 3;
	// 'brute force' WebGL method: one Pixi Sprite per tile in the entire world
	// (not just the screen), set visible flag on them if they are on-screen
	var RENDER_PIXI_ALL_SPR = 4;

	var render_method;
//	var render_method = RENDER_PIXI_ALL_SPR;
//	var render_method = RENDER_OPT_PIXI_SPR;
//	var render_method = RENDER_PIXI_SPR;
//	var render_method = RENDER_OPT_PAGES;
//	var render_method = RENDER_SIMPLE;

	z2.renderers = 
	{
		RENDER_SIMPLE : RENDER_SIMPLE,
		RENDER_OPT_PAGES : RENDER_OPT_PAGES,
		RENDER_PIXI_SPR : RENDER_PIXI_SPR,
		RENDER_OPT_PIXI_SPR : RENDER_OPT_PIXI_SPR,
		RENDER_PIXI_ALL_SPR : RENDER_PIXI_ALL_SPR
	};
	z2.setRenderMethod = function( rm )
	{
		render_method = rm;
	};

	/** Tile map class
	 * @class z2.TileMap
	 * @constructor
	 * @arg {z2.View} view The view 
	 */
	z2.TileMap = function( view )
	{
		// if the render method hasn't been set already, 
		// make a best guess
		if( render_method === undefined )
		{
			if( z2.device.webGL )
				render_method = RENDER_OPT_PIXI_SPR;
			else
				render_method = RENDER_OPT_PAGES;
		}

		// view dimensions
		// (size for the layers' canvases)
		this.view = view;
		this.viewWidth = view.width;
		this.viewHeight = view.height;

		// tiles image
		this.tilesets = [];

		// tile dimensions
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

		// the 'main' layer, with which the player is seen to interact
		this.mainLayer = null;
		// size of the 'main' layer
		this.worldWidth = 0;
		this.worldHeight = 0;

		// image layers
		this.imageLayers = [];

		// object groups (arrays of objects)
		this.objectGroups = [];

		// collision map
		this.solidTiles = [];
		this.collisionMap = null;
		this.collisionMapComponent = null;

		// Tile layer Entities
		this.layerEntities = [];
	};

	/** Load a tile map from Tiled object
	 * @method z2.TileMap#load
	 * @memberof z2.TileMap
	 * @arg {Object} map map data from a Tiled json file
	 */
	z2.TileMap.prototype.load = function( map )
	{
		var i;

		// name of the 'main' layer:
		var main_layer = map.properties.main_layer || 'main';

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

		if( map.properties && map.properties.width )
			this.worldWidth = +map.properties.width;
		else
			this.worldWidth = this.width;
		if( map.properties && map.properties.height )
			this.worldHeight = +map.properties.height;
		else
			this.worldHeight = this.height;

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

		// build the list of solid tiles
		// TODO: support multiple tilesets
		this._buildSolidTileList( map.tilesets[0] );

		var l;

		// load each layer
		for( i = 0; i < map.layers.length; i++ )
		{
			var lyr = map.layers[i];
			if( lyr.type == 'tilelayer' )
			{
				// create a tile layer
				l = new z2.TileLayer( this );
				l.load( lyr );
				if( lyr.name === main_layer )
					this.mainLayer = l;
				l.visible = lyr.visible;
				this.layers.push( l );
				// if the layer is solid, create the collision map from it
				if( lyr.properties && lyr.properties.solid )
				{
					l.solid = true;
					this._buildCollisionMap( lyr.data );
				}
			}
			// load image layers
			else if( lyr.type == 'imagelayer' )
			{
				l = new z2.ImageLayer( this, lyr );
				this.imageLayers.push( l );
			}
			// load object layers
			else if( lyr.type == 'objectgroup' )
			{
				this.objectGroups.push( createObjects( lyr ) );
			}
		}
	};

	z2.TileMap.prototype._buildSolidTileList = function( tileset )
	{
		// TODO: support multiple tilesets
		for( var key in tileset.tileproperties )
		{
			if( !tileset.tileproperties.hasOwnProperty( key ) )
				continue;
			if( tileset.tileproperties[key].solid )
				this.solidTiles.push( +key );
		}
	};

	z2.TileMap.prototype._buildCollisionMap = function( data )
	{
		this.collisionMap = z2.buildCollisionMap( data, this.widthInTiles, this.heightInTiles, this.solidTiles );
	};

	z2.TileMap.prototype._updateObjectCollisionMaps = function()
	{
		for( var i = 0; i < this.objectGroups.length; i++ )
		{
			var grp = this.objectGroups[i];
			for( var j = 0; j < grp.length; j++ )
			{
				var obj = grp[j];
				var cmc = obj.getComponent( z2.collisionMapFactory );
				if( cmc )
				{
					cmc.map = this;
					cmc.data = this.collisionMap;
				}
			}
		}
	};

	/** Start the scene running
	 * @method z2.TileMap#start
	 */
	z2.TileMap.prototype.start = function()
	{
		var i;
		var mgr = z2.manager.get();

		// create Entities for the TileLayers
		for( i = 0; i < this.layers.length; i++ )
		{
			var tlc = z2.tileLayerFactory.create( {layer: this.layers[i]} );
			var tle = mgr.createEntity( [z2.renderableFactory, tlc] );
			this.layerEntities.push( tle );
		}

		// create Entities for the ImageLayers
		for( i = 0; i < this.imageLayers.length; i++ )
		{
			var ilc = z2.imageLayerFactory.create( {layer: this.imageLayers[i]} );
			var ile = mgr.createEntity( [z2.renderableFactory, ilc] );
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
	 * @arg {z2.TileMap} map The tile map
	 */
	z2.TileLayer = function( map, visible )
	{
		// set the render method to the appropriate internal method
		if( render_method === RENDER_SIMPLE )
			z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasNaive;
		else if( render_method === RENDER_OPT_PAGES )
			z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasOpt;
		else if( render_method === RENDER_PIXI_SPR )
			z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiSpr;
		else if( render_method === RENDER_OPT_PIXI_SPR )
			z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiSprOpt;
		else if( render_method === RENDER_PIXI_ALL_SPR )
			z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiAllSpr;

		// reference to the TileMap that contains the layer
		this.map = map;

		this.solid = false;

		// the factor by which the movement (scrolling) of this layer differs
		// from the "main" map. e.g. '2' would be twice as fast, '0.5' would be
		// half as fast
		this.scrollFactorX = 1;
		this.scrollFactorY = 1;

		if( render_method == RENDER_SIMPLE || render_method == RENDER_OPT_PAGES )
		{
			if( render_method == RENDER_SIMPLE )
			{
				// create a canvas for this layer to be drawn on
				this.canvasWidth = map.viewWidth;
				this.canvasHeight = map.viewHeight;
			}
			else if( render_method == RENDER_OPT_PAGES )
			{
				// create two canvases for this layer to be drawn on
				this.canvasWidth = map.viewWidth + map.tileWidth;
				this.canvasHeight = map.viewHeight + map.tileHeight;

				this.backCanvas = z2.createCanvas( this.canvasWidth, this.canvasHeight );
				this.backContext = this.backCanvas.getContext( '2d' );

				// vars for tracking the previous frame position
				this._prev_x = NaN;
				this._prev_tx = NaN;
				this._prev_ty = NaN;
			}
			this.canvas = z2.createCanvas( this.canvasWidth, this.canvasHeight );
			this.context = this.canvas.getContext( '2d' );

			this.baseTexture = new PIXI.BaseTexture( this.canvas );
			this.frame = new PIXI.Rectangle( 0, 0, this.canvas.width, this.canvas.height );
			this.texture = new PIXI.Texture( this.baseTexture );
			this.sprite = new PIXI.Sprite( this.texture );
			map.view.add( this.sprite );
		}
		else if( render_method == RENDER_PIXI_SPR || render_method == RENDER_OPT_PIXI_SPR )
		{
			this.canvasWidth = map.viewWidth + map.tileWidth;
			this.canvasHeight = map.viewHeight + map.tileHeight;
			this.frame = new PIXI.Rectangle( 0, 0, this.canvasWidth, this.canvasHeight );
			// TODO: support more than one tileset
			this.tileTexture = new PIXI.BaseTexture( map.tilesets[0].tiles );
			this.doc = new PIXI.DisplayObjectContainer();
//			this.doc = new PIXI.SpriteBatch();

			this.tileSprites = [];
			for( var i = 0; i <= map.viewHeightInTiles; i++ )
			{
				this.tileSprites.push( [] );
				for( var j = 0; j <= map.viewWidthInTiles; j++ )
				{
					var texture = new PIXI.Texture( this.tileTexture );
					var spr = new PIXI.Sprite( texture );
					spr.position.x = j * map.tileWidth;
					spr.position.y = i * map.tileHeight;
					texture.frame.width = map.tileWidth;
					texture.frame.height = map.tileHeight;
					this.tileSprites[i].push( spr );
					this.doc.addChild( spr );
				}
			}
			map.view.add( this.doc );

			this._prevTx = -1;
			this._prevTy = 0;
		}
		else if( render_method == RENDER_PIXI_ALL_SPR )
		{
			// vars for tracking the previous frame position
			this._prev_tx = NaN;
			this._prev_ty = NaN;

			// TODO: we shouldn't be doing this if the layer is not visible...
			this.canvasWidth = map.viewWidth;
			this.canvasHeight = map.viewHeight;
			this.frame = new PIXI.Rectangle( 0, 0, this.canvasWidth, this.canvasHeight );

			// TODO: support more than one tileset
			this.tileTexture = new PIXI.BaseTexture( map.tilesets[0].tiles );
			this.doc = new PIXI.DisplayObjectContainer();
//			this.doc = new PIXI.SpriteBatch();

			this.tileSprites = [];

			map.view.add( this.doc );
		}
	};

	/** Load a tile layer from Tiled object
	 * @method z2.TileLayer#load
	 * @arg {Object} lyr Layer data from a Tiled json file
	 * @arg {Object} ts Tileset data from a Tiled json file
	 */
	z2.TileLayer.prototype.load = function( lyr, ts )
	{
		// tiles data
		this.data = lyr.data.slice();
		this.name = lyr.name;
		if( lyr.properties )
		{
			this.scrollFactorX = lyr.properties.scrollFactorX ? +lyr.properties.scrollFactorX : 1;
			this.scrollFactorY = lyr.properties.scrollFactorY ? +lyr.properties.scrollFactorY : 1;
		}
		if( render_method === RENDER_PIXI_ALL_SPR )
		{
			this._createSpritesForPixiAllSpr();
		}
	};

	z2.TileLayer.prototype._createSpritesForPixiAllSpr = function()
	{
		// TODO: support more than one tileset
		var tileset = this.map.tilesets[0];
		// create & set-up all the tile sprites
		for( var i = 0; i <= this.map.heightInTiles; i++ )
		{
			this.tileSprites.push( [] );
			for( var j = 0; j <= this.map.widthInTiles; j++ )
			{
				var tile = this.data[i * this.map.widthInTiles + j];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					tile--;
					var texture = new PIXI.Texture( this.tileTexture );
					var spr = new PIXI.Sprite( texture );
					spr.position.x = j * this.map.tileWidth;
					spr.position.y = i * this.map.tileHeight;
					spr.i = i;
					spr.j = j;
					var tile_y = 0 | (tile / tileset.widthInTiles);
					var tile_x = tile - (tile_y * tileset.widthInTiles);
					texture.frame.x = tile_x * this.map.tileWidth;
					texture.frame.y = tile_y * this.map.tileHeight;
					texture.frame.width = this.map.tileWidth;
					texture.frame.height = this.map.tileHeight;

					this.tileSprites[i][j] = spr;
					this.doc.addChild( spr );
				}
			}
		}
	};
	z2.TileLayer.prototype._updateSpritesForPixiAllSpr = function()
	{
		// TODO: support more than one tileset
		var tileset = this.map.tilesets[0];
		// create & set-up all the tile sprites
		for( var i = 0; i <= this.map.heightInTiles; i++ )
		{
			for( var j = 0; j <= this.map.widthInTiles; j++ )
			{
				var tile = this.data[i * this.map.widthInTiles + j];
				var spr = this.tileSprites[i][j];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					// if we have a tile, but no sprite, create a sprite
					if( !spr )
					{
						spr = new PIXI.Sprite( new PIXI.Texture( this.tileTexture ) );
						this.doc.addChild( spr );
					}
					// otherwise use the existing sprite
					tile--;
					var texture = spr.texture;
					spr.position.x = j * this.map.tileWidth;
					spr.position.y = i * this.map.tileHeight;
					spr.i = i;
					spr.j = j;
					var tile_y = 0 | (tile / tileset.widthInTiles);
					var tile_x = tile - (tile_y * tileset.widthInTiles);
					var frame = texture.frame;
					frame.x = tile_x * this.map.tileWidth;
					frame.y = tile_y * this.map.tileHeight;
					frame.width = this.map.tileWidth;
					frame.height = this.map.tileHeight;
					texture.setFrame( frame );
				}
			}
		}
	};

	/** Force the entire layer to be re-drawn in the next frame
	 * @method z2.TileLayer#forceDirty
	 */
	z2.TileLayer.prototype.forceDirty = function()
	{
		switch( render_method )
		{
			case RENDER_SIMPLE:
				break;
			case RENDER_OPT_PAGES:
				// set flag
				this._prev_x = NaN;
				break;
			case RENDER_PIXI_SPR:
				break;
			case RENDER_OPT_PIXI_SPR:
				// set flag
				this._prev_tx = NaN;
				break;
			case RENDER_PIXI_ALL_SPR:
				// update tile sprites
				this._updateSpritesForPixiAllSpr();
				break;
		}
	};

	z2.TileLayer.prototype.renderCanvasNaive = function( viewx, viewy )
	{
		this.sprite.visible = this.visible;
		if( !this.visible )
			return;

		// TODO: dirty checks - don't draw if not dirty

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		// TODO: clamp x,y to the layer/map bounds
		var x = 0 | (viewx - this.map.viewWidth/2)*this.scrollFactorX;
		var y = 0 | (viewy - this.map.viewHeight/2)*this.scrollFactorY;
		tx = 0 | (x / this.map.tileWidth);
		ty = 0 | (y / this.map.tileHeight);
		xoffs = -(x - (tx * this.map.tileWidth));
		yoffs = -(y - (ty * this.map.tileHeight));

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var orig_xoffs = xoffs;
		var orig_yoffs = yoffs;
		var i, j;

		// clear canvas
		this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
		for( j = 0; j <= this.map.viewHeightInTiles; j++, ty++ )
		{
			for( i = 0, tx = orig_tx; i <= this.map.viewWidthInTiles; i++, tx++ )
			{
				tile = this.data[ty * this.map.widthInTiles + tx];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					// get the actual tile index in the tileset
					tileset = this.map.getTilesetForIndex( tile );
					tile -= tileset.start;
					tile_y = 0 | (tile / tileset.widthInTiles);
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

		// TODO: bleh...
		// this works in PIXI 1.3:
//		if( PIXI.gl )
//			PIXI.texturesToUpdate.push( this.baseTexture );
		// but texturesToUpdate isn't actually updated in 1.4,
		// so we have to update it ourselves:
		if( PIXI.defaultRenderer.renderSession.gl )
			PIXI.updateWebGLTexture( this.baseTexture, PIXI.defaultRenderer.renderSession.gl );

		this.sprite.position.x = 0 | (viewx - this.map.viewWidth/2);
		this.sprite.position.y = 0 | (viewy - this.map.viewHeight/2);
	};

	z2.TileLayer.prototype.renderCanvasOpt = function( viewx, viewy )
	{
		this.sprite.visible = this.visible;
		if( !this.visible )
			return;

		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		var tw = this.map.tileWidth;
		var th = this.map.tileHeight;

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		var x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = 0 | (x / tw);
		ty = 0 | (y / th);
		xoffs = -(x - (tx * tw));
		yoffs = -(y - (ty * th));

		// set the texture frame for the new position
		// (NOTE: do this here instead of after updating the canvases or 
		// you'll get a nasty flashing effect!)
		this.texture.frame.x = -xoffs;
		this.texture.frame.y = -yoffs;
		this.texture.frame.width = this.canvasWidth - this.texture.frame.x;
		this.texture.frame.height = this.canvasHeight - this.texture.frame.y;
		this.texture.setFrame( this.texture.frame );

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var orig_xoffs = xoffs;
		var orig_yoffs = yoffs;
		var i, j;

		var mapWidth = this.map.widthInTiles;
		var mapHeight = this.map.heightInTiles;
		var mapViewWidth = this.map.viewWidthInTiles;
		var mapViewHeight = this.map.viewHeightInTiles;

		// if this is the first frame drawn then we need to draw everything
		if( isNaN( this._prev_x ) )
		{
			// clear canvas
			this.context.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );
			this.backContext.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );

			// have to draw all the tiles...
			xoffs = 0; yoffs = 0;
			for( j = 0; j <= mapViewHeight; j++, ty++ )
			{
				if( ty < 0 || ty > mapHeight )
					continue;
				for( i = 0, tx = orig_tx; i <= mapViewWidth; i++, tx++ )
				{
					if( tx < 0 || tx > mapWidth )
						continue;
					tile = this.data[ty * mapWidth + tx];
					// '0' tiles in Tiled are *empty*
					if( tile )
					{
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex( tile );
						tile -= tileset.start;
						tile_y = 0 | (tile / tileset.widthInTiles);
						tile_x = tile - (tile_y * tileset.widthInTiles);
						// draw this tile to the canvas
						this.backContext.drawImage( 
							tileset.tiles,	// source image
							tile_x * tw,	// source x 
							tile_y * th,	// source y
							tw,				// source width
							th,				// source height
							xoffs,			// dest x 
							yoffs,			// dest y
							tw,				// dest width
							th				// dest height
						);
					}
					xoffs += tw;
				}
				xoffs = 0;
				yoffs += th;
			}
			xoffs = orig_xoffs;
			yoffs = orig_yoffs;
			// ...and copy to the front canvas
			this.context.drawImage( this.backCanvas, 0, 0 );
		}
		// if we are *not* within the same tile as last frame
		else if( tx !== this._prev_tx || ty !== this._prev_ty )
		{
			// clear canvas
			this.context.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );

			// determine the amount of overlap the last frame had with this
			// frame (deltas)
			var dtx = tx - this._prev_tx;
			var dty = ty - this._prev_ty;
			var dx = dtx * tw;
			var dy = dty * th;

			// source & destination x/y
			var srcx, srcy;
			var dstx, dsty;
			// width & height
			var w;
			var h;
			if( dx < 0 )
			{
				srcx = 0;
				dstx = -dx;
				w = this.canvasWidth + dx;
			}
			else
			{
				srcx = dx;
				dstx = 0;
				w = this.canvasWidth - dx;
			}
			if( dy < 0 )
			{
				srcy = 0;
				dsty = -dy;
				h = this.canvasHeight + dy;
			}
			else
			{
				srcy = dy;
				dsty = 0;
				h = this.canvasHeight - dy;
			}

			// copy that overlapping region from the back to the front
			this.context.drawImage(
				this.backCanvas,
				srcx,
				srcy,
				w,
				h,
				dstx,
				dsty,
				w,
				h
			);


			// draw the 'missing' rows/columns
			var startcol, endcol, startrow, endrow;
			// if dx < 0 we're missing cols at left
			if( dx < 0 )
			{
				startcol = 0;
				endcol = -dtx;
			}
			// if dx > 0 we're missing cols at right
			else
			{
				startcol = mapViewWidth + 1 - Math.abs(dtx);
				endcol = mapViewWidth + 1;
			}
			// if dy < 0 we're missing rows at top
			if( dy < 0 )
			{
				startrow = 0;
				endrow = -dty;
			}
			// if dy > 0 we're missing rows at bottom
			else
			{
				startrow = mapViewHeight + 1 - dty;
				endrow = mapViewHeight + 1;
			}

			var row, col;
			var numrows = endrow - startrow;
			var numcols = endcol - startcol;

			// rows
			for( row = startrow, ty = orig_ty + startrow; row < endrow; row++, ty++ )
			{
				// calculate start & end cols such that we don't re-draw
				// the 'corner' where rows & cols overlap
				var start, end;
				if( dx < 0 )
				{
					start = numcols;
					end = mapViewWidth + 1;
				}
				else
				{
					start = 0;
					end = mapViewWidth + 1 - numcols;
				}
				for( col = start, tx = orig_tx + numcols; col < end; col++, tx++ )
				{
					tile = this.data[ty * mapWidth + tx];
					// '0' tiles in Tiled are *empty*
					if( tile )
					{
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex( tile );
						tile -= tileset.start;
						tile_y = 0 | (tile / tileset.widthInTiles);
						tile_x = tile - (tile_y * tileset.widthInTiles);

						yoffs = row * th;
						xoffs = col * tw;
						// draw this tile to the canvas
						this.context.drawImage( 
							tileset.tiles,	// source image
							tile_x * tw,	// source x 
							tile_y *th,		// source y
							tw,				// source width
							th,				// source height
							xoffs,			// dest x 
							yoffs,			// dest y
							tw,				// dest width
							th				// dest height
						);
					}
				}
			}
			// columns
			for( col = startcol, tx = orig_tx + startcol; col < endcol; col++, tx++ )
			{
				for( row = 0, ty = orig_ty; row <= mapViewHeight; row++, ty++ )
				{
					tile = this.data[ty * mapWidth + tx];
					// '0' tiles in Tiled are *empty*
					if( tile )
					{
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex( tile );
						tile -= tileset.start;
						tile_y = 0 | (tile / tileset.widthInTiles);
						tile_x = tile - (tile_y * tileset.widthInTiles);

						yoffs = row * th;
						xoffs = col * tw;
						// draw this tile to the canvas
						this.context.drawImage( 
							tileset.tiles,	// source image
							tile_x * tw,	// source x 
							tile_y *th,		// source y
							tw,				// source width
							th,				// source height
							xoffs,			// dest x 
							yoffs,			// dest y
							tw,				// dest width
							th				// dest height
						);
					}
				}
			}

			// clear back canvas
			this.backContext.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );
			// then copy that back to the back canvas 
			this.backContext.drawImage( this.canvas, 0, 0 );
		}
		// otherwise the canvas already contains the necessary area 

		// front canvas now has the correct stuff on it

		// next frame
		this._prev_tx = orig_tx;
		this._prev_ty = orig_ty;
		this._prev_x = x;

		// TODO: bleh...
		// this works in PIXI 1.3:
//		if( PIXI.gl )
//			PIXI.texturesToUpdate.push( this.baseTexture );
		// but texturesToUpdate isn't actually updated in 1.4,
		// so we have to update it ourselves:
		if( PIXI.defaultRenderer.renderSession.gl )
			PIXI.updateWebGLTexture( this.baseTexture, PIXI.defaultRenderer.renderSession.gl );

		this.sprite.position.x = 0 | (viewx - this.map.viewWidth/2);
		this.sprite.position.y = 0 | (viewy - this.map.viewHeight/2);
	};

	z2.TileLayer.prototype.renderPixiSpr = function( viewx, viewy )
	{
		this.doc.visible = this.visible;
		if( !this.visible )
			return;

		// TODO: dirty checks - don't draw if not dirty

		// view.x/y is the *center* not upper left
		var x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		var tx = 0 | (x / this.map.tileWidth);
		var ty = 0 | (y / this.map.tileHeight);

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var i, j;

		// set the frame for each tile sprite
		for( i = 0; i <= this.map.viewHeightInTiles; i++, ty++ )
		{
			for( j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++ )
			{
				if( ty > this.map.heightInTiles ||
					tx > this.map.widthInTiles )
				{
					this.tileSprites[i][j].visible = false;
					continue;
				}
				tile = this.data[ty * this.map.widthInTiles + tx];
				// '0' tiles in Tiled are *empty*
				if( tile )
				{
					this.tileSprites[i][j].visible = true;
					// TODO: support multiple tilesets
					// get the actual tile index in the tileset
//						tileset = this.map.getTilesetForIndex( tile );
					tileset = this.map.tilesets[0];
//						tile -= tileset.start;
					tile--;
					tile_y = 0 | (tile / tileset.widthInTiles);
					tile_x = tile - (tile_y * tileset.widthInTiles);

					var frame = this.tileSprites[i][j].texture.frame;
					frame.x = tile_x * this.map.tileWidth;
					frame.y = tile_y * this.map.tileHeight;
					frame.width = this.map.tileWidth;
					frame.height = this.map.tileHeight;
					this.tileSprites[i][j].texture.setFrame( frame );
				}
				else
				{
					this.tileSprites[i][j].visible = false;
				}
			}
		}

		// set the DOC position
		var px = -(x - (orig_tx * this.map.tileWidth));
		var py = -(y - (orig_ty * this.map.tileHeight));
		this.doc.position.x = 0 | (viewx - this.map.viewWidth/2)+px;
		this.doc.position.y = 0 | (viewy - this.map.viewHeight/2)+py;
	};

	z2.TileLayer.prototype.renderPixiSprOpt = function( viewx, viewy )
	{
		this.doc.visible = this.visible;
		if( !this.visible )
			return;

		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		var tw = this.map.tileWidth;
		var th = this.map.tileHeight;

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map

		// view.x/y is the *center* not upper left
		var x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = 0 | (x / tw);
		ty = 0 | (y / th);

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var i, j;

		// TODO: support more than one tileset
		tileset = this.map.tilesets[0];

		// do we need to set all the tile's u/v values?
		if( tx !== this._prev_tx || ty !== this._prev_ty )
		{
			var mapWidth = this.map.widthInTiles;
			var mapHeight = this.map.heightInTiles;

			// set the frame for each tile sprite
			for( i = 0; i <= this.map.viewHeightInTiles; i++, ty++ )
			{
				for( j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++ )
				{
					var tileSprite = this.tileSprites[i][j];
					// if this tile is out-of-world-bounds,
					// don't draw it
					if( ty < 0 || ty > mapHeight ||
						tx < 0 || tx > mapWidth )
					{
						tileSprite.visible = false;
						continue;
					}
					tile = this.data[ty * mapWidth + tx];
					// '0' tiles in Tiled are *empty*
					if( tile )
					{
						tileSprite.visible = true;
						// TODO: support more than one tileset
						// (this means swapping textures)
//						tileset = this.map.getTilesetForIndex( tile );
//						tile -= tileset.start;
						tile--;

						tile_y = 0 | (tile / tileset.widthInTiles);
						tile_x = tile - (tile_y * tileset.widthInTiles);

						var frame = tileSprite.texture.frame;
						frame.x = tile_x * tw;
						frame.y = tile_y * th;
						tileSprite.texture.setFrame( frame );
					}
					else
					{
						tileSprite.visible = false;
					}
				}
			}
		}

		// next frame
		this._prev_tx = orig_tx;
		this._prev_ty = orig_ty;

		// set the DOC position
		var px = -(x - (orig_tx * tw));
		var py = -(y - (orig_ty * th));
		this.doc.position.x = 0 | (viewx - this.map.viewWidth/2)+px;
		this.doc.position.y = 0 | (viewy - this.map.viewHeight/2)+py;
	};

	// "brute force" renderer - one sprite for each tile in each layer, mark
	// offscreen tiles 'visible=false' & set parent transform for view (camera)
	z2.TileLayer.prototype.renderPixiAllSpr = function( viewx, viewy )
	{
		// TODO: use previous tile x/y to only set visible flags of the tiles
		// that have scrolled on/off of the screen

		this.doc.visible = this.visible;
		if( !this.visible )
			return;

		var tx, ty;		// tile positions in the data map

		// view.x/y is the *center* not upper left
		var x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = 0 | (x / this.map.tileWidth);
		ty = 0 | (y / this.map.tileHeight);
		var txend = tx + this.map.viewWidthInTiles;
		var tyend = ty + this.map.viewHeightInTiles;

		// do we need to set all the tile's u/v values?
		if( tx !== this._prev_tx || ty !== this._prev_ty )
		{
			// set the visibility of all the tile sprites
			for( var count = 0; count < this.tileSprites.length; count++ )
			{
				var spr = this.tileSprites[count];
				if( spr )
				{
					var i = spr.i;
					var j = spr.j;
					// if the sprite is on-screen
					if( j >= tx && j <= txend &&
						i >= ty && i <= tyend )
						spr.visible = true;
					else
						spr.visible = false;
				}
			}
		}
		
		// move the doc (group) to viewx, viewy
		// (truncate positions down to 32 bit integer)
		var vx = viewx - this.map.viewWidth/2;
		var vy = viewy - this.map.viewHeight/2;
		this.doc.position.x = 0 | (vx - (vx * this.scrollFactorX));
		this.doc.position.y = 0 | (vy - (vy * this.scrollFactorY));
	};

	/** Render the tilemap layer to its canvas
	 * @method z2.TileLayer#render
	 * @arg {Number} viewx The x-coordinate that the view is centered on
	 * @arg {Number} viewy The y-coordinate that the view is centered on
	 */
//	if( render_method === RENDER_SIMPLE )
//		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasNaive;
//	else if( render_method === RENDER_OPT_PAGES )
//		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasOpt;
//	else if( render_method === RENDER_PIXI_SPR )
//		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiSpr;
//	else if( render_method === RENDER_OPT_PIXI_SPR )
//		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiSprOpt;
//	else if( render_method === RENDER_PIXI_ALL_SPR )
//		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiAllSpr;


	/** Tile map image layer class
	 * @class z2.ImageLayer
	 * @constructor
	 * @arg {z2.TileMap} map The tile map
	 * @arg {Object} lyr The object for the layer - as read from the Tiled json
	 */
	z2.ImageLayer = function( map, lyr )
	{
		// reference to the TileMap that contains the layer
		this.map = map;

		// get the image asset
		var img = z2.loader.getAsset( lyr.name );

		this.visible = lyr.visible;

		// Pixi stuff
		this.baseTexture = new PIXI.BaseTexture( img );
		this.texture = new PIXI.Texture( this.baseTexture );
		this.sprite = new PIXI.Sprite( this.texture );
		
		// size of main layer, in pixels
		var w = map.worldWidth;
		var h = map.worldHeight;

		// size of the background layer, in pixels
		var camera_max_x = w - map.view.width;
		var camera_max_y = h - map.view.height;

		// set scroll factor based on scale (sizes):
		if( camera_max_x !== 0 )
			this.scrollFactorX = (img.width - map.view.width) / camera_max_x;
		if( camera_max_y !== 0 )
			this.scrollFactorY = (img.height - map.view.height) / camera_max_y;

		// add the sprite to Pixi
		map.view.add( this.sprite );
	};

	z2.ImageLayer.prototype.render = function( viewx, viewy )
	{
		this.sprite.visible = this.visible;

		// view.x/y is the *center* not upper left
		var vx = viewx - this.map.viewWidth/2;
		var vy = viewy - this.map.viewHeight/2;

		// move the sprite to viewx, viewy
		// (truncate positions down to 32 bit integer)
		this.sprite.position.x = 0 | (vx - (vx * this.scrollFactorX));
		this.sprite.position.y = 0 | (vy - (vy * this.scrollFactorY));
	};

	/////////////////////////////////////////////////////////////////////////
	// function to create objects for a Tiled object layer
	function createObjects( layer )
	{
		var objects = [];
		// create an entity for each object
		for( var i = 0; i < layer.objects.length; i++ )
		{
			var obj = layer.objects[i];

			var factory = z2[obj.type];
			if( !factory )
			{
				console.log( "No factory method found for object type: " + obj.type );
				continue;
			}
			objects.push( factory( obj ) );
		}
		return objects;
	}


	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////

	/** Component Factory for tile map layer */
	z2.tileLayerFactory = z2.createComponentFactory( {layer: null} );

	/** Component Factory for image layers */
	z2.imageLayerFactory = z2.createComponentFactory( {layer: null} );

	/** Component Factory for collision map */
	z2.collisionMapFactory = z2.createComponentFactory( {map: null, data: null} );

};
