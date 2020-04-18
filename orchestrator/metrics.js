const client = require('prom-client');

//client.collectDefaultMetrics()

const counterJobsPosted = new client.Counter({
    name: 'jobs_posted',
    help: 'Jobs Posted'
  })

const counterJobsCompleted = new client.Counter({
    name: 'jobs_completed',
    help: 'Jobs Completed'
})

const counterJobsSucceeded = new client.Counter({
    name: 'jobs_succeeded',
    help: 'Jobs Succeeded'
})

const counterJobsFailed = new client.Counter({
    name: 'jobs_failed',
    help: 'Jobs Failed'
})

const counterJobsKilled = new client.Counter({
    name: 'jobs_killed',
    help: 'Jobs Killed'
})

const gaugeJobPosters = new client.Gauge({
    name: 'job_posters_active',
    help: 'Active Job Posters'
})

const gaugeWorkers = new client.Gauge({
    name: 'workers_active',
    help: 'Active Workers'
})

const workerLoadCPUStats = new client.Gauge({
    name : 'worker_load_cpu',
    help : 'Worker Load - CPU usage',
    labelNames: ['worker_id', 'worker_name'],
})

const workerLoadTasksStats = new client.Gauge({
    name : 'worker_load_tasks',
    help : 'Worker Load - Tasks Count',
    labelNames: ['worker_id', 'worker_name'],
})

module.exports = {
    jobPosted : () => { counterJobsPosted.inc(1) },
    jobCompleted : () => { counterJobsCompleted.inc(1) },
    jobSucceeded : () => { counterJobsSucceeded.inc(1) },
    jobFailed : () => { counterJobsFailed.inc(1) },
    jobKilled : () => { counterJobsKilled.inc(1) },

    setActiveWorkers : (amount) => { gaugeWorkers.set(amount) },
    setActiveJobPosters : (amount) => { gaugeJobPosters.set(amount) },
    setWorkerLoadCPU : (workerId, workerName, value) => { workerLoadCPUStats.labels(workerId, workerName).set(value) },
    setWorkerLoadTasks : (workerId, workerName, value) => { workerLoadTasksStats.labels(workerId, workerName).set(value) },
    
    injectMetricsRoute : (app) => {  
        app.get('/metrics', (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(client.register.metrics());
        })
    }
}
