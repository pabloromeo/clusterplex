const client = require('prom-client');

client.collectDefaultMetrics()

const gaugeActiveWorkers = new client.Gauge({
    name: 'active_workers',
    help: 'Active Workers'
  })

const workerLoadCPUStats = new client.Gauge({
    name : 'worker_load_cpu',
    help : 'Worker Load - CPU usage',
    labelNames: ['worker_id', 'worker_name'],
})

module.exports = {
    setActiveWorkers : (amount) => {
        gaugeActiveWorkers.set(amount)
    },
    setWorkerLoadCPU : (workerId, workerName, value) => {
        workerLoadCPUStats.labels(workerId, workerName).set(value)
    },
    injectMetricsRoute : (app) => {  
        app.get('/metrics', (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(client.register.metrics());
        })
    }
}
