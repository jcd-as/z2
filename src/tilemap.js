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

/** Tile map module.
 * @module
 */

import zSquared from './z2.js'
import * as ecs from './ecs.js'
import loader from './loader.js'
import device from './device.js'
import * as collision from './collision.js'
import * as _2d from './2d-pixi.js'


// different ways to render the tile maps:
// 'naive' renderer, draws all on-screen tiles on a Canvas each frame
export const RENDER_SIMPLE = 0
// optimized version of above, uses two canvases, only redraws tiles that
// have scrolled onto the screen since last frame, copies the rest of the
// screen
export const RENDER_OPT_PAGES = 1
// renders using a Pixi sprite for each tile that is on-screen, collected in
// a Pixi Container which is drawn at the appropriate offset
export const RENDER_PIXI_SPR = 2
// optimized version of above, only resets all the tile frames when we've
// scrolled out of tile bounds
export const RENDER_OPT_PIXI_SPR = 3
// 'brute force' WebGL method: one Pixi Sprite per tile in the entire world
// (not just the screen), set visible flag on them if they are on-screen
export const RENDER_PIXI_ALL_SPR = 4

let render_method

/** Renderer constants.
 * @namespace */
export const renderers =
{
	/** @name module:tilemap.renderers#RENDER_SIMPLE */
	RENDER_SIMPLE : RENDER_SIMPLE,
	/** @name module:tilemap.renderers#RENDER_OPT_PAGES */
	RENDER_OPT_PAGES : RENDER_OPT_PAGES,
	/** @name module:tilemap.renderers#RENDER_PIXI_SPR */
	RENDER_PIXI_SPR : RENDER_PIXI_SPR,
	/** @name module:tilemap.renderers#RENDER_OPT_PIXI_SPR */
	RENDER_OPT_PIXI_SPR : RENDER_OPT_PIXI_SPR,
	/** @name module:tilemap.renderers#RENDER_PIXI_ALL_SPR */
	RENDER_PIXI_ALL_SPR : RENDER_PIXI_ALL_SPR
}

/** Set the rendering method. */
export function setRenderMethod(rm)
{
	render_method = rm
}

// helper method to convert the .properties object on a Tiled object
// (map, layer, tileset)
// returns the new, converted properties object
function _readProperties(props)
{
	// only convert on the first read
	if(!Array.isArray(props))
		return props

	const p = {}
	if(props) {
		for(let prop of props) {
			// prop should be an object...
			if(typeof(prop) !== 'object')
				throw Error('Custom Tiled property is not a javascript object')
			switch(prop.type) {
				case 'string':
				case 'float':
				case 'int':
				case 'bool':
					p[prop.name] = prop.value
					break
				default:
					console.warn(`Unsupported type '${prop.type}' in Tiled custom property '${prop.name}'`)
			}
		}
	}
	return p
}


/** Tile map class. */
export class TileMap
{
	// tiles image
	tilesets = []

	// tile dimensions
	tileWidth = 0
	tileHeight = 0

	// map size data
	// these, times the tile width/height, must be the same as the scene
	// width & height...
	width = 0
	height = 0
	widthInTiles = 0
	heightInTiles = 0
	viewWidthInTiles = 0
	viewHeightInTiles = 0

	// layer data
	layers = []

	// the 'main' layer, with which the player is seen to interact
	mainLayer = null
	// size of the 'main' layer
	worldWidth = 0
	worldHeight = 0

	// image layers
	imageLayers = []

	// object groups (arrays of objects)
	objectGroups = []

	// collision map
	// array of {solid: true/false, slope: #}
	tileCharacterstics = []
	collisionMap = null
	collisionMapComponent = null

	// Tile layer Entities
	layerEntities = []

	/**
	* @constructor
	* @arg {View} view The view
	*/
	constructor(view)
	{
		// if the render method hasn't been set already,
		// make a best guess
		if(render_method === undefined) {
			if( device.webGL )
				render_method = RENDER_OPT_PIXI_SPR
				//render_method = RENDER_PIXI_ALL_SPR
			else
				render_method = RENDER_OPT_PAGES
		}

		// view dimensions
		// (size for the layers' canvases)
		this.view = view
		this.viewWidth = view.width
		this.viewHeight = view.height
	}

