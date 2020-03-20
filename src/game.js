// game.js
// Copyright 2014 Joshua C Shepard
// main 'game' object for the z-squared engine
//
// TODO:
// -

import View from './view-pixi.js'
import time from './time.js'
import * as audio from './audio.js'
import loader from './loader.js'


// TODO: not yet used
// the main ecs loop
//function mainloop(et)
//const mainloop = (et) =>
//{
////    if(game.debug && z2.stats)
//    if(this.debug && z2.stats)
//        z2.stats.begin()
//
//    // TODO: problem with this is that ecsUpdate calculates the time delta, so
//    // by intercepting here the dt doesn't get updated properly
////    if(!game.paused) {
//    if(!this.paused) {
//        // update the scene
//        // (lets it implement any non-ECS behaviour it wants)
////        if(game.scene && game.scene.ready) {
//        if(this.scene && this.scene.ready) {
//            // let the scene do any specific updating that it needs
////            game.scene.update()
//            this.scene.update()
//
//            // update the ECS system
//            ecs.ecsUpdate(et)
//        }
//    }
//
//    if(game.debug && z2.stats)
//        z2.stats.end()
//}

/**
* @class Game
* @classdesc Game class - this is where it all starts
*/
export default class Game
{
    // TODO: once we start using the start()/startScene() methods, make these
    // private:
    debug = false
    canvas = null
    force_canvas = false
    paused = false
    pausedSprite = null
    pausedBg = null
    scene = null

    /**
    * @constructor
    * @arg {Canvas} canvas The HTML5 Canvas on which to draw the game
    * @arg {boolean} [force_canvas] Should we force the use of the Canvas
    * renderer (disabling WebGL)?
    */
    constructor(canvas, force_canvas)
    {
        this.canvas = canvas
        this.force_canvas = force_canvas || false

        window.game = this

        // TODO: support different widths/heights than the canvas'
        if(force_canvas)
            // eslint-disable-next-line no-undef
            this.renderer = new PIXI.CanvasRenderer(canvas.width, canvas.height, canvas, true)
        else
            // eslint-disable-next-line no-undef
            this.renderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, canvas, true)

        // create a Pixi stage for everything to be drawn on
        // eslint-disable-next-line no-undef
        //this.stage = new PIXI.Stage(0x800000)
        // eslint-disable-next-line no-undef
        this.stage = new PIXI.Stage(0x000000)
        this.stage.interactive = false

        // create a view with some default values
        this.view = new View(this, this.canvas.width, this.canvas.height)

        // setup handlers for visibility change events (pause game when focus is
        // lost)
        this.paused = false
        const visibilityChange = event => {
            if(this.paused === false && (event.type === 'pagehide' || event.type === 'blur' || document.hidden === true || document.webkitHidden === true))
                this.pause()
            else
                this.resume()
        }
        document.addEventListener('visibilitychange', visibilityChange, false)
        document.addEventListener('webkitvisibilitychange', visibilityChange, false)
        document.addEventListener('pagehide', visibilityChange, false)
        document.addEventListener('pageshow', visibilityChange, false)
        window.onblur = visibilityChange
        window.onfocus = visibilityChange
    }

    pause()
    {
        if(this.paused)
            return

        this.paused = true
        time.pause()
        audio.pauseSounds()

        // TODO: black background too, like msgs
        // display paused graphic, if we have one
        if(this.pausedSprite) {
            this.view.add(this.pausedBg, true)
            this.view.add(this.pausedSprite, true)
            this.renderer.render(this.stage)
        }
        else {
            const img = loader.getAsset('paused-image')
            if(img) {
                // eslint-disable-next-line no-undef
                this.pausedBg = new PIXI.Graphics()
                this.pausedBg.beginFill(0x000000)
                this.pausedBg.alpha = 0.85
                this.pausedBg.drawRect(0, 0, this.view.width, this.view.height)
                this.pausedBg.endFill()

                // eslint-disable-next-line no-undef
                const bt = new PIXI.BaseTexture(img)
                // eslint-disable-next-line no-undef
                const t = new PIXI.Texture(bt)
                // eslint-disable-next-line no-undef
                this.pausedSprite = new PIXI.Sprite(t)

                this.view.add(this.pausedBg, true)
                this.view.add(this.pausedSprite, true)
                this.renderer.render(this.stage)
            }
        }
    }

    resume()
    {
        if(!this.paused)
            return

        this.paused = false
        audio.resumeSounds()
        time.resume()

        // hide paused graphic, if we have one
        if(this.pausedSprite) {
            this.view.remove(this.pausedBg, true)
            this.view.remove(this.pausedSprite, true)
            this.renderer.render(this.stage)
        }
    }

    // TODO: not yet used
    /** Start the main loop
    * @function Game#start
    */
//    start()
//    {
//        // start the main game loop
//        z2.main(mainloop)
//    }

    // TODO: not yet used
    /** Start a scene by name or object
    * @function Game#startScene
    * @arg {Scene|Function} scene The Scene object or the function to create
    * the Scene object which to start. If it is a function, any remaining args
    * will be passed to the function
    */
//    startScene(scene)
//    {
//        let new_scene
//        if(typeof scene === 'object') {
//            new_scene = scene
//        }
//        else if(typeof scene === 'function') {
//            const extras = Array.prototype.slice.call(arguments, 1)
//            if( extras )
//                new_scene = scene.apply(null, extras)
//            else
//                new_scene = scene()
//        }
//        else
//            throw new Error("Scene object passed to Game.startScene() is neither an object nor a function")
//
//        // if we have a scene running, stop it first
//        if(this.scene) {
//            this.scene.stop()
//            // then delete it
//            this.scene.destroy()
//        }
//        // then start the new scene
//        this.scene = new_scene
//        this.scene.start()
//    }
}

