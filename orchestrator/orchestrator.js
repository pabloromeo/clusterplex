const { v4: uuid } = require('uuid');
const STREAM_SPLITTING = process.env.STREAM_SPLITTING || 'OFF'

// selection strategies:
// RR : Round-Robin
// LOAD: Lowest CPU load
// TASK: Lowest task count
const WORKER_SELECTION_STRATEGY_RR = 'RR'
const WORKER_SELECTION_STRATEGY_LOAD_CPU = 'LOAD_CPU'
const WORKER_SELECTION_STRATEGY_LOAD_TASKS = 'LOAD_TASKS'
const WORKER_SELECTION_STRATEGY = process.env.WORKER_SELECTION_STRATEGY || WORKER_SELECTION_STRATEGY_LOAD_CPU

const metrics = require('./metrics')

class Worker {
    constructor(id, socketId, host) {
        this.id = id
        this.socketId = socketId
        this.host = host
        this.name = `${this.id}|${this.host}`
        this.stats = { cpu: 0, tasks: 0 }
        this.activeTaskCount = 0
        this.usageCounter = 0
    }

    onTaskAssigned() {
        this.activeTaskCount++
        this.usageCounter++
    }

    onTaskUnassigned() {
        this.activeTaskCount--
    }

    onRegister() {
    }

    onUnregister() {
    }

    updateStats(stats) {
        this.stats = { cpu : parseFloat(stats.cpu), tasks: parseInt(stats.tasks)}
        metrics.setWorkerLoadCPU(this.id, this.host, this.stats.cpu)
    }
}

class WorkerSet {
    constructor() {
        this.workers = new Map()
        this.workerSelectionStrategy = this.getWorkerSelectionStrategy()
    }

    register(worker) {
        console.log(`Registering worker ${worker.name}`)
        this.workers.set(worker.id, worker)
        worker.onRegister()
        metrics.setActiveWorkers(this.size())
    }

    unregister(socketId) {
        let worker = this.findBySocketId(socketId)
        if (worker) {
            console.log(`Unregistering worker ${worker.name}`)
            worker.onUnregister()
            this.workers.delete(worker.id)
        } else {
            console.error(`No worker found for socket ${socketId}`)
        }
        metrics.setActiveWorkers(this.size())
    }

    findById(id) {
        return this.workers.get(id)
    }

    findBySocketId(socketId) {
        let workerArray = Array.from(this.workers.values())
        let worker = workerArray.filter(w => w.socketId === socketId)
        if (worker.length > 0)
            return worker[0]
        return null
    }

    getNextAvailableWorker() {
        if (this.workers.size == 0) {
            return null
        }
        return this.workerSelectionStrategy(); 
    }

    updateStats(socketId, stats) {
        var worker = this.findBySocketId(socketId)
        if (worker) {
            worker.updateStats(stats)
        }
        else {
            console.warn(`Received stats from unregistered worker on socket ${socketId}`)
        }
    }

    size() {
        return this.workers.size
    }

    getWorkerSelectionStrategy() {
        console.debug(`Using Worker Selection Strategy: ${WORKER_SELECTION_STRATEGY}`)

        switch (WORKER_SELECTION_STRATEGY) {
            case WORKER_SELECTION_STRATEGY_RR:
                this.roundRobinIndex = -1
                return this.roundRobinSelector
            case WORKER_SELECTION_STRATEGY_LOAD_CPU:
                return this.loadBasedSelector
            case WORKER_SELECTION_STRATEGY_LOAD_TASKS:
                return this.taskLoadBasedSelector
        }
    }
    roundRobinSelector() {
        let currentWorkers = Array.from(this.workers.values())
        this.roundRobinIndex = (this.roundRobinIndex + 1) % currentWorkers.length
        return currentWorkers[this.roundRobinIndex]
    }

    loadBasedSelector() {
        let currentWorkers = Array.from(this.workers.values())
        if (currentWorkers.length > 0) {
            return currentWorkers.reduce((a,b) => a.stats.cpu < b.stats.cpu ? a : b)
        } else {
            return null
        }
    }