	/** Load a tile map from Tiled object.
	* @arg {Object} map map data from a Tiled json file
	*/
	load(map)
	{
		let i

		// convert map level custom Tiled properties
		map.properties = _readProperties(map.properties)

		// name of the 'main' layer:
		const main_layer = map.properties.main_layer || 'main'

		this.tileWidth = map.tilewidth
		this.tileHeight = map.tileheight
		this.widthInTiles = map.width
		this.heightInTiles = map.height
		this.viewWidthInTiles = this.viewWidth / this.tileWidth
		this.viewHeightInTiles = this.viewHeight / this.tileHeight
		// these, times the tile width/height, must be the same as the scene
		// width & height...
		this.width = map.width * this.tileWidth
		this.height = map.height * this.tileHeight

		if(map.properties && map.properties.width)
			this.worldWidth = +map.properties.width
		else
			this.worldWidth = this.width
		if(map.properties && map.properties.height)
			this.worldHeight = +map.properties.height
		else
			this.worldHeight = this.height

		// load each tileset
		for(i = 0; i < map.tilesets.length; i++) {
			const ts = map.tilesets[i]
			const w = ts.imagewidth / ts.tilewidth
			const h = ts.imageheight / ts.tileheight
			const tileset =
			{
				widthInTiles: w,
				heightInTiles: h,
				tiles: loader.getAsset(ts.name),
				start: ts.firstgid,
				end: ts.firstgid + w * h
			}
			// store the start tile
			this.tilesets.push(tileset)
		}

		// build the list of solid tiles
		// TODO: support multiple tilesets
		this._buildTileCharacteristics(map.tilesets[0])

		let l

		// load each layer
		for(i = 0; i < map.layers.length; i++) {
			const lyr = map.layers[i]
			if(lyr.type == 'tilelayer') {
				// convert the layers properties
				lyr.properties = _readProperties(lyr.properties)
				// create a tile layer
				l = new TileLayer(this)
				l.load(lyr)
				if(lyr.name === main_layer)
					this.mainLayer = l
				l.visible = lyr.visible
				this.layers.push(l)
				// if the layer is solid, create the collision map from it
				if(lyr.properties && lyr.properties.solid) {
					l.solid = true
					this.buildCollisionMap(lyr.data)
				}
			}
			// load image layers
			else if(lyr.type === 'imagelayer') {
				l = new ImageLayer(this, lyr)
				this.imageLayers.push(l)
			}
			// load object layers
			else if(lyr.type === 'objectgroup') {
				this.objectGroups.push(createObjects(lyr))
			}
		}
	}

	_buildTileCharacteristics(tileset)
	{
		// TODO: support multiple tilesets
		for(const tile of tileset.tiles) {
			// convert the tile properties
			tile.properties = _readProperties(tile.properties)

			let solid = false
			let slope = 0
			if(tile.properties.solid) {
				if(tile.properties.solid === 'slopeDownLeft')
					slope = 1
				if(tile.properties.solid === 'slopeDownRight')
					slope = 2
				solid = true
				// TODO: do we care if any other tileproperties are set?
				this.tileCharacterstics[tile.id] = {solid: solid, slope: slope}
			}
		}
	}

	buildCollisionMap(data)
	{
		this.collisionMap = collision.buildCollisionMap(data, this.widthInTiles, this.heightInTiles, this.tileCharacterstics)
	}

	updateObjectCollisionMaps()
	{
		for(let i = 0; i < this.objectGroups.length; i++) {
			let grp = this.objectGroups[i]
			for(let j = 0; j < grp.length; j++) {
				const obj = grp[j]
				const cmc = obj.getComponent(collisionMapFactory)
				if(cmc) {
					cmc.map = this
					cmc.data = this.collisionMap
				}
			}
		}
	}

	/** Start the Entities in this map running. */
	start()
	{
		let i
		let mgr = ecs.manager.get()

		// create Entities for the TileLayers
		for(i = 0; i < this.layers.length; i++) {
			const tlc = tileLayerFactory.create({layer: this.layers[i]})
			const tle = mgr.createEntity([_2d.renderableFactory, tlc])
			this.layerEntities.push(tle)
		}

		// create Entities for the ImageLayers
		for(i = 0; i < this.imageLayers.length; i++) {
			const ilc = imageLayerFactory.create( {layer: this.imageLayers[i]} )
			mgr.createEntity( [_2d.renderableFactory, ilc] )
			// TODO: ??? should 'ile' be added to layerEntities??
		}
	}

	/** Get the tileset for a given tile index.
	* @arg {Number} idx Index of the tile whose tileset we want
	* @returns {Object} The tileset object
	*/
	getTilesetForIndex(idx)
	{
		// TODO: binary search?
		// check each tileset
		for(let i = 0; i < this.tilesets.length; i++) {
			if(idx >= this.tilesets[i].start && idx < this.tilesets[i].end)
				return this.tilesets[i]
		}
		return null
	}
}

