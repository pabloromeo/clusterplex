const { v4: uuid } = require('uuid');

let uniqueId = uuid()

module.exports = {
    postJob : (orchestratorUrl, job, callback) => {
        var socket = require('socket.io-client')(orchestratorUrl);
        
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
        
            console.log(`Sending request to orchestrator on: ${orchestratorUrl}`)
        
            socket.emit('jobposter.job.request', job)
        
            workSent = true
        })
        
        socket.on('jobposter.job.response', response => {
            callback(response)
        })
    }
}