    taskLoadBasedSelector() {
        let currentWorkers = Array.from(this.workers.values())
        if (currentWorkers.length > 0) {
            return currentWorkers.reduce((a,b) => a.stats.tasks < b.stats.tasks ? a : b)
        } else {
            return null
        }
    }
}

class JobPoster {
    constructor(id, socketId, host) {
        this.id = id
        this.socketId = socketId
        this.host = host
        this.name = `${this.id}|${host}`
    }
}

class Job {
    constructor(jobPosterId, payload) {
        this.id = uuid()
        this.jobPosterId = jobPosterId
        this.payload = payload
        this.tasks = []     // when all tasks in the job are finished, the job is done
        this.status = 'pending'
        this.result = null
    }

    addTask(type, payload) {
        this.tasks.push(new Task(this, uuid(), type, payload))
    }

    notifyTaskUpdate(task) {
        if (task.status === 'done') {
            //on first failure, the job fails
            if (!task.result) {
                this.result = false
            }

            if (this.tasks.filter(x => x.status !== 'done').length === 0) {
                this.status = 'done'
                // result is true if all tasks have a result of true
                this.result = this.tasks.every(x => x.result)
            }
        }
    }
}

class Task {
    // a portion of the job to complete
    constructor(job, id, type, payload) {
        this.job = job
        this.id = id
        this.type = type
        this.payload = payload
        this.status = 'pending'
        this.workerId = null
        this.result = null
        this.error = null
    }

    assignTo(worker) {
        this.workerId = worker.id
        this.status = 'assigned'
        worker.onTaskAssigned();
    }

    unassignFrom(worker) {
        worker.onTaskUnassigned();
    }

    update(status, result, error) {
        this.status = status
        this.result = result
        this.error = error
        this.job.notifyTaskUpdate(this)
    }
}

class TaskUpdate {
    constructor(taskId, taskStatus, taskResult, taskError) {
        this.taskId = taskId
        this.taskStatus = taskStatus
        this.taskResult = taskResult
        this.taskError = taskError
    }
}

class WorkQueue {
    constructor(onRunTask, onTaskComplete, onTaskKilled, onJobComplete, onJobKilled) {
        this.tasks = new Map()
        this.jobs = new Set()
        this.onRunTask = onRunTask
        this.onTaskComplete = onTaskComplete
        this.onTaskKilled = onTaskKilled
        this.onJobComplete = onJobComplete
        this.onJobKilled = onJobKilled

        var self = this
        setInterval(() => { self.step() }, 2000)
    }

    enqueue(job) {
        console.log(`Queueing job ${job.id}`)
        this.jobs.add(job)
        for (const task of job.tasks) {
            console.log(`Queueing task ${task.id}`)
            this.tasks.set(task.id, task)            
        }
    }

    update(taskUpdate) {
        console.log(`Received update for task ${taskUpdate.taskId}, status: ${taskUpdate.taskStatus}`)
        
        let task = this.tasks.get(taskUpdate.taskId)
        
        if (!task) {
            console.log(`Discarding task update for ${taskUpdate.taskId}`)
            return
        }

        task.update(taskUpdate.taskStatus, taskUpdate.taskResult, taskUpdate.taskError)
        if (task.status === 'done') {
            this.onTaskComplete(task)
            this.tasks.delete(task.id)
            console.log(`Task ${task.id} complete`)
        }
        if (task.job.status === 'done') {
            this.onJobComplete(task.job)
            this.jobs.delete(task.job)
            console.log(`Job ${task.job.id} complete`)
        }
    }

    kill(jobSelector) {
        let filteredJobs = Array.from(this.jobs).filter(jobSelector)
        for (const job of filteredJobs) {
            console.log(`Killing job ${job.id}`)
            for (const task of job.tasks) {
                if (task.status !== 'done') {
                    task.status = 'killed'
                    this.onTaskKilled(task)
                }
                this.tasks.delete(task.id)
            }
            job.status = 'killed'
            this.jobs.delete(job)
            this.onJobKilled(job)
        }
    }

