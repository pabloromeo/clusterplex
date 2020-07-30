const LISTENING_PORT = process.env.LISTENING_PORT || 3501
const STAT_CPU_INTERVAL = process.env.STAT_CPU_INTERVAL || 2000
const STAT_CPU_OPS_DURATION = process.env.STAT_CPU_OPS_DURATION || 1000
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3500'
const TRANSCODER_PATH = process.env.TRANSCODER_PATH || '/usr/lib/plexmediaserver/'
const TRANSCODER_NAME = process.env.TRANSCODER_NAME || 'Plex Transcoder'

var app = require('express')();
var server = require('http').createServer(app);
var socket = require('socket.io-client')(ORCHESTRATOR_URL);
var cpuStat = require('cpu-stat');
const { spawn, exec } = require('child_process');
const { v4: uuid } = require('uuid');
const { fib, dist } = require('cpu-benchmark');

var ON_DEATH = require('death')({debug: true})

// initialize CPU stats to a high number until it is overwritten by first sample
let cpuUsage = 9999.0;

// calculate CPU operations for worker stats (simple benchmark over STAT_CPU_OPS_DURATION milliseconds)
const ops = dist(STAT_CPU_OPS_DURATION)
console.log(`Computed CPU ops => ${ops}`)

// healthcheck endpoint
app.get('/health', (req, res) => {
  res.send('Healthy');
})

server.listen(LISTENING_PORT, () => {
    console.log(`Worker listening on port ${LISTENING_PORT}`)
});
  
// calculate cpu usage every 2 seconds
setInterval( () => {
    cpuStat.usagePercent({ sampleMs: STAT_CPU_INTERVAL }, (err, percent, seconds) => {
        if (!err) {
            cpuUsage = percent.toFixed(2)
            if (socket.connected) {
                socket.emit('worker.stats', { cpu: cpuUsage, tasks : taskMap.size, ops: ops })
            }
        }
    });
}, STAT_CPU_INTERVAL)

let workerId = uuid()
let taskMap = new Map()

console.debug(`Initializing Worker ${workerId}|${process.env.HOSTNAME}`)

socket.on('connect', () => {
    console.log(`Worker connected on socket ${socket.id}`)
    socket.emit('worker.announce', 
    {
        workerId: workerId,
        host: process.env.HOSTNAME
    })
})

socket.on('worker.task.request', taskRequest => {
    console.log('Received task request')

    socket.emit('worker.task.update', {
        taskId: taskRequest.taskId,
        status: 'received'
    })

    var child
    if (taskRequest.payload.args[0] === 'testpayload') {
        console.log('Starting test of waiting for 5 seconds')
        child = exec('sleep 5');
    } else {
        child = spawn(TRANSCODER_PATH + TRANSCODER_NAME, taskRequest.payload.args, {
            cwd: taskRequest.payload.cwd,
            env: taskRequest.payload.env
        });
    }

    taskMap.set(taskRequest.taskId, child)

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    let notified = false
    const completionHandler = (code) => {
        if (!notified) {
            console.log('Completed transcode')
            socket.emit('worker.task.update', { taskId: taskRequest.taskId, status: 'done', result: code === 0, exitCode : code })
            notified = true
            console.log('Removing process from taskMap')
            taskMap.delete(taskRequest.taskId)
        }
    }

    child.on('error', (err) => {
        console.error('Transcoding failed:')
        console.error(err)
        notified = true
        socket.emit('worker.task.update', { taskId: taskRequest.taskId, status: 'done', result: false, error: err.message })
        console.log('Orchestrator notified')

        console.log('Removing process from taskMap')
        taskMap.delete(taskRequest.taskId)
    })
    
    child.on('close', completionHandler)
    child.on('exit', completionHandler)

    socket.emit('worker.task.update', {
        taskId: taskRequest.taskId,
        status: 'inprogress'
    })
})

socket.on('worker.task.kill', data => {
    let taskEntry = taskMap.get(data.taskId)
    if (taskEntry) {
        console.log(`Killing child process for task ${data.taskId}`)
        taskEntry.kill()
        console.log('Removing process from taskMap')
        taskMap.delete(data.taskId)
    }
})

socket.on('disconnect', () => {
    console.log('Worker disconnected')
})

ON_DEATH( (signal, err) => {
    console.log('ON_DEATH signal detected')
    console.error(err)
    process.exit(signal)
})

