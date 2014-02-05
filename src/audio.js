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

	z2.playSound = function( key, offset, volume, loop )
	{
		offset = offset || 0;

		// get the asset
		var snd = z2.loader.getAsset( key );

		// create a buffer source
		var src = z2.audio.createBufferSource();
		// loop?
		if( loop )
			src.loop = true;

		// set the source buffer
		src.buffer = snd;

		// volume?
		if( volume )
		{
			var gain = z2.audio.createGain();
			src.connect( gain );
			gain.gain.value = volume;
			gain.connect( z2.audio.destination );
		}
		else
			src.connect( z2.audio.destination );

		// play
		src.start( offset );
	};
};