/** Tile map layer class. */
export class TileLayer
{
	solid = false

	// the factor by which the movement (scrolling) of this layer differs
	// from the "main" map. e.g. '2' would be twice as fast, '0.5' would be
	// half as fast
	scrollFactorX = 1
	scrollFactorY = 1
	map = null

	// vars for tracking the previous frame position
	#prev_x = NaN
	#prev_tx = NaN
	#prev_ty = NaN

	/**
	* @constructor
	* @arg {TileMap} map The tile map
	*/
	constructor(map)
	{
		// set the render method to the appropriate internal method
		if(render_method === RENDER_SIMPLE)
			TileLayer.prototype.render = TileLayer.prototype.renderCanvasNaive
		else if(render_method === RENDER_OPT_PAGES)
			TileLayer.prototype.render = TileLayer.prototype.renderCanvasOpt
		else if(render_method === RENDER_PIXI_SPR)
			TileLayer.prototype.render = TileLayer.prototype.renderPixiSpr
		else if(render_method === RENDER_OPT_PIXI_SPR)
			TileLayer.prototype.render = TileLayer.prototype.renderPixiSprOpt
		else if(render_method === RENDER_PIXI_ALL_SPR)
			TileLayer.prototype.render = TileLayer.prototype.renderPixiAllSpr

		// reference to the TileMap that contains the layer
		this.map = map

		if(render_method === RENDER_SIMPLE || render_method === RENDER_OPT_PAGES) {
			if(render_method === RENDER_SIMPLE) {
				// create a canvas for this layer to be drawn on
				this.canvasWidth = map.viewWidth
				this.canvasHeight = map.viewHeight
			}
			else if(render_method === RENDER_OPT_PAGES) {
				// create two canvases for this layer to be drawn on
				this.canvasWidth = map.viewWidth + map.tileWidth
				this.canvasHeight = map.viewHeight + map.tileHeight

				this.backCanvas = zSquared.createCanvas(this.canvasWidth, this.canvasHeight)
				this.backContext = this.backCanvas.getContext('2d')
			}
			this.canvas = zSquared.createCanvas(this.canvasWidth, this.canvasHeight)
			this.context = this.canvas.getContext('2d')

			// eslint-disable-next-line no-undef
			this.baseTexture = new PIXI.BaseTexture(this.canvas)
			// eslint-disable-next-line no-undef
			this.frame = new PIXI.Rectangle(0, 0, this.canvasWidth, this.canvasHeight)
			// eslint-disable-next-line no-undef
			this.texture = new PIXI.Texture(this.baseTexture)
			// eslint-disable-next-line no-undef
			this.sprite = new PIXI.Sprite(this.texture)
			map.view.add(this.sprite)
		}
		else if(render_method === RENDER_PIXI_SPR || render_method === RENDER_OPT_PIXI_SPR) {
			this.canvasWidth = map.viewWidth + map.tileWidth
			this.canvasHeight = map.viewHeight + map.tileHeight
			// eslint-disable-next-line no-undef
			this.frame = new PIXI.Rectangle(0, 0, this.canvasWidth, this.canvasHeight)
			// TODO: support more than one tileset
			// eslint-disable-next-line no-undef
			this.tileTexture = new PIXI.BaseTexture(map.tilesets[0].tiles)
			// eslint-disable-next-line no-undef
			this.doc = new PIXI.Container()
//			this.doc = new PIXI.ParticleContainer()

			this.tileSprites = []
			for(let i = 0; i <= map.viewHeightInTiles; i++) {
				this.tileSprites.push([])
				for(let j = 0; j <= map.viewWidthInTiles; j++) {
					// eslint-disable-next-line no-undef
					let texture = new PIXI.Texture(this.tileTexture)
					// eslint-disable-next-line no-undef
					let spr = new PIXI.Sprite(texture)
					spr.position.x = j * map.tileWidth
					spr.position.y = i * map.tileHeight
					texture.frame.width = map.tileWidth
					texture.frame.height = map.tileHeight
					this.tileSprites[i].push(spr)
					this.doc.addChild(spr)
				}
			}
			map.view.add(this.doc)

			this.prevTx = -1
			this.prevTy = 0
		}
		else if(render_method === RENDER_PIXI_ALL_SPR) {
			// vars for tracking the previous frame position
			this.prev_tx = NaN
			this.prev_ty = NaN

			// TODO: we shouldn't be doing this if the layer is not visible...
			this.canvasWidth = map.viewWidth
			this.canvasHeight = map.viewHeight
			// eslint-disable-next-line no-undef
			this.frame = new PIXI.Rectangle(0, 0, this.canvasWidth, this.canvasHeight)

			// TODO: support more than one tileset
			// eslint-disable-next-line no-undef
			this.tileTexture = new PIXI.BaseTexture(map.tilesets[0].tiles)
			// eslint-disable-next-line no-undef
			this.doc = new PIXI.ParticleContainer()

			this.tileSprites = []

			map.view.add(this.doc)
		}
	}

