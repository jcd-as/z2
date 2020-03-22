// loader.js
// Copyright 2013 Joshua C Shepard
// asset loader class/module for zed-squared
//
// TODO:
// - Can replace this module entirely with the PIXI loader ?
// x support 'base' URL for loading
// x support progress indicator callback
// - support pre-loads (?)
// x support text files
// x support json files
// x support audio files
// x support bitmap fonts (.fnt files)
// - use browser type to load appropriate audio files (i.e. ogg for firefox)
// -

/** Asset loader module.
 * @module
 */

import {audioContext} from './audio.js'


// private module data/functionality:

const assetTypes =
{
	// images
	png : 'image',
	jpg : 'image',
	jpeg : 'image',
	gif : 'image',

	// audio files
	ogg : 'audio',
	wav : 'audio',
	m4a : 'audio',
	mp3 : 'audio',

	// text files
	txt : 'text',

	// json files
	json : 'json',

	// bitmap font files
	fnt : 'font'
}

let baseUrl = ''
let imgBaseUrl = ''
let sndBaseUrl = ''
let txtBaseUrl = ''
let jsonBaseUrl = ''
let fontBaseUrl = ''

// list of queued asset key/url pairs
let assetQueue = []
// map of keys to assets
let assets = {}

let assetsLoaded = 0
let assetsFailed = 0

function getAssetTypeFromUrl(name)
{
	const ext = name.split('.').slice(-1)[0].toLowerCase()
	return assetTypes[ext] || 'unknown'
}

// load an image
function loadImage(key, url, onComplete, onError, that)
{
	url = baseUrl + imgBaseUrl + url
	const img = new Image()
	img.onload = function(){ onComplete.call(that, key, img) }
	img.onerror = onError
	img.src = url
}

// load a simple spritesheet (image + sprite width & height)
function loadSpritesheetImage(key, url, width, height, onComplete, onError, that)
{
	url = baseUrl + imgBaseUrl + url
	const img = new Image()
	img.onload = () => {
		//onComplete.call(that, key, img)
		const ss = {image: img, width: width, height: height}
		onComplete.call(that, key, ss)
	}
	img.onerror = onError
	img.src = url
}

// load a text file
function loadText(key, url, onComplete, onError, that)
{
	url = baseUrl + txtBaseUrl + url
	const xhr = new XMLHttpRequest()
	xhr.open("GET", url, true)
	xhr.responseType = "text"
	xhr.onload = () => { onComplete.call(that, key, xhr.responseText) };
	xhr.onerror = onError
	xhr.send()
}

// load a json file
function loadJson(key, url, onComplete, onError, that)
{
	url = baseUrl + jsonBaseUrl + url
	const xhr = new XMLHttpRequest()
	xhr.open("GET", url, true)
	xhr.responseType = "text"
	xhr.onload = () => {
		// parse json
		const data = JSON.parse(xhr.responseText)
		onComplete.call(that, key, data)
	}
	xhr.onerror = onError
	xhr.send()
}

// load an audio file
function loadAudio(key, url, onComplete, onError, that)
{
	url = baseUrl + sndBaseUrl + url
	const xhr = new XMLHttpRequest()
	xhr.open("GET", url, true)
	xhr.responseType = "arraybuffer"
	xhr.onload = () => {
		let data
		audioContext.decodeAudioData(xhr.response, buffer => {
			data = buffer
			onComplete.call(that, key, data)
		}, onError)
	}
	xhr.onerror = onError
	xhr.send()
}

// load a bitmap font file
// (xml format from http://www.angelcode.com/products/bmfont/)
function loadFont(key, url, onComplete, onError)
{
	// use Pixi to load the font
	url = baseUrl + fontBaseUrl + url
	// eslint-disable-next-line no-undef
	const ldr = new PIXI.Loader()
	ldr.add(key, url)
	let font = undefined
	ldr.onComplete.add(() => {
		onComplete(key, font)
	})
	ldr.onError = onError
	ldr.load((ldr, resources) => {
		font = resources.key
	})
}

// public module interface:
/*** Loader namespace
 * @namespace loader */
