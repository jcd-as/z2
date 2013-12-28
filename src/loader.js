// loader.js
// Copyright 2013 Joshua C Shepard
// asset loader class/module for zed-squared
//
// TODO:
// - support 'base' URL for loading
// - support progress indicator callback
// - support pre-loads
// - 

"use strict";

zSquared.loader = function( z2 )
{
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
		mp3 : 'audio'
	};

	// list of queued asset key/url pairs
	var assetQueue = [];
	// map of keys to assets
	var assets = {};

	var assetsLoaded = 0;
	var assetsFailed = 0;

	// load an image
	function loadImage( key, url, onComplete, onError )
	{
		var img = new Image();
		img.onload = function(){ onComplete( key, img ); };
		img.onerror = onError;
		img.src = url;
	}

	// load an audio file
//	loadImage: function( key, url, onComplete, onError )
//	{
//	},


	// public module interface:
	z2.loader = 
	{
		// TODO: does this need to be public ?
		/** Get the type of an asset
		 * @method z2.loader#getAssetType
		 * @arg {string} name Asset (file) name
		 * @returns {string} Asset type
		 */
		getAssetType: function( name )
		{
			var ext = name.split( '.' ).slice(-1)[0].toLowerCase();
			return assetTypes[ext] || 'unknown';
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

		/** Add an item to the loader queue
		 * @method z2.loader#queueAsset
		 * @arg {string} key Key (friendly name) that will be used to access the
		 * asset
		 * @arg {string} url Asset URL to queue
		 */
		queueAsset: function( key, url )
		{
			assetQueue.push( [key, url] );
		},

		/** Start the load (asynchronous)
		 * @method z2.loader#load
		 * @arg {Function} onComplete Callback function. Should take two numeric
		 * arguments: the number of loaded items and the number of failed items
		 */
		load: function( onComplete)
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
					onComplete( assetsLoaded, assetsFailed );
			};

			// error callback
			var failed = function( key )
			{
				remaining--;
				assetsFailed++;
				console.warn( "Failed to load asset: " + key );
			};

			// do the load
			while( assetQueue.length )
			{
				var data = assetQueue.pop();
				var key = data[0];
				var url = data[1]
				var type = z2.loader.getAssetType( url );
				// don't reload assets
				if( assets[key] )
					loaded( key, assets[key] );
				else
				{
					switch( type )
					{
					case 'image':
						loadImage( key, url, loaded, failed );
						break;
					case 'audio':
						// TODO: impl
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

