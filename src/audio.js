// audio.js
// Copyright 2013 Joshua C Shepard
// web audio functionality for zed-squared 
//
// TODO:
// - 

zSquared.audio = function( z2 )
{
	"use strict";

	z2.require( ["time"] );


	z2.AudioContext = window.AudioContext || window.webkitAudioContext;

	z2.audio = new z2.AudioContext();

	var NUM_CHANNELS = 16;

	// audio buffer sources 
	var channels = new Array( NUM_CHANNELS );
	// data about channels
	// (only valid for active channels)
	var channel_data = [];
	// initialize channel data
	for( var i = 0; i < NUM_CHANNELS; i++ )
	{
		channel_data[i] = 
		{
			key: null,
			volume: 1,
			loop: false,
			start : 0,
			paused : 0,
			timeout : null
		};
	}

	function resetChannelData( idx )
	{
		var cd = channel_data[idx];
		cd.key = null;
		cd.volume = 1;
		cd.loop = false;
		cd.start = 0;
		cd.paused = 0;
		cd.timeout = null;
	}

	function findChannel()
	{
		for( var i = 0; i < channels.length; i++ )
		{
			if( !channel_data[i].key )
				return i;
		}
		return -1;
	}

	function playSound( snd, channel, key, offset, volume, loop )
	{
		// create a buffer source
		var src = z2.audio.createBufferSource();

		// set the source buffer
		src.buffer = snd;

		// loop?
		if( loop )
			src.loop = true;

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

		// set this channel
		channels[channel] = src;

		// set the channel data
		var cd = channel_data[channel];
		cd.key = key;
		cd.volume = volume;
		cd.loop = loop;
		if( cd.paused )
			cd.start = z2.time.system() - cd.paused;
		else
			cd.start = z2.time.system();
		cd.paused = 0;

		// play
		src.start( 0, offset );

		// set a timeout to remove from this channel
		channel_data[channel].timeout = setTimeout( function() { delete channels[channel]; resetChannelData( channel ); }, src.buffer.duration * 1000 );
	}

	/** Play a sound 
	 * @method z2#playSound
	 * @arg {string} key Key of the loader asset to play (must be loaded)
	 * @arg {number} offset Offset into the sound
	 * @arg {number} volume Volume for playback
	 * @arg {boolean} loop Should the sound loop forever?
	 * @returns {number} The channel this sound was played on. -1 indicates the
	 * sound could not be played because there was no open channel
	 */
	z2.playSound = function( key, offset, volume, loop )
	{
		// find an open channel & add sound to it
		var idx = findChannel();
		if( idx === -1 )
			return -1; 

		offset = offset || 0;

		// get the asset
		var snd = z2.loader.getAsset( key );

		playSound( snd, idx, key, offset, volume, loop );

		return idx;
	};

	/** Stop a sound from playing
	 * @method z2#stopSound
	 * @arg {number} channel Channel to stop playing
	 */
	z2.stopSound = function( channel )
	{
		// clear the timeout
		clearTimeout( channel_data[channel].timeout );
		// reset the channel data
		resetChannelData( channel );
		// stop playback
		var snd = channels[channel];
		if( snd )
		{
			snd.stop();
		}
	};

	/** Pause a sound
	 * @method z2#pauseSound
	 * @arg {number} channel Channel to pause
	 */
	z2.pauseSound = function( channel )
	{
		var cd = channel_data[channel];
		var snd = channels[channel];
		if( snd && cd.key && !cd.paused )
		{
			var t = z2.time.system() - cd.start;
			// handle offset greater than duration
			// (for looped sounds)
			t %= (snd.buffer.duration * 1000);
			// record the paused time
			cd.paused = t;
			// clear the timeout
			clearTimeout( cd.timeout );
			// stop the playback
			if( snd )
			{
				snd.stop();
			}
		}
	};

	/** Resume playing a sound
	 * @method z2#resumeSound
	 * @arg {number} channel Channel to resume
	 */
	z2.resumeSound = function( channel )
	{
		var cd = channel_data[channel];
		// if we have a paused sound on this channel
		if( cd.key && cd.paused )
		{
			// get the asset
			var snd = z2.loader.getAsset( cd.key );
			// reset the start time
			cd.start = z2.time.system() - cd.paused;
			// play the sound
			playSound( snd, channel, cd.key, cd.paused / 1000, cd.volume, cd.loop );
		}
	};

	/** Stop all sound from being played
	 * @method z2#stopSounds
	 */
	z2.stopSounds = function()
	{
		for( var i = 0; i < channels.length; i++ )
		{
			z2.stopSound( i );
		}
	};

	/** Pause all sounds
	 * @method z2#pauseSounds
	 */
	z2.pauseSounds = function()
	{
		for( var i = 0; i < channels.length; i++ )
		{
			z2.pauseSound( i );
		}
	};

	/** Resume all paused sounds
	 * @method z2#pauseSounds
	 */
	z2.resumeSounds = function()
	{
		for( var i = 0; i < channels.length; i++ )
		{
			z2.resumeSound( i );
		}
	};

};

