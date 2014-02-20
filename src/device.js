// device.js
// Copyright 2013 Joshua C Shepard
// device detection for zed-squared
//
// TODO:
// - 

zSquared.device = function( z2 )
{
	"use strict";

//	z2.require( ["time"] );


	// browsers
	var arora, chrome, epiphany, firefox, mobileSafari, ie, ieVersion, midori, opera, safari, silk, trident, tridentVersion;
	// browser 'extra'
	var webApp, cocoonJS, ejecta;
	// operating systems
	var android, chromeOS, iOS, linux, macOS, windows;
	// features
	var webAudio, canvas, localStorage, file, fileSystem, webGL, worker, touch, mspointer, pointerLock, quirksMode;
	(function()
	{
		// get the user agent string
		var ua = navigator.userAgent;

		// browser
		if (/Arora/.test(ua))
			arora = true;
		else if (/Chrome/.test(ua))
			chrome = true;
		else if (/Epiphany/.test(ua))
			epiphany = true;
		else if (/Firefox/.test(ua))
			firefox = true;
		else if (/Mobile Safari/.test(ua))
			mobileSafari = true;
		else if (/MSIE (\d+\.\d+);/.test(ua))
			ie = true;
			ieVersion = parseInt(RegExp.$1, 10);
		else if (/Midori/.test(ua))
			midori = true;
		else if (/Opera/.test(ua))
			opera = true;
		else if (/Safari/.test(ua))
			safari = true;
		else if (/Silk/.test(ua))
			silk = true;
		else if (/Trident\/(\d+\.\d+);/.test(ua))
		{
			ie = true;
			trident = true;
			tridentVersion = parseInt(RegExp.$1, 10);
		}

        // WebApp mode in iOS
        if( navigator['standalone'] )
            webApp = true;

        if( navigator['isCocoonJS'] )
            cocoonJS = true;

        if( typeof window.ejecta !== "undefined" )
            ejecta = true;

		// os
		if( /Android/.test( ua ) )
			android = true;
		else if (/CrOS/.test(ua))
			chromeOS = true;
		else if (/iP[ao]d|iPhone/i.test(ua))
			iOS = true;
		else if (/Linux/.test(ua))
			linux = true;
		else if (/Mac OS/.test(ua))
			macOS = true;
		else if (/Windows/.test(ua))
			windows = true;

		if (windows || macOS || (linux && silk === false))
			desktop = true;

		// features
		webAudio = !!(window['webkitAudioContext'] || window['AudioContext']); 
        canvas = !!window['CanvasRenderingContext2D'];
        try
		{
			localStorage = !!localStorage.getItem;
        }
		catch( error )
		{
			localStorage = false;
        }
        file = !!window['File'] && !!window['FileReader'] && !!window['FileList'] && !!window['Blob'];
        fileSystem = !!window['requestFileSystem'];
        webGL = (function(){ try { var canvas = document.createElement( 'canvas' ); return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas    .getContext( 'experimental-webgl' ) ); } catch( e ) { return false; } } )();
        if( webGL === null || webGL === false )
            webGL = false;
        else
            webGL = true;
        worker = !!window['Worker'];
        if( 'ontouchstart' in document.documentElement || (window.navigator.maxTouchPoints && window.navigator.maxTouchPoints > 1) )
            touch = true;
        if( window.navigator.msPointerEnabled || window.navigator.pointerEnabled )
            mspointer = true;
        pointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
        quirksMode = (document.compatMode === 'CSS1Compat') ? false : true;

	})();

	z2.device = 
	{
		// browsers
		arora : arora,
		chrome : chrome,
		epiphany : epiphany,
	   	firefox : firefox,
	   	mobileSafari : mobileSafari,
	   	ie : ie,
	   	ieVersion : ieVersion,
	   	midori : midori,
	   	opera : opera,
	   	safari : safari,
	   	silk : silk,
	   	trident : trident,
	   	tridentVersion : tridentVersion;
		// browser 'extra'
		webApp : webApp,
	   	cocoonJS : cocoonJS,
	   	ejecta : ejecta,
		// operating systems
		android : android,
	   	chromeOS : chromeOS,
	   	iOS : iOS,
	   	linux : linux,
	   	macOS : macOS,
	   	windows : windows,
		// features
		webAudio : webAudio,
		canvas : canvas,
	   	localStorage : localStorage,
	   	file : file,
	   	fileSystem : fileSystem,
	   	webGL : webGL,
	   	worker : worker,
	   	touch : touch,
	   	mspointer : mspointer,
	   	pointerLock : pointerLock,
	   	quirksMode : quirksMode
	};
};

