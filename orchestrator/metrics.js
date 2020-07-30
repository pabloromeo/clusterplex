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
    labelNames: ['worker_name'],
})

const workerLoadTasksStats = new client.Gauge({
    name : 'worker_load_tasks',
    help : 'Worker Load - Tasks Count',
    labelNames: ['worker_name'],
})

const workerLoadOpsStats = new client.Gauge({
    name : 'worker_load_ops',
    help : 'Worker Load - CPU ops',
    labelNames: ['worker_name'],
})

const workerLoadRankStats = new client.Gauge({
    name : 'worker_load_rank',
    help : 'Worker Load - Rank',
    labelNames: ['worker_name'],
})

module.exports = {
    jobPosted : () => { counterJobsPosted.inc(1) },
    jobCompleted : () => { counterJobsCompleted.inc(1) },
    jobSucceeded : () => { counterJobsSucceeded.inc(1) },
    jobFailed : () => { counterJobsFailed.inc(1) },
    jobKilled : () => { counterJobsKilled.inc(1) },

    setActiveWorkers : (amount) => { gaugeWorkers.set(amount) },
    setActiveJobPosters : (amount) => { gaugeJobPosters.set(amount) },
    setWorkerLoadCPU : (workerName, value) => { workerLoadCPUStats.labels(workerName).set(value) },
    setWorkerLoadTasks : (workerName, value) => { workerLoadTasksStats.labels(workerName).set(value) },
    setWorkerLoadOps : (workerName, value) => { workerLoadOpsStats.labels(workerName).set(value) },
    setWorkerLoadRank : (workerName, value) => { workerLoadRankStats.labels(workerName).set(value) },
    
    injectMetricsRoute : (app) => {  
        app.get('/metrics', (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(client.register.metrics());
        })
    }
}