	/** Load a tile layer from Tiled object.
	* @arg {Object} lyr Layer data from a Tiled json file
	*/
	load(lyr)
	{
		// tiles data
		this.data = lyr.data.slice()
		this.name = lyr.name
		if(lyr.properties) {
			this.scrollFactorX = lyr.properties.scrollFactorX ? +lyr.properties.scrollFactorX : 1
			this.scrollFactorY = lyr.properties.scrollFactorY ? +lyr.properties.scrollFactorY : 1
		}
		if(render_method === RENDER_PIXI_ALL_SPR) {
			this.createSpritesForPixiAllSpr()
		}
	}

	createSpritesForPixiAllSpr()
	{
		// TODO: support more than one tileset
		let tileset = this.map.tilesets[0]
		// create & set-up all the tile sprites
		for(let i = 0; i < this.map.heightInTiles; i++) {
			this.tileSprites.push([])
			for(let j = 0; j < this.map.widthInTiles; j++) {
				let tile = this.data[i * this.map.widthInTiles + j]
				// '0' tiles in Tiled are *empty*
				if(tile) {
					tile--
					// eslint-disable-next-line no-undef
					let texture = new PIXI.Texture(this.tileTexture)
					// eslint-disable-next-line no-undef
					let spr = new PIXI.Sprite(texture)
					spr.position.x = j * this.map.tileWidth
					spr.position.y = i * this.map.tileHeight
					spr.i = i
					spr.j = j
					const tile_y = 0 | (tile / tileset.widthInTiles)
					const tile_x = tile - (tile_y * tileset.widthInTiles)
					texture.frame.x = tile_x * this.map.tileWidth
					texture.frame.y = tile_y * this.map.tileHeight
					texture.frame.width = this.map.tileWidth
					texture.frame.height = this.map.tileHeight
					texture.updateUvs()

					this.tileSprites[i][j] = spr
					this.doc.addChild(spr)
				}
			}
		}
	}

	updateSpritesForPixiAllSpr()
	{
		// TODO: support more than one tileset
		const tileset = this.map.tilesets[0]
		// create & set-up all the tile sprites
		for(let i = 0; i <= this.map.heightInTiles; i++) {
			for(let j = 0; j <= this.map.widthInTiles; j++) {
				let tile = this.data[i * this.map.widthInTiles + j]
				let spr = this.tileSprites[i][j]
				// '0' tiles in Tiled are *empty*
				if(tile) {
					// if we have a tile, but no sprite, create a sprite
					if(!spr) {
						// eslint-disable-next-line no-undef
						spr = new PIXI.Sprite(new PIXI.Texture(this.tileTexture))
						this.doc.addChild(spr)
					}
					// otherwise use the existing sprite
					tile--
					let texture = spr.texture
					spr.position.x = j * this.map.tileWidth
					spr.position.y = i * this.map.tileHeight
					spr.i = i
					spr.j = j
					const tile_y = 0 | (tile / tileset.widthInTiles)
					const tile_x = tile - (tile_y * tileset.widthInTiles)
					let frame = texture.frame
					frame.x = tile_x * this.map.tileWidth
					frame.y = tile_y * this.map.tileHeight
					frame.width = this.map.tileWidth
					frame.height = this.map.tileHeight
					texture.frame = frame
					texture.updateUvs()
				}
			}
		}
	}

	/** Force the entire layer to be re-drawn in the next frame. */
	forceDirty()
	{
		switch(render_method) {
			case RENDER_SIMPLE:
				break
			case RENDER_OPT_PAGES:
				// set flag
				this.prev_x = NaN
				break
			case RENDER_PIXI_SPR:
				break
			case RENDER_OPT_PIXI_SPR:
				// set flag
				this.prev_tx = NaN
				break
			case RENDER_PIXI_ALL_SPR:
				// update tile sprites
				this.updateSpritesForPixiAllSpr()
				break
		}
	}

