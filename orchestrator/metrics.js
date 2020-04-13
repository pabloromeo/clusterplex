const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { MeterProvider }  = require('@opentelemetry/metrics');

module.exports.init = (port) => {
    const options = {port: port, startServer: true};
    const exporter = new PrometheusExporter(options);
    
    // Register the exporter
    const meterProvider = new MeterProvider({
        exporter,
        interval: 1000,
      })
    const meter = meterProvider.getMeter('clusterplex-orchestrator');
    
    var workerLabels = ["worker_id", "worker_host"];
    return {
        meter : meter,
        tasksCompleted : meter.createCounter('tasks_completed', { 
            description : 'Amount of completed tasks'
        }).bind({ }),
        jobsCompleted : meter.createCounter('jobs_completed', { 
            description : 'Amount of completed jobs'
        }).bind({ }),
        workersActiveCount : meter.createCounter('workers_active', { 
            description : 'Amount of active workers',
            monotonic: false 
        }).bind({ }),

        unboundWorkerUsageCounter : meter.createCounter('worker_usage', { 
            description: 'Worker total usages',
            absolute: true, 
            labelKeys : workerLabels, 
            valueType: 0 
        }),
        unboundWorkerActiveTasks : meter.createCounter('worker_active_tasks', { 
            description : 'Worker active tasks',
            monotonic: false, 
            labelKeys: workerLabels 
        }),
        unboundWorkerStatsCpuMeasure : meter.createMeasure('worker_load_cpu', { 
            description : 'Worker Load - CPU usage',
            monotonic: false, 
            absolute:true, 
            labelKeys: workerLabels, 
            valueType: 1 
        }),
        unboundWorkerStatsTasksMeasure : meter.createMeasure('worker_load_tasks', { 
            description : 'Worker Load - Task Count',
            monotonic: false, 
            absolute:true, 
            labelKeys: workerLabels, 
            valueType: 0 
        }),
        workerLoadCPUObserver : meter.createObserver('worker_load_cpu_snapshot', { 
            description : 'Worker Load - CPU usage Snapshot',
            monotonic: false, 
            absolute:true, 
            labelKeys: workerLabels, 
            valueType: 1 
        }),
        workerLoadTasksObserver : meter.createObserver('worker_load_tasks_snapshot', { 
            description : 'Worker Load - Tasks Snapshot',
            monotonic: false, 
            absolute:true, 
            labelKeys: workerLabels, 
            valueType: 1 
        }),
    }
}