const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3500'
const TRANSCODER_PATH = process.env.TRANSCODER_PATH || '/usr/lib/plexmediaserver/'
const TRANSCODER_NAME = process.env.TRANSCODER_NAME || 'Plex Transcoder'
const TRANSCODER_LOCAL_NAME = process.env.TRANSCODER_LOCAL_NAME || 'originalTranscoder'
const PMS_IP = process.env.PMS_IP || '127.0.0.1'
const TRANSCODER_VERBOSE = process.env.TRANSCODER_VERBOSE || '0'
// Operating mode:
// local
// remote
// both
const TRANSCODE_OPERATING_MODE = process.env.TRANSCODE_OPERATING_MODE || 'both'

const { spawn } = require('child_process');
const uuid = require('uuid/v4');
var ON_DEATH = require('death')({debug: true})

let uniqueId = uuid()

if (TRANSCODE_OPERATING_MODE == 'local') {
    transcodeLocally(process.cwd(), process.argv.slice(2), process.env)
} else {
    var socket = require('socket.io-client')(ORCHESTRATOR_URL);

    function setValueOf(arr, key, newValue) {
        let i = arr.indexOf(key)
        if (i > 0) {
            arr[i+1] = newValue
        }
    }

    socket.on('connect', () => {
        console.log('JobPoster connected, announcing')
        socket.emit('jobposter.announce', 
        {
            jobPosterId: uniqueId,
            host: process.env.HOSTNAME
        })
    })

    let workSent = false
    socket.on('jobposter.produce', () => {
        console.log('Orchestrator requesting pending work')

        if (workSent) {
            console.log('Work already sent, nothing to do')
            return
        }

        let newArgs = process.argv.slice(2).map((v) => {
            return v.replace('127.0.0.1:', `${PMS_IP}:`)
        })

        if (TRANSCODER_VERBOSE == '1') {
            console.log('Setting VERBOSE to ON')
            setValueOf(newArgs, '-loglevel', 'verbose')
            setValueOf(newArgs, '-loglevel_plex', 'verbose')    
        }

        let environmentVariables = process.env
        let workDir = process.cwd()

        console.log(`Sending request to orchestrator on: ${ORCHESTRATOR_URL}`)
        if (TRANSCODER_VERBOSE == '1') {
            console.log(`cwd => ${JSON.stringify(workDir)}`)
            console.log(`args => ${JSON.stringify(newArgs)}`)
            console.log(`env => ${JSON.stringify(environmentVariables)}`)
        }
        socket.emit('jobposter.job.request', 
        {
            type: 'transcode',
            payload: {
                cwd: workDir,
                args: newArgs,
                env: environmentVariables
            }
        })

        workSent = true
    })

    socket.on('jobposter.job.response', response => {
        if (!response.result) {
            console.error('Distributed transcoder failed, calling local')
            if (TRANSCODE_OPERATING_MODE == 'both') {
                transcodeLocally(process.cwd(), process.argv.slice(2), process.env);
            } else {
                // remote only
                console.error(`Error transcoding and local transcode is disabled: TRANSCODE_OPERATING_MODE=${TRANSCODE_OPERATING_MODE}`)
                process.exit(1)
            }
        } else {
            console.log("Remote Transcoding was successful")
            process.exit(0)
        }
    })
}

function transcodeLocally(cwd, args, env) {
    let child = spawn(TRANSCODER_PATH + TRANSCODER_LOCAL_NAME, args, {
        cwd: cwd,
        env: env
    });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    withErrors = 0;
    child.on('error', (err) => {
        console.error(err);
        withErrors = 1;
    });
    child.on('close', (code) => {
        console.log('Completed local transcode');
        process.exit(withErrors);
    });
}

ON_DEATH( (signal, err) => {
    console.log('ON_DEATH signal detected')
    console.error(err)
    process.exit(signal)
})