	renderCanvasNaive(viewx, viewy)
	{
		this.sprite.visible = this.visible
		if(!this.visible)
			return

		// TODO: dirty checks - don't draw if not dirty

		// draw the tiles onto the canvas
		let tx, ty		// tile positions in the data map
		let xoffs, yoffs	// offset from the tile positions

		// view.x/y is the *center* not upper left
		// TODO: clamp x,y to the layer/map bounds
		const x = 0 | (viewx - this.map.viewWidth/2)*this.scrollFactorX
		const y = 0 | (viewy - this.map.viewHeight/2)*this.scrollFactorY
		tx = 0 | (x / this.map.tileWidth)
		ty = 0 | (y / this.map.tileHeight)
		xoffs = -(x - (tx * this.map.tileWidth))
		yoffs = -(y - (ty * this.map.tileHeight))

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		let tileset, tile, tile_x, tile_y
		const orig_tx = tx
		const orig_xoffs = xoffs
		let i, j

		// clear canvas
		this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

		for(j = 0; j <= this.map.viewHeightInTiles; j++, ty++) {
			// TODO: only iterate on x if y is in bounds:
			//if(ty >= 0 && ty < this.map.heightInTiles) {
			for(i = 0, tx = orig_tx; i <= this.map.viewWidthInTiles; i++, tx++) {
				// (don't bother with tiles that are out-of-bounds)
				if(tx >= 0 && tx < this.map.widthInTiles && ty >= 0 && ty < this.map.heightInTiles) {
					tile = this.data[ty * this.map.widthInTiles + tx]
					// '0' tiles in Tiled are *empty*
					if(tile) {
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex(tile)
						tile -= tileset.start
						tile_y = 0 | (tile / tileset.widthInTiles)
						tile_x = tile - (tile_y * tileset.widthInTiles)
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
						)
					}
				}
				xoffs += this.map.tileWidth
			}
			xoffs = orig_xoffs
			yoffs += this.map.tileHeight
		}

		// TODO: only need this for webgl rendering...
		// have to update the gl texture
		this.baseTexture.update()