export default
{
	/** Set base URL
	* @method module:loader#setBaseUrl
	* @arg {string} base base URL
	*/
	setBaseUrl: function(base)
	{
		baseUrl = base
	},

	/** Set image base URL
	* @method module:loader#setImageBaseUrl
	* @arg {string} base base URL
	*/
	setImageBaseUrl: function(base)
	{
		imgBaseUrl = base
	},

	/** Set audio base URL
	* @method module:loader#setAudioUrl
	* @arg {string} base base URL
	*/
	setAudioBaseUrl: function(base)
	{
		sndBaseUrl = base
	},

	/** Set text base URL
	* @method module:loader#setTextBaseUrl
	* @arg {string} base base URL
	*/
	setTextBaseUrl: function(base)
	{
		txtBaseUrl = base
	},

	/** Set JSON base URL
	* @method module:loader#setJsonBaseUrl
	* @arg {string} base base URL
	*/
	setJsonBaseUrl: function(base)
	{
		jsonBaseUrl = base
	},

	/** Set font base URL
	* @method module:loader#setFontBaseUrl
	* @arg {string} base base URL
	*/
	setFontBaseUrl: function(base)
	{
		fontBaseUrl = base
	},

	/** Get an asset
	* @method module:loader#getAsset
	* @arg {string} key Asset key (friendly name)
	* @returns {string} Asset The asset
	*/
	getAsset: function(key)
	{
		return assets[key]
	},

	/** Dispose of an asset
	* @method module:loader#deleteAsset
	* @arg {string} key Asset key (friendly name)
	*/
	deleteAsset: function(key)
	{
		delete assets[key]
	},

	/** Free all assets
	* @method module:loader#freeAssets
	*/
	freeAssets: function()
	{
		assets = {}
	},

	/** Add an item to the loader queue
	* @method module:loader#queueAsset
	* @arg {string} key Key (friendly name) that will be used to access the
	* asset
	* @arg {string} url Asset URL to queue
	* @arg {string} [type] Type of asset. Use for assets that would
	* otherwise be treated as a more generic type (e.g. 'tiled' to override
	* 'json')
	* @arg {any} [extras] Any extra arguments required:
	*  - spritesheet images require sprite width & height
	*/
	queueAsset: function(key, url, type)
	{
		const extras = Array.prototype.slice.call(arguments, 3)
		if(extras)
			assetQueue.push([key, url, type, extras])
		else
			assetQueue.push([key, url, type])
	},

	/** Start the load (asynchronous)
	* @method module:loader#load
	* @arg {Function} onComplete Callback function. Should take two numeric
	* arguments: the number of loaded items and the number of failed items
	* @arg {Function} onProgress Callback function. Takes one numeric
	* argument: the loading progress (0 to 1)
	* @arg {object} that The 'this' object for the callback functions
	*/
	load: function(onComplete, onProgress, that)
	{
		let remaining = assetQueue.length
		let total = remaining

		// loaded callback
		const loaded = (key, obj) => {
			assets[key] = obj
			remaining--
			assetsLoaded++

			// call progress callback
			if(onProgress)
				onProgress.call(that, (total - remaining) / total)

			// if we're done, call the final callback
			if(remaining === 0 && onComplete)
				onComplete.call(that, assetsLoaded, assetsFailed)
		}

		// error callback
		const failed = (key) => {
			remaining--
			assetsFailed++
			console.warn("Failed to load asset: " + key)
		}

		// load a Tiled json file
		// (define this as a closure inside load() so that we can access
		// 'remaining' - to increment it as we add more files to load
		const loadTiledJson = (key, url, onComplete, onError) => {
			const xhr = new XMLHttpRequest()
			xhr.open("GET", url, true)
			xhr.responseType = "text"
			xhr.onload = () => {
				// parse json
				let data = JSON.parse(xhr.responseText)
				// load files referenced in Tiled file:
				// tileset images
				for(let i = 0; i < data.tilesets.length; i++) {
					total++
					remaining++
					const img_url = data.tilesets[i].image
					loadImage(data.tilesets[i].name, img_url, loaded, failed, that)
				}
				// imagelayer images
				for(let i = 0; i < data.layers.length; i++) {
					if(data.layers[i].type == 'imagelayer') {
						total++
						remaining++
						const path = data.layers[i].name + ".png"
						loadImage(data.layers[i].name, path, loaded, failed, that)
					}
				}
				// TODO: etc (?)

				onComplete.call(that, key, data)
			}
			xhr.onerror = onError
			xhr.send()
		}

		// do the load
		while(assetQueue.length) {
			const data = assetQueue.pop()
			const key = data[0]
			const url = data[1]
			let type = data[2]
			if(!type)
				type = getAssetTypeFromUrl(url)
			let extras
			if(data.length > 3)
				extras = data[3]
			// don't reload assets
			if(assets[key])
				loaded(key, assets[key])
			else {
				switch(type) {
					case 'image':
						loadImage(key, url, loaded, failed, that)
					break
					case 'spritesheet':
						loadSpritesheetImage(key, url, extras[0], extras[1], loaded, failed, that)
					break
					case 'audio':
						loadAudio(key, url, loaded, failed, that)
					break
					case 'json':
						loadJson(key, url, loaded, failed, that)
					break
					case 'text':
						loadText(key, url, loaded, failed, that)
					break
					case 'tiled':
						loadTiledJson(key, url, loaded, failed, that)
					break
					case 'font':
						loadFont(key, url, loaded, failed)
					break
					case 'unknown':
						console.warn("unknown kind of asset: " + url)
					failed.call(that)
					break
				}
			}
		}
	}
}

