"use strict"

// z2.js
// Copyright 2013 Joshua C Shepard
// zed-squared html5 game components
// TODO:
// -

class zSquared
{
	loaded = {}
    raf = null

	/** Main z2 namespace object
	 * @global
	 * @namespace
	 */
    require(modules)
    {
        if(!(modules instanceof Array))
            throw new Error("Non-array type passed to require()")
        for(let i = 0; i < modules.length; i++) {
            // don't reload modules
            let m = this.loaded[modules[i]]
            if(!m) {
                m = zSquared[modules[i]] || modules[i]
                if(!(m instanceof Function))
                    throw new Error( "Unknown module: '" + m + "' passed to require()" )
                m(this)
                this.loaded[modules[i]] = true
            }
        }
    }

    /** Main game loop helper. Starts main loop with given fcn.
     * @function z2#main
     * @arg {Function} update Function to be called each frame. Takes a
     * single parameter: the elapsed time since the loop was first started
     * (the same param that requestAnimationFrame passes)
     */
    main(update)
    {
        const requestAnimationFrame = window.requestAnimationFrame || 
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame || 
            window.msRequestAnimationFrame

        // start the main loop
        const f = et => {
            update( et )
            this.raf = requestAnimationFrame(f)
        }
        this.raf = requestAnimationFrame(f)
    }

    /** Stops the main loop
     * @function z2#stopMain
     */
    stopMain()
    {
        const cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame
        cancelAnimationFrame( this.raf )
    }

    /** Function to create a canvas object
     * @function z2#createCanvas
     * @arg {Number} w Canvas width, in pixels
     * @arg {Number} h Canvas height, in pixels
     * @arg {boolean} [add_to_doc] Should this canvas be added to the
     * document?
     * @arg {DOM Element} [parent] Parent element in DOM
     * @returns {Canvas} The Canvas object
     */
    createCanvas(w, h, parent, add_to_doc)
    {
        let canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        if(add_to_doc) {
            if(parent)
                parent.appendChild(canvas)
            else
                document.body.appendChild(canvas)
        }
        return canvas
    }

    /** Wraps text at 'width' columns
     * @function z2#wrapText
     * @arg {string} text Text to wrap
     * @arg {number} width Column at which to wrap text 
     * @returns {string} Wrapped text (input with newlines added)
     */
    wrapText(text, width)
    {
        width = width || 75
        var regex = '.{1,' + width + '}(\\s|$)' + '|\\S+?(\\s|$)'
        return text.match(RegExp(regex, 'g')).join('\n')
    }

    /** Generate a random number within bounds
     * @function z2#random
     * @arg {number} min minimum value to generate
     * @arg {number} max maximum value to generate
     * @arg {Function} mod Function to be applied to result prior to
     * returning (e.g. pass 'Math.round' to get a number rounded to an
     * integer value)
     * @returns {number} random number in [min,max] range
     */
    random(min, max, round)
    {
        var val
        if(min === max)
            val = min
        else
            val = (Math.random() * (max - min)) + min
        if(round)
            return round((Math.random() * (max - min)) + min)
        else
            return val
    }

    /** Find an item in an array by 'name' property
     * @function z2#findByName
     * @arg {array} array Array in which to find object
     * @arg {string} name
     * @returns item with given name
     */
    findByName(array, name)
    {
        for(let i = 0; i < array.length; i++) {
            if(array[i].name && array[i].name === name)
                return array[i]
        }
        return null
    }

    /** Toggel fullscreen mode, when available
     * @function z2#toggleFullScreen
     */
    toggleFullScreen()
    {
        const doc = window.document
        const de = doc.documentElement

        const requestFullScreen = de.requestFullScreen ||
            de.mozRequestFullScreen ||
            de.webkitRequestFullScreen ||
            de.msRequestFullscreen
        const cancelFullScreen = doc.exitFullScreen ||
            doc.mozCancelFullScreen ||
            doc.webkitExitFullscreen ||
            doc.msExitFullscreen

        if(!doc.fullscreenElement && !doc.mozFullScreenElement	&& 
            !doc.webkitFullscreenElement && !doc.msFullscreenElement)
            requestFullScreen.call(de)
        else
            cancelFullScreen.call(doc)
    }

    /**
     * Save state to local storage
     * @function z2#saveState
     * @arg {string} file
     * @arg {string} state
     */
    saveState(file, state)
    {
        window.localStorage.setItem(file, JSON.stringify(state))
    }
    
    /**
     * Load state from local storage
     * @function z2#loadState
     * @arg {string} file
     * @returns {Object}
     */
    loadState(file)
    {
        const state = window.localStorage.getItem(file)
        if(state)
            return JSON.parse(state)
        else
            return null
    }

}