		this.sprite.position.x = 0 | (viewx - this.map.viewWidth/2)
		this.sprite.position.y = 0 | (viewy - this.map.viewHeight/2)
	}

	renderCanvasOpt(viewx, viewy)
	{
		this.sprite.visible = this.visible
		if(!this.visible)
			return

		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		const tw = this.map.tileWidth
		const th = this.map.tileHeight

		// draw the tiles onto the canvas
		let tx, ty		// tile positions in the data map
		let xoffs, yoffs	// offset from the tile positions

		// view.x/y is the *center* not upper left
		let x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX)
		let y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY)
		tx = 0 | (x / tw)
		ty = 0 | (y / th)
		xoffs = -(x - (tx * tw))
		yoffs = -(y - (ty * th))

		// set the texture frame for the new position
		// (NOTE: do this here instead of after updating the canvases or
		// you'll get a nasty flashing effect!)
		this.texture.frame.x = -xoffs
		this.texture.frame.y = -yoffs
		this.texture.frame.width = this.canvasWidth - this.texture.frame.x
		this.texture.frame.height = this.canvasHeight - this.texture.frame.y
		this.texture.updateUvs()

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		let tileset, tile, tile_x, tile_y
		const orig_tx = tx
		const orig_ty = ty
		const orig_xoffs = xoffs
		const orig_yoffs = yoffs
		let i, j

		const mapWidth = this.map.widthInTiles
		const mapHeight = this.map.heightInTiles
		const mapViewWidth = this.map.viewWidthInTiles
		const mapViewHeight = this.map.viewHeightInTiles

		// if this is the first frame drawn then we need to draw everything
		if(isNaN(this.prev_x)) {
			// clear canvas
			this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
			this.backContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

			// have to draw all the tiles...
			xoffs = 0; yoffs = 0
			for(j = 0; j <= mapViewHeight; j++, ty++) {
				if(ty >= 0 && ty < mapHeight) {
					for(i = 0, tx = orig_tx; i <= mapViewWidth; i++, tx++) {
						if(tx >= 0 && tx < mapWidth) {
							tile = this.data[ty * mapWidth + tx]
							// '0' tiles in Tiled are *empty*
							if(tile) {
								// get the actual tile index in the tileset
								tileset = this.map.getTilesetForIndex(tile)
								tile -= tileset.start
								tile_y = 0 | (tile / tileset.widthInTiles)
								tile_x = tile - (tile_y * tileset.widthInTiles)
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
								)
							}
						}
						xoffs += tw
					}
				}
				xoffs = 0
				yoffs += th
			}
			xoffs = orig_xoffs
			yoffs = orig_yoffs
			// ...and copy to the front canvas
			this.context.drawImage(this.backCanvas, 0, 0)
		}
		// if we are *not* within the same tile as last frame
		else if(tx !== this.prev_tx || ty !== this.prev_ty) {
			// clear canvas
			this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

			// determine the amount of overlap the last frame had with this
			// frame (deltas)
			const dtx = tx - this.prev_tx
			const dty = ty - this.prev_ty
			const dx = dtx * tw
			const dy = dty * th

			// source & destination x/y
			let srcx, srcy
			let dstx, dsty
			// width & height
			let w
			let h
			if(dx < 0) {
				srcx = 0
				dstx = -dx
				w = this.canvasWidth + dx
			}
			else {
				srcx = dx
				dstx = 0
				w = this.canvasWidth - dx
			}
			if(dy < 0) {
				srcy = 0
				dsty = -dy
				h = this.canvasHeight + dy
			}
			else {
				srcy = dy
				dsty = 0
				h = this.canvasHeight - dy
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
			)

			// draw the 'missing' rows/columns
			let startcol, endcol, startrow, endrow
			// if dx < 0 we're missing cols at left
			if(dx < 0) {
				startcol = 0
				endcol = -dtx
			}
			// if dx > 0 we're missing cols at right
			else {
				startcol = mapViewWidth + 1 - Math.abs(dtx)
				endcol = mapViewWidth + 1
			}
			// if dy < 0 we're missing rows at top
			if(dy < 0) {
				startrow = 0
				endrow = -dty
			}
			// if dy > 0 we're missing rows at bottom
			else {
				startrow = mapViewHeight + 1 - dty
				endrow = mapViewHeight + 1
			}

			let row, col
			const numcols = endcol - startcol

			// rows
			for(row = startrow, ty = orig_ty + startrow; row < endrow; row++, ty++) {
				// calculate start & end cols such that we don't re-draw
				// the 'corner' where rows & cols overlap
				let start, end
				if(dx < 0) {
					start = numcols
					end = mapViewWidth + 1
				}
				else {
					start = 0
					end = mapViewWidth + 1 - numcols
				}
				for(col = start, tx = orig_tx + numcols; col < end; col++, tx++) {

					if(tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight)
						continue

					tile = this.data[ty * mapWidth + tx]
					// '0' tiles in Tiled are *empty*
					if(tile) {
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex(tile)
						tile -= tileset.start
						tile_y = 0 | (tile / tileset.widthInTiles)
						tile_x = tile - (tile_y * tileset.widthInTiles)

						yoffs = row * th
						xoffs = col * tw
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
						)
					}
				}
			}
			// columns
			for(col = startcol, tx = orig_tx + startcol; col < endcol; col++, tx++) {
				for(row = 0, ty = orig_ty; row <= mapViewHeight; row++, ty++) {

					if(tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight)
						continue

					tile = this.data[ty * mapWidth + tx]
					// '0' tiles in Tiled are *empty*
					if(tile) {
						// get the actual tile index in the tileset
						tileset = this.map.getTilesetForIndex(tile)
						tile -= tileset.start
						tile_y = 0 | (tile / tileset.widthInTiles)
						tile_x = tile - (tile_y * tileset.widthInTiles)

						yoffs = row * th
						xoffs = col * tw
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
						)
					}
				}
			}

			// clear back canvas
			this.backContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
			// then copy that back to the back canvas
			this.backContext.drawImage(this.canvas, 0, 0)
		}
		// otherwise the canvas already contains the necessary area

		// front canvas now has the correct stuff on it

		// next frame
		this.prev_tx = orig_tx
		this.prev_ty = orig_ty
		this.prev_x = x

		// TODO: only need this for webgl rendering...
		// have to update the gl texture
		this.baseTexture.update()

		this.sprite.position.x = 0 | (viewx - this.map.viewWidth/2)
		this.sprite.position.y = 0 | (viewy - this.map.viewHeight/2)
	}

	renderPixiSpr(viewx, viewy)
	{
		this.doc.visible = this.visible
		if(!this.visible)
			return

		// TODO: dirty checks - don't draw if not dirty

		// view.x/y is the *center* not upper left
		const x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX)
		const y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY)
		let tx = 0 | (x / this.map.tileWidth)
		let ty = 0 | (y / this.map.tileHeight)

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		let tileset, tile, tile_x, tile_y
		let orig_tx = tx
		let orig_ty = ty
		let i, j

		// set the frame for each tile sprite
		for(i = 0; i <= this.map.viewHeightInTiles; i++, ty++) {
			for(j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++) {
				if(tx < 0 || tx >= this.map.widthInTiles || ty < 0 || ty >= this.map.heightInTiles) {
					this.tileSprites[i][j].visible = false
					continue
				}
				tile = this.data[ty * this.map.widthInTiles + tx]
				// '0' tiles in Tiled are *empty*
				if(tile) {
					this.tileSprites[i][j].visible = true
					// TODO: support multiple tilesets
					// get the actual tile index in the tileset
//						tileset = this.map.getTilesetForIndex( tile )
					tileset = this.map.tilesets[0]
//						tile -= tileset.start
					tile--
					tile_y = 0 | (tile / tileset.widthInTiles)
					tile_x = tile - (tile_y * tileset.widthInTiles)

					const frame = this.tileSprites[i][j].texture.frame
					frame.x = tile_x * this.map.tileWidth
					frame.y = tile_y * this.map.tileHeight
					frame.width = this.map.tileWidth
					frame.height = this.map.tileHeight
					this.tileSprites[i][j].texture.frame = frame
					this.tileSprites[i][j].texture.updateUvs()
				}
				else {
					this.tileSprites[i][j].visible = false
				}
			}
		}

		// set the DOC position
		const px = -(x - (orig_tx * this.map.tileWidth))
		const py = -(y - (orig_ty * this.map.tileHeight))
		this.doc.position.x = 0 | (viewx - this.map.viewWidth/2) + px
		this.doc.position.y = 0 | (viewy - this.map.viewHeight/2) + py
	}

	renderPixiSprOpt(viewx, viewy)
	{
		this.doc.visible = this.visible
		if(!this.visible)
			return

		// TODO: dirty checks - don't draw if not dirty

		// cache some vars for performance
		const tw = this.map.tileWidth
		const th = this.map.tileHeight

		// draw the tiles onto the canvas
		let tx, ty		// tile positions in the data map

		// view.x/y is the *center* not upper left
		const x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX)
		const y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY)
		tx = 0 | (x / tw)
		ty = 0 | (y / th)

		// TODO: if there is only *one* tileset, we can optimize because we
		// don't need to look-up which tileset this tile is in...

		let tileset, tile, tile_x, tile_y
		const orig_tx = tx
		const orig_ty = ty
		let i, j

		// TODO: support more than one tileset
		tileset = this.map.tilesets[0]

		// do we need to set all the tile's u/v values?
		if(tx !== this.prev_tx || ty !== this.prev_ty) {
			const mapWidth = this.map.widthInTiles
			const mapHeight = this.map.heightInTiles

			// set the frame for each tile sprite
			for(i = 0; i <= this.map.viewHeightInTiles; i++, ty++) {
				for(j = 0, tx = orig_tx; j <= this.map.viewWidthInTiles; j++, tx++) {
					const tileSprite = this.tileSprites[i][j]
					// if this tile is out-of-world-bounds,
					// don't draw it
					if(ty < 0 || ty >= mapHeight || tx < 0 || tx >= mapWidth) {
						tileSprite.visible = false
						continue
					}
					tile = this.data[ty * mapWidth + tx]
					// '0' tiles in Tiled are *empty*
					if(tile) {
						tileSprite.visible = true
						// TODO: support more than one tileset
						// (this means swapping textures)
//						tileset = this.map.getTilesetForIndex( tile )
//						tile -= tileset.start
						tile--

						tile_y = 0 | (tile / tileset.widthInTiles)
						tile_x = tile - (tile_y * tileset.widthInTiles)

						let frame = tileSprite.texture.frame
						frame.x = tile_x * tw
						frame.y = tile_y * th
						tileSprite.texture.frame = frame
						tileSprite.texture.updateUvs()
					}
					else {
						tileSprite.visible = false
					}
				}
			}
		}

		// next frame
		this.prev_tx = orig_tx
		this.prev_ty = orig_ty

		// set the DOC position
		const px = -(x - (orig_tx * tw))
		const py = -(y - (orig_ty * th))
		this.doc.position.x = 0 | (viewx - this.map.viewWidth/2) + px
		this.doc.position.y = 0 | (viewy - this.map.viewHeight/2) + py
	}

	// "brute force" renderer - one sprite for each tile in each layer, mark
	// offscreen tiles 'visible=false' & set parent transform for view (camera)
	renderPixiAllSpr(viewx, viewy)
	{
		// TODO: use previous tile x/y to only set visible flags of the tiles
		// that have scrolled on/off of the screen

		this.doc.visible = this.visible
		if(!this.visible)
			return

		let tx, ty		// tile positions in the data map

		// view.x/y is the *center* not upper left
		let x = 0 | ((viewx - this.map.viewWidth/2)*this.scrollFactorX)
		let y = 0 | ((viewy - this.map.viewHeight/2)*this.scrollFactorY)
		tx = 0 | (x / this.map.tileWidth)
		ty = 0 | (y / this.map.tileHeight)
		let txend = tx + this.map.viewWidthInTiles + 1
		let tyend = ty + this.map.viewHeightInTiles + 1

		const orig_tx = tx
		const orig_ty = ty

		// only clear tiles & add visible tiles if the visible tiles has changed
		if(orig_tx !== this.prev_tx || orig_ty !== this.prev_ty) {
			this.doc.removeChildren()

			// limit tx/ty and txend/tyend to be in the bounds of the tilemap & the view
			tx = tx > 0 ? tx : 0
			ty = ty > 0 ? ty : 0
			txend = txend > this.map.widthInTiles ? this.map.widthInTiles : txend
			tyend = tyend > this.map.heightInTiles ? this.map.heightInTiles : tyend

			for(let u = ty; u < tyend; u++) {
				for(let v= tx; v < txend; v++) {
					const spr = this.tileSprites[u][v]
					if(spr) {
						this.doc.addChild(spr)
					}
				}
			}

			// next frame
			this.prev_tx = orig_tx
			this.prev_ty = orig_ty
		}

		// move the doc (group) to viewx, viewy
		// (truncate positions down to 32 bit integer)
		const vx = viewx - this.map.viewWidth/2
		const vy = viewy - this.map.viewHeight/2
		this.doc.position.x = 0 | (vx - (vx * this.scrollFactorX))
		this.doc.position.y = 0 | (vy - (vy * this.scrollFactorY))
	}

	/** Render the tilemap layer to its canvas
	* @name module:tilemap.TileLayer#render
	* @function
	* @arg {Number} viewx The x-coordinate that the view is centered on
	* @arg {Number} viewy The y-coordinate that the view is centered on
	*/
	__render_placeholder__ = undefined
}

