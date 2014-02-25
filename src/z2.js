// z2.js
// Copyright 2013 Joshua C Shepard
// zed-squared html5 game components
// TODO:
// - tilemaps:
//  - load tile sheets
//  - Tiled json loader
//  - draw tilemaps
//  - tilemap (vs sprite) collision
// - 

var zSquared = function( opts )
{
	"use strict";

	var loaded = {};
	var raf;

	/** Main z2 namespace object
	 * @global
	 * @namespace
	 */
	var z2 = 
	{
		require : function( modules )
		{
			if( !(modules instanceof Array) )
				throw new Error( "Non-array type passed to require()" );
			for( var i = 0; i < modules.length; i++ )
			{
				// don't reload modules
				var m = loaded[modules[i]];
				if( !m )
				{
					m = zSquared[modules[i]] || modules[i];
					if( !(m instanceof Function) )
						throw new Error( "Unknown module: '" + m + "' passed to require()" );
					m( z2 );
					loaded[modules[i]] = true;
				}
			}
		},

		/** Main game loop helper. Starts main loop with given fcn.
		 * @function z2#main
		 * @arg {Function} update Function to be called each frame. Takes a
		 * single parameter: the elapsed time since the loop was first started
		 * (the same param that requestAnimationFrame passes)
		 */
		main : function( update )
		{
			var requestAnimationFrame = window.requestAnimationFrame || 
				window.mozRequestAnimationFrame ||
				window.webkitRequestAnimationFrame || 
				window.msRequestAnimationFrame;

			// start the main loop
			var f = function( et )
			{
				update( et );
				raf = requestAnimationFrame( f );
			};
			raf = requestAnimationFrame( f );
		},

		/** Stops the main loop
		 * @function z2#stopMain
		 */
		stopMain : function()
		{
			var cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

			cancelAnimationFrame( raf );
		},

		/** Function to create a canvas object
		 * @function z2#createCanvas
		 * @arg {Number} w Canvas width, in pixels
		 * @arg {Number} h Canvas height, in pixels
		 * @arg {boolean} [add_to_doc] Should this canvas be added to the
		 * document?
		 * @arg {DOM Element} [parent] Parent element in DOM
		 * @returns {Canvas} The Canvas object
		 */
		createCanvas : function( w, h, parent, add_to_doc )
		{
			var canvas = document.createElement( 'canvas' );
			canvas.width = w;
			canvas.height = h;
			if( add_to_doc )
			{
				if( parent )
					parent.appendChild( canvas );
				else
					document.body.appendChild( canvas );
			}
			return canvas;
		},

		/** Wraps text at 'width' columns
		 * @function z2#wrapText
		 * @arg {string} text Text to wrap
		 * @arg {number} width Column at which to wrap text 
		 * @returns {string} Wrapped text (input with newlines added)
		 */
		wrapText : function( text, width )
		{
			width = width || 75;
			var regex = '.{1,' + width + '}(\\s|$)' + '|\\S+?(\\s|$)';
			return text.match( RegExp( regex, 'g' ) ).join( '\n' );
		},

		/** Generate a random number within bounds
		 * @function z2#random
		 * @arg {number} min minimum value to generate
		 * @arg {number} max maximum value to generate
		 * @arg {Function} mod Function to be applied to result prior to
		 * returning (e.g. pass 'Math.round' to get a number rounded to an
		 * integer value)
		 * @returns {number} random number in [min,max] range
		 */
		random : function( min, max, round )
		{
			var val;
			if( min === max )
				val = min;
			else
				val = (Math.random() * (max - min)) + min;
			if( round )
				return round( (Math.random() * (max - min)) + min );
			else
				return val;
		},

		/** Find an item in an array by 'name' property
		 * @function z2#findByName
		 * @arg {array} array Array in which to find object
		 * @arg {string} name
		 * @returns item with given name
		 */
		findByName : function( array, name )
		{
			for( var i = 0; i < array.length; i++ )
			{
				if( array[i].name && array[i].name === name )
					return array[i];
			}
			return null;
		},

		/** Toggel fullscreen mode, when available
		 * @function z2#toggleFullScreen
		 */
		toggleFullScreen : function()
		{
			var doc = window.document;
			var de = doc.documentElement;

			var requestFullScreen = de.requestFullScreen ||
				de.mozRequestFullScreen ||
				de.webkitRequestFullScreen ||
				de.msRequestFullscreen;
			var cancelFullScreen = doc.exitFullScreen ||
				doc.mozCancelFullScreen ||
				doc.webkitExitFullscreen ||
				doc.msExitFullscreen;

			if( !doc.fullscreenElement && !doc.mozFullScreenElement	&& 
				!doc.webkitFullscreenElement && !doc.msFullscreenElement )
				requestFullScreen.call( de );
			else
				cancelFullScreen.call( doc );
		},

	};

	// return the main (namespace) object
	return z2;

};