    step() {
        for (const task of this.tasks.values()) {
            //cleanup
            if (task.status === 'done' || task.status === 'killed')
                this.tasks.delete(task)
            else if (task.status === 'pending') {
                console.log(`Running task ${task.id}`)
                this.onRunTask(task)
            }
        }
    }
}

module.exports.injectMetricsRoute = (app) => {
    return metrics.injectMetricsRoute(app)
}

module.exports.init = (server) => {
    console.log('Initializing orchestrator')

    const io = require('socket.io')(server, {
        serveClient: false
    });

    let workers = new WorkerSet()
    let jobPosters = new Map()
    let jobs = new Set()
    let workQueue = new WorkQueue(runTask, taskComplete, taskKilled, jobComplete, jobKilled)
    let disconnectionHandlers = new Map()
    let taskBuilder = getTaskBuilderStrategy(STREAM_SPLITTING);

    function runTask(task) {
        let worker = workers.getNextAvailableWorker()
        if (worker) {
            console.log(`Forwarding work request to ${worker.name}`)
            task.assignTo(worker)
            io.sockets.sockets[worker.socketId].emit('worker.task.request', {
                taskId: task.id,
                payload: task.payload
            })
        } else {
            console.log('No worker available at the moment')
        }
    }

    function taskComplete(task) {
        console.log(`Task ${task.id} complete, result: ${task.result}`)
        let worker = workers.findById(task.workerId)
        if (worker) {
            task.unassignFrom(worker)
        }
    }

    function taskKilled(task) {
        if (task.status !== 'done') {
            let worker = workers.findById(task.workerId)
            if (worker) {
                task.unassignFrom(worker)
                let workerSocket = io.sockets.sockets[worker.socketId]
                if (workerSocket !== undefined && workerSocket.connected) {
                    workerSocket.emit('worker.task.kill', { taskId: task.id })
                    console.log(`Telling worker ${worker.name} to kill task ${task.id}`)
                }
            }
        }
    }

    function jobComplete(job) {
        console.log(`Job ${job.id} complete, tasks: ${job.tasks.length}, result: ${job.result}`)
        let jobPoster = jobPosters.get(job.jobPosterId)
        let posterSocket = io.sockets.sockets[jobPoster.socketId]
        if (posterSocket !== undefined && posterSocket.connected) {
            posterSocket.emit('jobposter.job.response', { result : job.result })
            console.log('JobPoster notified')
        }
        console.log(`Removing job ${job.id}`)
        jobs.delete(job)
    }

    function jobKilled(job) {
        jobs.delete(job)
        console.log(`Job ${job.id} killed`)
    }

    function findJobPosterBySocketId(id) {
        for(const jobPoster of jobPosters.values()) {
            if (jobPoster.socketId === id)
                return jobPoster;
        }
        return null;
    }

    function workerDisconnectionHandler(socket) {
        console.log(`Unregistering worker at socket ${socket.id}`)
        workers.unregister(socket.id)
    }

    function jobPosterDisconnectionHandler(socket) {
        let jobPoster = findJobPosterBySocketId(socket.id)
        if (jobPoster) {
            console.log(`Removing job-poster ${jobPoster.name} from pool`)
            jobPosters.delete(jobPoster.id)
            
            workQueue.kill(v => { return v.jobPosterId === jobPoster.id })
        }
    }

    function getTaskBuilderStrategy(streamSplittingSetting) {
        if (streamSplittingSetting === 'ON') {
            console.log('Stream-Splitting: ENABLED')
            return multiWorkerTaskBuilder
        }
        else {
            console.log('Stream-Splitting: DISABLED')
            return singleWorkerTaskBuilder
        }
    }

    function singleWorkerTaskBuilder(job) {
        console.log('Creating single task for the job')
        let request = job.payload
        job.addTask(request.type, request.payload)
    }

    function multiWorkerTaskBuilder(job) {
        console.log('Creating multiple tasks for the job')
        let request = job.payload
        let args = request.payload.args

        console.log(`All Args => ${args}`)

        let segmentTime = parseInt(getArgsValueOf(args, '-segment_time'))
        let ss = parseInt(getArgsValueOf(args, '-ss'))
        let minSegDuration = parseInt(getArgsValueOf(args, '-min_seg_duration'))
        let skipToSegment = parseInt(getArgsValueOf(args, '-skip_to_segment'))
        let segmentStartNumber = parseInt(getArgsValueOf(args, '-segment_start_number'))    

        console.log(`Args => segment_time: ${segmentTime}, ss: ${ss}, min_seg_duration: ${minSegDuration}, skip_to_segment: ${skipToSegment}, segment_start_number: ${segmentStartNumber}`)

        job.addTask(request.type, request.payload) 
        
        // //if no ss then we only generate one streaming task (at least for now)
        // if (!ss) {
        //     job.addTask(request.type, request.payload)            
        //     return
        // }

        // let segmentDuration = parseInt(minSegDuration / 1000000)

        // const SEGMENTS_PER_NODE = 5
        // const totalWorkers = 2 // workers.size()
        // for (let i = 0; i < totalWorkers; i++) {
        //     console.log(`Multi-part segment ${i + 1}`)
        //     let newPayload = JSON.parse(JSON.stringify(request.payload))
        //     let newSs = ss + segmentDuration * SEGMENTS_PER_NODE * i
        //     setArgsValueOf(newPayload.args, '-ss', newSs)
        //     setArgsValueOf(newPayload.args, '-skip_to_segment', skipToSegment + SEGMENTS_PER_NODE * i)
            
        //     //remove start_at_zero argument
        //     //newPayload.args.splice(newPayload.args.indexOf('-start_at_zero'), 1)

        //     //let iIndex = newPayload.args.indexOf('-i')
        //     //newPayload.args.splice(iIndex, 0, '-t')
        //     //newPayload.args.splice(iIndex + 1, 0, segmentDuration * SEGMENTS_PER_NODE)
        //     job.addTask(request.type, newPayload)
        //     console.log(`Args => ${newPayload.args}`)
        // }
    }

    function getArgsValueOf(arr, key) {
        let i = arr.indexOf(key)
        if (i >= 0) {
            return arr[i+1]
        }
    }

    function setArgsValueOf(arr, key, newValue) {
        let i = arr.indexOf(key)
        if (i >= 0) {
            arr[i+1] = newValue
        }
    }

    console.log('Setting up websockets')

    io.on('connection', socket => {
        console.log(`Client connected: ${socket.id}`)

        socket.on('worker.stats', stats => {
            workers.updateStats(socket.id, stats)
        })

        socket.on('worker.announce', data => {
            const worker = new Worker(data.workerId, socket.id, data.host);
            workers.register(worker)
            disconnectionHandlers.set(socket.id, workerDisconnectionHandler)
            console.log(`Registered new worker: ${worker.name}`)
        })

        socket.on('jobposter.announce', data => {
            const jobposter = new JobPoster(data.jobPosterId, socket.id, data.host);
            jobPosters.set(jobposter.id, jobposter)
            disconnectionHandlers.set(socket.id, jobPosterDisconnectionHandler)
            console.log(`Registered new job poster: ${jobposter.name}`)
            socket.emit('jobposter.produce')    // tell jobPoster he can send work
        })

        socket.on('jobposter.job.request', request => {
            let jobPoster = findJobPosterBySocketId(socket.id)
            
            let job = new Job(jobPoster.id, request)
            taskBuilder(job)    // creates N tasks for the job request
            jobs.add(job)
            workQueue.enqueue(job)
        })

        socket.on('worker.task.update', data => {
            let taskUpdate = new TaskUpdate(data.taskId, data.status, data.result, data.error)
            workQueue.update(taskUpdate)
        })
    
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`)
            let handler = disconnectionHandlers.get(socket.id)
            if (handler) {
                handler(socket)
                disconnectionHandlers.delete(socket.id)
            }
        })
    })
    console.log('Ready')
}
