// loader.js
// Copyright 2013 Joshua C Shepard
// asset loader class/module for zed-squared
//
// TODO:
// - support 'base' URL for loading
// - support progress indicator callback
// - support pre-loads
// x support text files
// x support json files
// - support audio files
// - 

zSquared.loader = function( z2 )
{
	"use strict";

//	z2.require( [""] );

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
		json : 'json'
	};

	// list of queued asset key/url pairs
	var assetQueue = [];
	// map of keys to assets
	var assets = {};

	var assetsLoaded = 0;
	var assetsFailed = 0;

	// XML HTTP Request
	var xhr = new XMLHttpRequest();

	function getAssetTypeFromUrl( name )
	{
		var ext = name.split( '.' ).slice(-1)[0].toLowerCase();
		return assetTypes[ext] || 'unknown';
	}

	// load an image
	function loadImage( key, url, onComplete, onError, that )
	{
		var img = new Image();
		img.onload = function(){ onComplete.call( that, key, img ); };
		img.onerror = onError;
		img.src = url;
	}

	// load a text file
	function loadText( key, url, onComplete, onError, that )
	{
		xhr.open( "GET", url, true );
		xhr.responseType = "text";
		xhr.onload = function () { onComplete.call( that, key, xhr.responseText ); };
		xhr.onerror = onError;
		xhr.send();
	}

	// load a json file
	function loadJson( key, url, onComplete, onError, that )
	{
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
//	loadAudio: function( key, url, onComplete, onError )
//	{
//	},


	// public module interface:
	/** Loader namespace
	 * @namespace z2.loader */
	z2.loader = 
	{
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

		/** Add an item to the loader queue
		 * @method z2.loader#queueAsset
		 * @arg {string} key Key (friendly name) that will be used to access the
		 * asset
		 * @arg {string} url Asset URL to queue
		 * @arg {string} [type] Type of asset. Use for assets that would
		 * otherwise be treated as a more generic type (e.g. 'tiled' to override 
		 * 'json')
		 */
		queueAsset: function( key, url, type )
		{
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
						loadImage( data.tilesets[i].name, data.tilesets[i].image, loaded, failed, that );
					}
					// imagelayer images
					for( i = 0; i < data.layers.length; i++ )
					{
						if( data.layers[i].type == 'imagelayer' )
						{
							remaining++;
							loadImage( data.layers[i].name, data.lyers[i].image, loaded, failed, that );
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
					case 'audio':
						// TODO: impl
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
					case 'unknown':
						// TODO: impl
						break;
					}
				}
			}
		}
	};
};

