var ON_DEATH = require('death')({debug: true})
var orchestrator = require('./orchestrator')
const server = require('http').createServer();

const port = 3500

orchestrator.init(server)

server.listen(port);

console.log(`Server listening on port ${port}`)

ON_DEATH( (signal, err) => {
    console.log('ON_DEATH signal detected')
    console.error(err)
    process.exit(signal)
})