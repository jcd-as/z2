// tilemap.js
// Copyright 2013 Joshua C Shepard
// Components and Systems for 2d tilemapped games
//
// TODO:
// - implement optimized RenderTexture tile layer rendering technique using the
// same 'paged' algorithm as RENDER_OPT_PAGES, but with renderTextures instead
// of canvases
// - TileLayers need to be rendered by the same rendering System as Sprites, so
// that sprites can appear *between* layers
// - broad-phase tilemap collision detection (sprite vs tile layer)
// - optimize 
// - can we separate the need for the view from the map? (this would allow
// the same map to (conceptually anyway) have different views. e.g. a main view
// and a 'minimap' view
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
	var render_method = RENDER_OPT_PIXI_SPR;
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

	z2.TileMap.prototype.start = function()
	{
		for( var i = 0; i < this.layers.length; i++ )
			this.view.scene.stage.addChild( this.layers[i].sprite );
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
			this._prev_y = NaN;
			this._prev_tx = NaN;
			this._prev_ty = NaN;
		}
		else if( render_method == RENDER_PIXI_SPR )
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

		// the factor by which the movement (scrolling) of this layer differs
		// from the "main" map. e.g. '2' would be twice as fast, '0.5' would be
		// half as fast
		this.scrollFactorX = 1;
		this.scrollFactorY = 1;

		// PIXI stuff
		if( render_method !== RENDER_PIXI_SPR )
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
	};

	z2.TileLayer.prototype.renderCanvasNaive = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty
		// TODO: track previous (view) coordinates and only update the necessary
		// areas of the canvas (i.e. if we have just move a bit to the left we
		// can copy the bulk of the image over and only draw a single column of
		// new tiles)

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
		if( PIXI.gl )
        PIXI.texturesToUpdate.push( this.baseTexture );
		// but texturesToUpdate isn't actually updated in 1.4,
		// so we have to update it ourselves:
//			PIXI.updateWebGLTexture( this.baseTexture, PIXI.defaultRenderer.renderSession.gl );
	};

	z2.TileLayer.prototype.renderCanvasOpt = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty
		// TODO: track previous (view) coordinates and only update the necessary
		// areas of the canvas (i.e. if we have just move a bit to the left we
		// can copy the bulk of the image over and only draw a single column of
		// new tiles)

		// cache some vars for performance
		var tw = this.map.tileWidth;
		var th = this.map.tileHeight;

		// draw the tiles onto the canvas
		var tx, ty;		// tile positions in the data map
		var xoffs, yoffs;	// offset from the tile positions

		// view.x/y is the *center* not upper left
		// TODO: clamp x,y to the layer/map bounds
//		var x = ~~(viewx - this.map.viewWidth/2)*this.scrollFactorX;
//		var y = ~~(viewy - this.map.viewHeight/2)*this.scrollFactorY;
		var x = (viewx - this.map.viewWidth/2)*this.scrollFactorX;
		var y = (viewy - this.map.viewHeight/2)*this.scrollFactorY;
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

		// if this is the first frame drawn then we need to draw everything
		if( isNaN( this._prev_x ) )
		{
			// clear canvas
			this.context.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );

			// have to draw all the tiles...
			xoffs = 0; yoffs = 0;
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
				endcol = Math.abs(dtx);
			}
			// if dx > 0 we're missing cols at right
			else
			{
				startcol = this.map.viewWidthInTiles + 1 - Math.abs(dtx);
				endcol = this.map.viewWidthInTiles + 1;
			}
			// if dy < 0 we're missing rows at top
			if( dy < 0 )
			{
				startrow = 0;
				endrow = Math.abs(dty);
			}
			// if dy > 0 we're missing rows at bottom
			else
			{
				startrow = this.map.viewHeightInTiles + 1 - Math.abs(dty);
				endrow = this.map.viewHeightInTiles + 1;
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
					end = this.map.viewWidthInTiles + 1;
				}
				else
				{
					start = 0;
					end = this.map.viewWidthInTiles + 1 - numcols;
				}
				for( col = start, tx = orig_tx + numcols; col < end; col++, tx++ )
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
				for( row = 0, ty = orig_ty; row <= this.map.viewHeightInTiles; row++, ty++ )
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
		this._prev_y = y;

		// TODO: bleh...
		// this works in PIXI 1.3:
		if( PIXI.gl )
			PIXI.texturesToUpdate.push( this.baseTexture );
		// but texturesToUpdate isn't actually updated in 1.4,
		// so we have to update it ourselves:
//		if( PIXI.defaultRenderer.renderSession.gl )
//			PIXI.updateWebGLTexture( this.baseTexture, PIXI.defaultRenderer.renderSession.gl );
	};

	z2.TileLayer.prototype.renderPixiRT = function( viewx, viewy )
	{
		// TODO: dirty checks - don't draw if not dirty
		// TODO: track previous (view) coordinates and only update the necessary
		// areas of the canvas (i.e. if we have just move a bit to the left we
		// can copy the bulk of the image over and only draw a single column of
		// new tiles)

		// view.x/y is the *center* not upper left
		// TODO: clamp x,y to the layer/map bounds
		var x = ~~((viewx - this.map.viewWidth/2)*this.scrollFactorX);
		var y = ~~((viewy - this.map.viewHeight/2)*this.scrollFactorY);
//		var x = (viewx - this.map.viewWidth/2)*this.scrollFactorX;
//		var y = (viewy - this.map.viewHeight/2)*this.scrollFactorY;
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
//		this.sprite.position.x = -(x - (orig_tx * this.map.tileWidth));
//		this.sprite.position.y = -(y - (orig_ty * this.map.tileHeight));
		var px = -(x - (orig_tx * this.map.tileWidth));
		var py = -(y - (orig_ty * this.map.tileHeight));

		// render the tile sprites' doc to the render texture
		// (clearing the render texture first)
//		this.renderTexture.render( this.doc, null, true );
		this.renderTexture.render( this.doc, {x:px,y:py}, true );
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
//				context.setTransform( 1, 0, 0, 1, 0, 0 );
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
//					context.drawImage( tmc.layers[i].canvas, 0, 0 );
				}
			},
//			onEnd: function()
//			{
//			}
		} );
	};

};
