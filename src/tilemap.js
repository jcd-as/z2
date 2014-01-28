// tilemap.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d tilemapped games
//
// TODO:
// - change the way in which the Layer Entites are added to the mgr, so
// that sprites can appear *between* layers (OR add support for loading sprites
// from Tiled object layers and load/create/add them at the same time as the Layers)
// - broad-phase tilemap collision detection (sprite vs tile layer)
// - optimize 
// - can we separate the need for the view from the map? (this would allow
// the same map to (conceptually anyway) have different views. e.g. a main view
// and a 'minimap' view
// - BUG (?): because out-of-bounds tiles aren't cleared, you can get garbage
// on-screen if you have a layer that *does* scroll out of bounds (like a
// parallax foreground layer that moves much faster than the 'main' layer).
// probably the layer should just STOP moving when the view gets out of its
// bounds (i.e. just 'stick' at the edge)
// -


zSquared.tilemap = function( z2 )
{
	"use strict";

	z2.require( ["ecs", "loader"] );

	// different ways to render the tile maps
	var RENDER_SIMPLE = 0;
	var RENDER_OPT_PAGES = 1;
	var RENDER_PIXI_SPR = 2;
	var RENDER_OPT_PIXI_SPR = 3;
	var RENDER_PIXI_ALL_SPR = 4;
	var render_method = RENDER_PIXI_ALL_SPR;
//	var render_method = RENDER_OPT_PIXI_SPR;
//	var render_method = RENDER_PIXI_SPR;
//	var render_method = RENDER_OPT_PAGES;
//	var render_method = RENDER_SIMPLE;

	/** Tile map class
	 * @class z2.TileMap
	 * @constructor
	 * @arg {z2.View} view The view 
	 */
	z2.TileMap = function( view )
	{
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
				// TODO: cleaner way to do this:
//				this.view.doc.addChild( l.sprite );
//				this.view.scene.stage.addChild( l.sprite );
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

	/** Start the scene running
	 * @method z2.TileMap#start
	 * @arg {z2.Manager} mgr The ECS Manager object
	 */
	z2.TileMap.prototype.start = function( mgr )
	{
		if( render_method !== RENDER_PIXI_ALL_SPR )
		{
			// add the layers' sprites to the stage
			for( var i = 0; i < this.layers.length; i++ )
				this.view.scene.stage.addChild( this.layers[i].sprite );
		}

		// create Entities for the TileLayers
		for( i = 0; i < this.layers.length; i++ )
		{
			var tlc = z2.tileLayerFactory.create( {layer: this.layers[i]} );
			var tle = mgr.createEntity( [z2.renderableFactory, tlc] );
			this.layerEntities.push( tle );
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
	z2.TileLayer = function( map )
	{
		// reference to the TileMap that contains the layer
		this.map = map;

		if( render_method == RENDER_SIMPLE )
		{
			// create a canvas for this layer to be drawn on
			this.canvasWidth = map.viewWidth;
			this.canvasHeight = map.viewHeight;
			this.canvas = z2.createCanvas( this.canvasWidth, this.canvasHeight );
			this.context = this.canvas.getContext( '2d' );
		}
		else if( render_method == RENDER_OPT_PAGES )
		{
			// create two canvases for this layer to be drawn on
			this.canvasWidth = map.viewWidth + map.tileWidth;
			this.canvasHeight = map.viewHeight + map.tileHeight;

			this.canvas = z2.createCanvas( this.canvasWidth, this.canvasHeight );
			this.context = this.canvas.getContext( '2d' );

			this.backCanvas = z2.createCanvas( this.canvasWidth, this.canvasHeight );
			this.backContext = this.backCanvas.getContext( '2d' );

			// vars for tracking the previous frame position
			this._prev_x = NaN;
			this._prev_tx = NaN;
			this._prev_ty = NaN;
		}
//		else if( render_method == RENDER_PIXI_SPR )
		else if( render_method == RENDER_PIXI_SPR || render_method == RENDER_OPT_PIXI_SPR )
		{
			this.canvasWidth = map.viewWidth + map.tileWidth;
			this.canvasHeight = map.viewHeight + map.tileHeight;
			this.frame = new PIXI.Rectangle( 0, 0, this.canvasWidth, this.canvasHeight );
			// TODO: support more than one tileset
			this.tileTexture = new PIXI.BaseTexture( map.tilesets[0].tiles );
			this.doc = new PIXI.DisplayObjectContainer();

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
			this.renderTexture = new PIXI.RenderTexture( this.canvasWidth, this.canvasHeight );
			this.renderTexture.setFrame( this.frame );
			this.sprite = new PIXI.Sprite( this.renderTexture );
			map.view.scene.stage.addChild( this.sprite );

			this._prevTx = -1;
			this._prevTy = 0;
		}
		else if( render_method == RENDER_PIXI_ALL_SPR )
		{
			this.canvasWidth = map.viewWidth;
			this.canvasHeight = map.viewHeight;
			this.frame = new PIXI.Rectangle( 0, 0, this.canvasWidth, this.canvasHeight );

			// TODO: support more than one tileset
			this.tileTexture = new PIXI.BaseTexture( map.tilesets[0].tiles );
			this.doc = new PIXI.DisplayObjectContainer();

			this.tileSprites = [];

			map.view.scene.stage.addChild( this.doc );
		}

		// the factor by which the movement (scrolling) of this layer differs
		// from the "main" map. e.g. '2' would be twice as fast, '0.5' would be
		// half as fast
		this.scrollFactorX = 1;
		this.scrollFactorY = 1;

		// PIXI stuff
		if( render_method == RENDER_SIMPLE || render_method == RENDER_OPT_PAGES )
		{	
			this.baseTexture = new PIXI.BaseTexture( this.canvas );
			this.frame = new PIXI.Rectangle( 0, 0, this.canvas.width, this.canvas.height );
			this.texture = new PIXI.Texture( this.baseTexture );
			this.sprite = new PIXI.Sprite( this.texture );
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
		this.data = lyr.data;
		if( lyr.properties )
		{
			this.scrollFactorX = lyr.properties.scrollFactorX ? +lyr.properties.scrollFactorX : 1;
			this.scrollFactorY = lyr.properties.scrollFactorY ? +lyr.properties.scrollFactorY : 1;
		}
		if( render_method === RENDER_PIXI_ALL_SPR )
		{
			// TODO: support more than one tileset
			var tileset = this.map.tilesets[0];
			// create & set-up all the tile sprites
			for( var i = 0; i <= this.map.heightInTiles; i++ )
			{
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
						var tile_y = ~~(tile / tileset.widthInTiles);
						var tile_x = tile - (tile_y * tileset.widthInTiles);
						texture.frame.x = tile_x * this.map.tileWidth;
						texture.frame.y = tile_y * this.map.tileHeight;
						texture.frame.width = this.map.tileWidth;
						texture.frame.height = this.map.tileHeight;

						this.tileSprites.push( spr );
						this.doc.addChild( spr );
					}
				}
			}
		}
	};

	z2.TileLayer.prototype.renderCanvasNaive = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		// TODO: clamp x,y to the layer/map bounds
		var x = ~~(viewx - this.map.viewWidth/2)*this.scrollFactorX;
		var y = ~~(viewy - this.map.viewHeight/2)*this.scrollFactorY;
		tx = ~~(x / this.map.tileWidth);
		ty = ~~(y / this.map.tileHeight);
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

		// TODO: bleh...
		// this works in PIXI 1.3:
//		if( PIXI.gl )
//			PIXI.texturesToUpdate.push( this.baseTexture );
		// but texturesToUpdate isn't actually updated in 1.4,
		// so we have to update it ourselves:
		if( PIXI.defaultRenderer.renderSession.gl )
			PIXI.updateWebGLTexture( this.baseTexture, PIXI.defaultRenderer.renderSession.gl );
	};

	z2.TileLayer.prototype.renderCanvasOpt = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		var tw = this.map.tileWidth;
		var th = this.map.tileHeight;

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		var x = ~~((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = ~~((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = ~~(x / tw);
		ty = ~~(y / th);
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
						tile_y = ~~(tile / tileset.widthInTiles);
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
						tile_y = ~~(tile / tileset.widthInTiles);
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
						tile_y = ~~(tile / tileset.widthInTiles);
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
//			else { }

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
	};

	z2.TileLayer.prototype.renderPixiRT = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty

		// view.x/y is the *center* not upper left
		var x = ~~((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = ~~((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		var tx = ~~(x / this.map.tileWidth);
		var ty = ~~(y / this.map.tileHeight);

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var i, j;

		// set the frame for each tile sprite
		for( i = 0; i <= this.map.viewHeightInTiles; i++, ty++ )
		{
			if( ty > this.map.heightInTiles )
			{
				this.tileSprites[i][0].visible = false;
				continue;
			}
			for( j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++ )
			{
				if( tx > this.map.widthInTiles )
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
					tile_y = ~~(tile / tileset.widthInTiles);
//					tile_y = Math.floor(tile / tileset.widthInTiles);
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

		// render the tile sprites' doc to the render texture
		// (clearing the render texture first)
//		var px = -(x - (orig_tx * this.map.tileWidth));
//		var py = -(y - (orig_ty * this.map.tileHeight));
//		this.renderTexture.render( this.doc, {x:px,y:py}, true );
		this.sprite.position.x = -(x - (orig_tx * this.map.tileWidth));
		this.sprite.position.y = -(y - (orig_ty * this.map.tileHeight));
		this.renderTexture.render( this.doc, null, true );
	};

	z2.TileLayer.prototype.renderPixiRTOpt = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		var tw = this.map.tileWidth;
		var th = this.map.tileHeight;

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map

		// view.x/y is the *center* not upper left
		var x = ~~((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = ~~((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = ~~(x / tw);
		ty = ~~(y / th);

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		var tileset, tile, tile_x, tile_y;
		var orig_tx = tx;
		var orig_ty = ty;
		var i, j;

		// TODO: support more than one tileset
		tileset = this.map.tilesets[0];

		var mapWidth = this.map.widthInTiles;
		var mapHeight = this.map.heightInTiles;

		// do we need to set all the tile's u/v values?
		if( tx !== this._prev_tx || ty !== this._prev_ty )
		{
			// set the frame for each tile sprite
			for( i = 0; i <= this.map.viewHeightInTiles; i++, ty++ )
			{
				if( ty < 0 || ty > mapHeight )
					continue;
				for( j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++ )
				{
					var tileSprite = this.tileSprites[i][j];
					if( tx < 0 || tx > mapWidth )
						continue;
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

						tile_y = ~~(tile / tileset.widthInTiles);
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
		// TODO: is there any optimization we can make here for the
		// RenderTexture technique ???
		// if we are *not* within the same tile as last frame
//		else if( tx !== this._prev_tx || ty !== this._prev_ty )
//		{
//		}
		// otherwise the canvas already contains the necessary area 
//			else { }

		// next frame
		this._prev_tx = orig_tx;
		this._prev_ty = orig_ty;

		// set the offset into the render texture
//		var px = -(x - (orig_tx * this.map.tileWidth));
//		var py = -(y - (orig_ty * this.map.tileHeight));
//		this.renderTexture.render( this.doc, {x:px,y:py}, true );
		this.sprite.position.x = -(x - (orig_tx * this.map.tileWidth));
		this.sprite.position.y = -(y - (orig_ty * this.map.tileHeight));
		this.renderTexture.render( this.doc, null, true );
	};

	z2.TileLayer.prototype.renderPixiSpr = function( viewx, viewy )
	{
		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map

		// view.x/y is the *center* not upper left
		var x = ~~((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = ~~((viewy - this.map.viewHeight/2)*this.scrollFactorY);
		tx = ~~(x / this.map.tileWidth);
		ty = ~~(y / this.map.tileHeight);
		var txend = tx + this.map.viewWidthInTiles;
		var tyend = ty + this.map.viewHeightInTiles;

		// set the visibility of all the tile sprites
		for( var count = 0; count < this.tileSprites.length; count++ )
		{
			var spr = this.tileSprites[count];
			var i = spr.i;
			var j = spr.j;
			// if the sprite is on-screen
			if( j >= tx && j <= txend &&
				i >= ty && i <= tyend )
				spr.visible = true;
			else
				spr.visible = false;
		}
		
		// move the doc (group) to viewx, viewy
		this.doc.position.x = -viewx + this.map.viewWidth/2;
		this.doc.position.y = -viewy + this.map.viewHeight/2;
	};

	/** Render the tilemap to its canvas
	 * @method z2.TileLayer#render
	 * @arg {Number} viewx The x-coordinate that the view is centered on
	 * @arg {Number} viewy The y-coordinate that the view is centered on
	 */
	if( render_method === RENDER_SIMPLE )
		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasNaive;
	else if( render_method === RENDER_OPT_PAGES )
		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderCanvasOpt;
	else if( render_method === RENDER_PIXI_SPR )
		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiRT;
	else if( render_method === RENDER_OPT_PIXI_SPR )
		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiRTOpt;
	else if( render_method === RENDER_PIXI_ALL_SPR )
		z2.TileLayer.prototype.render = z2.TileLayer.prototype.renderPixiSpr;

	/////////////////////////////////////////////////////////////////////////
	// Component factories
	/////////////////////////////////////////////////////////////////////////

	/** Component Factory for tile map layer */
	z2.tileLayerFactory = z2.createComponentFactory( {layer: null} );

	/** Component Factory for collision map */
	z2.collisionMapFactory = z2.createComponentFactory( {map: null, data: null} );

};
