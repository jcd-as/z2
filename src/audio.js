// audio.js
// Copyright 2013 Joshua C Shepard
// web audio functionality for zed-squared 
//
// TODO:
// - 

zSquared.audio = function( z2 )
{
	"use strict";

//	z2.require( [""] );

	// private module data/functionality:

	z2.AudioContext = window.AudioContext || window.webkitAudioContext;

	z2.audio = new z2.AudioContext();

	z2.playSound = function( key )
	{
		// get the asset
		var snd = z2.loader.getAsset( key );

		var src = z2.audio.createBufferSource();
		src.buffer = snd;
		src.connect( z2.audio.destination );
		src.start( 0 );
	};
};