/** Tile map image layer class. */
export class ImageLayer
{
	/**
	* @constructor
	* @arg {TileMap} map The tile map
	* @arg {Object} lyr The object for the layer - as read from the Tiled json
	*/
	constructor(map, lyr)
	{
		// reference to the TileMap that contains the layer
		this.map = map

		// get the image asset
		const img = loader.getAsset(lyr.name)

		this.visible = lyr.visible

		// Pixi stuff
		// eslint-disable-next-line no-undef
		this.baseTexture = new PIXI.BaseTexture(img)
		// eslint-disable-next-line no-undef
		this.texture = new PIXI.Texture(this.baseTexture)
		// eslint-disable-next-line no-undef
		this.sprite = new PIXI.Sprite(this.texture)

		// size of main layer, in pixels
		const w = map.worldWidth
		const h = map.worldHeight

		// size of the background layer, in pixels
		const camera_max_x = w - map.view.width
		const camera_max_y = h - map.view.height

		// set scroll factor based on scale (sizes):
		if(camera_max_x !== 0)
			this.scrollFactorX = (img.width - map.view.width) / camera_max_x
		if(camera_max_y !== 0)
			this.scrollFactorY = (img.height - map.view.height) / camera_max_y

		// add the sprite to Pixi
		map.view.add(this.sprite)
	}

