const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3500'

const TRANSCODER_PATH = process.env.TRANSCODER_PATH || '/usr/lib/plexmediaserver/'
const TRANSCODER_LOCAL_NAME = process.env.TRANSCODER_LOCAL_NAME || 'originalTranscoder'
const PMS_IP = process.env.PMS_IP || '127.0.0.1'
const TRANSCODER_VERBOSE = process.env.TRANSCODER_VERBOSE || '0'
// Operating mode:
// local
// remote
// both
const TRANSCODE_OPERATING_MODE = process.env.TRANSCODE_OPERATING_MODE || 'both'
const TRANSCODE_EAE_LOCALLY = process.env.TRANSCODE_EAE_LOCALLY || false
// comma separated list of ignored codecs:
const IGNORED_CODECS = process.env.IGNORED_CODECS || ''

const { spawn } = require('child_process');
var ON_DEATH = require('death')({debug: true})

var jobPoster = require('./jobPoster')

if (TRANSCODE_OPERATING_MODE == 'local') {
    transcodeLocally(process.cwd(), process.argv.slice(2), process.env)
} else if (TRANSCODE_EAE_LOCALLY && process.argv.slice(2).filter(s => s.includes('eae_prefix')).length > 0) {
    console.log('EasyAudioEncoder used, forcing local transcode')
    transcodeLocally(process.cwd(), process.argv.slice(2), process.env)
} else if (IGNORED_CODECS && codecIgnored(extractPrimaryCodec(process.argv.slice(2)))) {
    console.log('Primary codec (' + extractPrimaryCodec(process.argv.slice(2)) + ') on ignore list, forcing local transcode')
    transcodeLocally(process.cwd(), process.argv.slice(2), process.env)
} else {
    function setValueOf(arr, key, newValue) {
        let i = arr.indexOf(key)
        if (i > 0) {
            arr[i+1] = newValue
        }
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
    
    jobPoster.postJob(ORCHESTRATOR_URL, 
    {
        type: 'transcode',
        payload: {
            cwd: workDir,
            args: newArgs,
            env: environmentVariables
        }
    },
    (response) => {
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
    }
    )
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

function extractPrimaryCodec(argList) {
    let indexPrimaryCodec = argList.findIndex(s => s == '-codec:0') + 1
    return (indexPrimaryCodec != 0 && argList.length >= indexPrimaryCodec) ? argList[indexPrimaryCodec].toLowerCase() : ''
}

function codecIgnored(codecString) {
    return (codecString == '') ? false : IGNORED_CODECS.toLowerCase().split(",").map(item=>item.trim()).includes(codecString)
}

ON_DEATH( (signal, err) => {
    console.log('ON_DEATH signal detected')
    console.error(err)
    process.exit(signal)
})
