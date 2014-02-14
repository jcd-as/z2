// loader.js
// Copyright 2013 Joshua C Shepard
// asset loader class/module for zed-squared
//
// TODO:
// x support 'base' URL for loading
// - support progress indicator callback
// - support pre-loads
// x support text files
// x support json files
// x support audio files
// - support bitmap fonts (.fnt files)
// - use browser type to load appropriate audio files (i.e. ogg for firefox)
// - 

zSquared.loader = function( z2 )
{
	"use strict";

	z2.require( ["audio"] );

	// private module data/functionality:

	var assetTypes = 
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
	};

	var baseUrl = '';
	var imgBaseUrl = '';
	var sndBaseUrl = '';
	var txtBaseUrl = '';
	var jsonBaseUrl = '';
	var fontBaseUrl = '';

	// list of queued asset key/url pairs
	var assetQueue = [];
	// map of keys to assets
	var assets = {};

	var assetsLoaded = 0;
	var assetsFailed = 0;

	function getAssetTypeFromUrl( name )
	{
		var ext = name.split( '.' ).slice(-1)[0].toLowerCase();
		return assetTypes[ext] || 'unknown';
	}

	// load an image
	function loadImage( key, url, onComplete, onError, that )
	{
		url = baseUrl + imgBaseUrl + url;
		var img = new Image();
		img.onload = function(){ onComplete.call( that, key, img ); };
		img.onerror = onError;
		img.src = url;
	}

	// load a simple spritesheet (image + sprite width & height)
	function loadSpritesheetImage( key, url, width, height, onComplete, onError, that )
	{
		url = baseUrl + imgBaseUrl + url;
		var img = new Image();
		img.onload = function()
		{
//			onComplete.call( that, key, img);
			var ss = {image: img, width: width, height: height};
			onComplete.call( that, key, ss);
		};
		img.onerror = onError;
		img.src = url;
	}

	// load a text file
	function loadText( key, url, onComplete, onError, that )
	{
		url = baseUrl + txtBaseUrl + url;
		var xhr = new XMLHttpRequest();
		xhr.open( "GET", url, true );
		xhr.responseType = "text";
		xhr.onload = function () { onComplete.call( that, key, xhr.responseText ); };
		xhr.onerror = onError;
		xhr.send();
	}

	// load a json file
	function loadJson( key, url, onComplete, onError, that )
	{
		url = baseUrl + jsonBaseUrl + url;
		var xhr = new XMLHttpRequest();
		xhr.open( "GET", url, true );
		xhr.responseType = "text";
		xhr.onload = function () 
		{
			// parse json
			var data = JSON.parse( xhr.responseText );
			onComplete.call( that, key, data );
		};
		xhr.onerror = onError;
		xhr.send();
	}

	// load an audio file
	function loadAudio( key, url, onComplete, onError, that )
	{
		url = baseUrl + sndBaseUrl + url;
		var xhr = new XMLHttpRequest();
		xhr.open( "GET", url, true );
		xhr.responseType = "arraybuffer";
		xhr.onload = function()
		{
			var data;
			z2.audio.decodeAudioData( xhr.response, function( buffer )
			{
				data = buffer;
				onComplete.call( that, key, data );
			}, onError );
		};
		xhr.onerror = onError;
		xhr.send();
	}

	// load a bitmap font file
	// (xml format from http://www.angelcode.com/products/bmfont/)
	function loadFont( key, url, onComplete, onError, that )
	{
		// use Pixi to load the font
		url = baseUrl + fontBaseUrl + url;
		var fontsToLoad = [url];
		var loader = new PIXI.AssetLoader( fontsToLoad );
		loader.onComplete = onComplete;
		loader.onError = onError;
		loader.load();
	}

	// public module interface:
	/** Loader namespace
	 * @namespace z2.loader */
	z2.loader = 
	{
		/** Set base URL
		 * @method z2.loader#setBaseUrl
		 * @arg {string} base base URL
		 */
		setBaseUrl : function( base )
		{
			baseUrl = base;
		},

		/** Set image base URL
		 * @method z2.loader#setImageBaseUrl
		 * @arg {string} base base URL
		 */
		setImageBaseUrl : function( base )
		{
			imgBaseUrl = base;
		},

		/** Set audio base URL
		 * @method z2.loader#setAudioUrl
		 * @arg {string} base base URL
		 */
		setAudioBaseUrl : function( base )
		{
			sndBaseUrl = base;
		},

		/** Set text base URL
		 * @method z2.loader#setTextBaseUrl
		 * @arg {string} base base URL
		 */
		setTextBaseUrl : function( base )
		{
			txtBaseUrl = base;
		},

		/** Set JSON base URL
		 * @method z2.loader#setJsonBaseUrl
		 * @arg {string} base base URL
		 */
		setJsonBaseUrl : function( base )
		{
			jsonBaseUrl = base;
		},

		/** Set font base URL
		 * @method z2.loader#setFontBaseUrl
		 * @arg {string} base base URL
		 */
		setFontBaseUrl : function( base )
		{
			fontBaseUrl = base;
		},

		/** Get an asset
		 * @method z2.loader#getAsset
		 * @arg {string} key Asset key (friendly name)
		 * @returns {string} Asset The asset
		 */
		getAsset : function( key )
		{
			return assets[key];
		},

		/** Dispose of an asset
		 * @method z2.loader#deleteAsset
		 * @arg {string} key Asset key (friendly name)
		 */
		deleteAsset : function( key )
		{
			delete assets[key];
		},

		/** Free all assets
		 * @method z2.loader#freeAssets
		 */
		freeAssets : function()
		{
			assets = {};
		},

		/** Add an item to the loader queue
		 * @method z2.loader#queueAsset
		 * @arg {string} key Key (friendly name) that will be used to access the
		 * asset
		 * @arg {string} url Asset URL to queue
		 * @arg {string} [type] Type of asset. Use for assets that would
		 * otherwise be treated as a more generic type (e.g. 'tiled' to override 
		 * 'json')
		 * @arg {any} [extras] Any extra arguments required:
		 *  - spritesheet images require sprite width & height
		 */
		queueAsset: function( key, url, type )
		{
			var extras = Array.prototype.slice.call( arguments, 3 );
			if( extras )
				assetQueue.push( [key, url, type, extras] );
			else
				assetQueue.push( [key, url, type] );
		},

		/** Start the load (asynchronous)
		 * @method z2.loader#load
		 * @arg {Function} onComplete Callback function. Should take two numeric
		 * arguments: the number of loaded items and the number of failed items
		 */
		load: function( onComplete, that )
		{
			var remaining = assetQueue.length;

			// loaded callback
			var loaded = function( key, obj )
			{
				assets[key] = obj;
				remaining--;
				assetsLoaded++;

				// TODO: call progress callback here

				// if we're done, call the final callback
				if( remaining === 0 )
					onComplete.call( that, assetsLoaded, assetsFailed );
			};

			// error callback
			var failed = function( key )
			{
				remaining--;
				assetsFailed++;
				console.warn( "Failed to load asset: " + key );
			};

			// load a Tiled json file
			// (define this as a closure inside load() so that we can access
			// 'remaining' - to increment it as we add more files to load
			var loadTiledJson = function( key, url, onComplete, onError )
			{
				var xhr = new XMLHttpRequest();
				xhr.open( "GET", url, true );
				xhr.responseType = "text";
				xhr.onload = function () 
				{
					// parse json
					var data = JSON.parse( xhr.responseText );
					// load files referenced in Tiled file:
					// tileset images
					for( var i = 0; i < data.tilesets.length; i++ )
					{
						remaining++;
						var img_url = data.tilesets[i].image.split( '/' ).slice( -1 )[0];
						loadImage( data.tilesets[i].name, img_url, loaded, failed, that );
					}
					// imagelayer images
					for( i = 0; i < data.layers.length; i++ )
					{
						if( data.layers[i].type == 'imagelayer' )
						{
							remaining++;
							var path = data.layers[i].name + ".png";
							loadImage( data.layers[i].name, path, loaded, failed, that );
						}
					}
					// TODO: etc (?)

					onComplete.call( that, key, data );
				};
				xhr.onerror = onError;
				xhr.send();
			};


			// do the load
			while( assetQueue.length )
			{
				var data = assetQueue.pop();
				var key = data[0];
				var url = data[1];
				var type = data[2];
				if( !type )
					type = getAssetTypeFromUrl( url );
				var extras;
				if( data.length > 3 )
					extras = data[3];
				// don't reload assets
				if( assets[key] )
					loaded( key, assets[key] );
				else
				{
					switch( type )
					{
					case 'image':
						loadImage( key, url, loaded, failed, that );
						break;
					case 'spritesheet':
						loadSpritesheetImage( key, url, extras[0], extras[1], loaded, failed, that );
						break;
					case 'audio':
						loadAudio( key, url, loaded, failed, that );
						break;
					case 'json':
						loadJson( key, url, loaded, failed, that );
						break;
					case 'text':
						loadText( key, url, loaded, failed, that );
						break;
					case 'tiled':
						loadTiledJson( key, url, loaded, failed, that );
						break;
					case 'font':
						loadFont( key, url, loaded, failed, that );
						break;
					case 'unknown':
						console.warn( "unknown kind of asset: " + url );
						failed.call( that );
						break;
					}
				}
			}
		}
	};
};