	/** Render the layer. */
	render(viewx, viewy)
	{
		this.sprite.visible = this.visible

		// view.x/y is the *center* not upper left
		const vx = viewx - this.map.viewWidth/2
		const vy = viewy - this.map.viewHeight/2

		// move the sprite to viewx, viewy
		// (truncate positions down to 32 bit integer)
		this.sprite.position.x = 0 | (vx - (vx * this.scrollFactorX))
		this.sprite.position.y = 0 | (vy - (vy * this.scrollFactorY))
	}

}

/////////////////////////////////////////////////////////////////////////
// function to create objects for a Tiled object layer
function createObjects( layer )
{
	const objects = []
	// create an entity for each object
	for(let i = 0; i < layer.objects.length; i++) {
		const obj = layer.objects[i]
		// convert the object properties
		obj.properties = _readProperties(obj.properties)

		// TODO: verify
		const factory = zSquared[obj.type]
		if(!factory) {
			console.log("No factory method found for object type: " + obj.type)
			continue
		}
		objects.push(factory(obj))
	}
	return objects
}


/////////////////////////////////////////////////////////////////////////
// Component factories
/////////////////////////////////////////////////////////////////////////

/** Component Factory for tile map layer. */
export const tileLayerFactory = ecs.createComponentFactory({layer: null})

/** Component Factory for image layers. */
export const imageLayerFactory = ecs.createComponentFactory({layer: null})

/** Component Factory for collision map. */
export const collisionMapFactory = ecs.createComponentFactory({map: null, data: null})

