// audio.js
// Copyright 2013 Joshua C Shepard
// web audio functionality for zed-squared
//
// TODO:
// -

import time from './time.js'
import loader from './loader.js'


let AudioContext = window.AudioContext || window.webkitAudioContext

export let audioContext = new AudioContext()

const NUM_CHANNELS = 16

// audio buffer sources
const channels = new Array( NUM_CHANNELS )
// data about channels
// (only valid for active channels)
const channel_data = []
// initialize channel data
for(let i = 0; i < NUM_CHANNELS; i++) {
    channel_data[i] = {
        key: null,
        volume: 1,
        loop: false,
        start : 0,
        paused : 0,
        timeout : null
    }
}

function resetChannelData(idx)
{
    const cd = channel_data[idx]
    cd.key = null
    cd.volume = 1
    cd.loop = false
    cd.start = 0
    cd.paused = 0
    cd.timeout = null
}

function findChannel()
{
    for(let i = 0; i < channels.length; i++) {
        if(!channel_data[i].key)
            return i
    }
    return -1
}

function internalPlaySound(snd, channel, key, offset, volume, loop)
{
    // create a buffer source
    const src = audioContext.createBufferSource()

    // set the source buffer
    src.buffer = snd

    // loop?
    if(loop)
        src.loop = true

    // volume?
    if(volume) {
        const gain = audioContext.createGain()
        src.connect(gain)
        gain.gain.value = volume
        gain.connect(audioContext.destination)
    }
    else
        src.connect(audioContext.destination)

    // set this channel
    channels[channel] = src

    // set the channel data
    const cd = channel_data[channel]
    cd.key = key
    cd.volume = volume
    cd.loop = loop
    if(cd.paused)
        cd.start = time.system() - cd.paused
    else
        cd.start = time.system()
    cd.paused = 0

    // play
    src.start(0, offset)

    // set a timeout to remove from this channel
    channel_data[channel].timeout = setTimeout(() => { delete channels[channel]; resetChannelData( channel ); }, src.buffer.duration * 1000)
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
export function playSound(key, offset, volume, loop)
{
    // find an open channel & add sound to it
    const idx = findChannel()
    if(idx === -1)
        return -1

    offset = offset || 0

    // get the asset
    const snd = loader.getAsset(key)

    internalPlaySound(snd, idx, key, offset, volume, loop)

    return idx
}

/** Stop a sound from playing
 * @method z2#stopSound
 * @arg {number} channel Channel to stop playing
 */
export function stopSound(channel)
{
    // clear the timeout
    clearTimeout(channel_data[channel].timeout)
    // reset the channel data
    resetChannelData(channel)
    // stop playback
    const snd = channels[channel]
    if(snd)
        snd.stop()
}

/** Pause a sound
 * @method z2#pauseSound
 * @arg {number} channel Channel to pause
 */
export function pauseSound(channel)
{
    const cd = channel_data[channel]
    const snd = channels[channel]
    if(snd && cd.key && !cd.paused) {
        let t = time.system() - cd.start
        // handle offset greater than duration
        // (for looped sounds)
        t %= (snd.buffer.duration * 1000)
        // record the paused time
        cd.paused = t
        // clear the timeout
        clearTimeout(cd.timeout)
        // stop the playback
        if(snd)
            snd.stop()
    }
}

/** Resume playing a sound
 * @method z2#resumeSound
 * @arg {number} channel Channel to resume
 */
export function resumeSound(channel)
{
    const cd = channel_data[channel]
    // if we have a paused sound on this channel
    if(cd.key && cd.paused) {
        // get the asset
        const snd = loader.getAsset(cd.key)
        // reset the start time
        cd.start = time.system() - cd.paused
        // play the sound
        internalPlaySound(snd, channel, cd.key, cd.paused / 1000, cd.volume, cd.loop)
    }
}

/** Stop all sound from being played
 * @method z2#stopSounds
 */
export function stopSounds()
{
    for(let i = 0; i < channels.length; i++) {
        stopSound(i)
    }
}

/** Pause all sounds
 * @method z2#pauseSounds
 */
export function pauseSounds()
{
    for(let i = 0; i < channels.length; i++) {
        pauseSound(i)
    }
}

/** Resume all paused sounds
 * @method z2#pauseSounds
 */
export function resumeSounds()
{
    for(let i = 0; i < channels.length; i++) {
        resumeSound(i)
    }
}

