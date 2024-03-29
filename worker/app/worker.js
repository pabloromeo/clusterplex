const LISTENING_PORT = process.env.LISTENING_PORT || 3501;
const STAT_CPU_INTERVAL = process.env.STAT_CPU_INTERVAL || 2000;
const STAT_CPU_OPS_DURATION = process.env.STAT_CPU_OPS_DURATION || 1000;
const ORCHESTRATOR_URL =
	process.env.ORCHESTRATOR_URL || "http://localhost:3500";
const TRANSCODER_PATH =
	process.env.TRANSCODER_PATH || "/usr/lib/plexmediaserver/";
const TRANSCODER_NAME = process.env.TRANSCODER_NAME || "Plex Transcoder";
const EAE_SUPPORT = process.env.EAE_SUPPORT || "1";
const EAE_EXECUTABLE = process.env.EAE_EXECUTABLE || "";
// hwaccel decoder: https://trac.ffmpeg.org/wiki/HWAccelIntro
const FFMPEG_HWACCEL = process.env.FFMPEG_HWACCEL || false;

// Settings debug info
console.log(`EAE_SUPPORT => ${EAE_SUPPORT}`);
console.log(`EAE_EXECUTABLE => ${EAE_EXECUTABLE}`);
console.log(`FFMPEG_HWACCEL => ${FFMPEG_HWACCEL}`);

var app = require("express")();
var server = require("http").createServer(app);
var socket = require("socket.io-client")(ORCHESTRATOR_URL);
var cpuStat = require("cpu-stat");
var fs = require("fs");
const { spawn, exec } = require("child_process");
const { v4: uuid } = require("uuid");
const { fib, dist } = require("cpu-benchmark");

var ON_DEATH = require("death")({ debug: true });

// initialize CPU stats to a high number until it is overwritten by first sample
let cpuUsage = 9999.0;

// calculate CPU operations for worker stats (simple benchmark over STAT_CPU_OPS_DURATION milliseconds)
const ops = dist(STAT_CPU_OPS_DURATION);
console.log(`Computed CPU ops => ${ops}`);

// healthcheck endpoint
app.get("/health", (req, res) => {
	res.send("Healthy");
});

server.listen(LISTENING_PORT, () => {
	console.log(`Worker listening on port ${LISTENING_PORT}`);
});

// calculate cpu usage every 2 seconds
setInterval(() => {
	cpuStat.usagePercent(
		{ sampleMs: STAT_CPU_INTERVAL },
		(err, percent, seconds) => {
			if (!err) {
				cpuUsage = percent.toFixed(2);
				if (socket.connected) {
					socket.emit("worker.stats", {
						cpu: cpuUsage,
						tasks: taskMap.size,
						ops: ops,
					});
				}
			}
		}
	);
}, STAT_CPU_INTERVAL);

let workerId = uuid();
let taskMap = new Map();

console.debug(`Initializing Worker ${workerId}|${process.env.HOSTNAME}`);

socket.on("connect", () => {
	console.log(`Worker connected on socket ${socket.id}`);
	socket.emit("worker.announce", {
		workerId: workerId,
		host: process.env.HOSTNAME,
	});
});

function processEnv(env) {
	// overwrite environment settings coming from the original plex instance tied to architecture
	newEnv = JSON.parse(JSON.stringify(env));
	newEnv.PLEX_ARCH = process.env.PLEX_ARCH;
	newEnv.PLEX_MEDIA_SERVER_INFO_MODEL =
		process.env.PLEX_MEDIA_SERVER_INFO_MODEL;
	newEnv.FFMPEG_EXTERNAL_LIBS = process.env.FFMPEG_EXTERNAL_LIBS;
	return newEnv;
}

socket.on("worker.task.request", (taskRequest) => {
	console.log("Received task request");

	socket.emit("worker.task.update", {
		taskId: taskRequest.taskId,
		status: "received",
	});

	var processedEnvironmentVariables = processEnv(taskRequest.payload.env);

	var child;
	if (taskRequest.payload.args[0] === "testpayload") {
		console.log(`args => ${JSON.stringify(taskRequest.payload.args)}`);
		console.log(`env => ${JSON.stringify(processedEnvironmentVariables)}`);
		console.log("Starting test of waiting for 5 seconds");
		child = exec("sleep 5");
	} else {
		if (FFMPEG_HWACCEL != false) {
			console.log(`Setting hwaccel to ${FFMPEG_HWACCEL}`);
			let i = taskRequest.payload.args.indexOf("-hwaccel");
			if (i > 0) {
				taskRequest.payload.args[i + 1] = FFMPEG_HWACCEL;
			} else {
				taskRequest.payload.args.unshift("-hwaccel", FFMPEG_HWACCEL);
			}
		}

		console.log(`EAE_ROOT => "${processedEnvironmentVariables.EAE_ROOT}"`);
		if (
			(EAE_SUPPORT == "1" || EAE_SUPPORT == "true") &&
			EAE_EXECUTABLE != "" &&
			processedEnvironmentVariables.EAE_ROOT?.length > 0
		) {
			if (!fs.existsSync(processedEnvironmentVariables.EAE_ROOT)) {
				console.log(
					`EAE Support - Creating EAE_ROOT destination => ${processedEnvironmentVariables.EAE_ROOT}`
				);
				fs.mkdirSync(processedEnvironmentVariables.EAE_ROOT, {
					recursive: true,
				});
			}

			if (fs.existsSync(`${EAE_EXECUTABLE}.pid`)) {
				console.log(`EAE Support - EAE already running`);
			} else {
				console.log(
					`EAE Support - Spawning EasyAudioEncoder from "${EAE_EXECUTABLE}", cwd => ${processedEnvironmentVariables.EAE_ROOT}`
				);
				const childEAE = spawn(EAE_EXECUTABLE, [], {
					cwd: processedEnvironmentVariables.EAE_ROOT,
					env: processedEnvironmentVariables,
				});
				childEAE.stdout.pipe(process.stdout);
				childEAE.stderr.pipe(process.stderr);
				childEAE.on("error", (err) => {
					console.error("EAE Support - EAE failed:");
					console.error(err);
					deleteEAE_PID();
				});
				childEAE.on("close", () => {
					console.log("EAE Support - Closing");
					deleteEAE_PID();
				});
				childEAE.on("exit", () => {
					console.log("EAE Support - Exiting");
					deleteEAE_PID();
				});

				createEAE_PID(childEAE.pid.toString());
			}
		}

		if (!fs.existsSync(taskRequest.payload.cwd)) {
			console.error(
				`CWD path doesn't seem to exist. Plex should have created this path before-hand, so you may have an issue with your shares => "${taskRequest.payload.cwd}"`
			);
		}

		child = spawn(
			TRANSCODER_PATH + TRANSCODER_NAME,
			taskRequest.payload.args,
			{
				cwd: taskRequest.payload.cwd,
				env: processedEnvironmentVariables,
			}
		);
	}

	taskMap.set(taskRequest.taskId, {
		transcodeProcess: child,
	});

	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);

	let notified = false;
	const completionHandler = (code) => {
		if (!notified) {
			console.log("Completed transcode");
			socket.emit("worker.task.update", {
				taskId: taskRequest.taskId,
				status: "done",
				result: code === 0,
				exitCode: code,
			});
			notified = true;
			console.log("Removing process from taskMap");
			taskMap.delete(taskRequest.taskId);
		}
	};

	child.on("error", (err) => {
		console.error("Transcoding failed:");
		console.error(err);
		notified = true;
		socket.emit("worker.task.update", {
			taskId: taskRequest.taskId,
			status: "done",
			result: false,
			error: err.message,
		});
		console.log("Orchestrator notified");

		console.log("Removing process from taskMap");
		taskMap.delete(taskRequest.taskId);
	});

	child.on("close", (c) => {
		console.log(`Transcoder close: child process exited with code ${c}`);
		completionHandler(c);
	});
	child.on("exit", (c) => {
		console.log(`Transcoder exit: child process exited with code ${c}`);
		completionHandler(c);
	});

	socket.emit("worker.task.update", {
		taskId: taskRequest.taskId,
		status: "inprogress",
	});
});

socket.on("worker.task.kill", (data) => {
	let taskEntry = taskMap.get(data.taskId);
	if (taskEntry) {
		console.log(`Killing child processes for task ${data.taskId}`);
		taskEntry.transcodeProcess.kill();
		console.log("Removing process from taskMap");
		taskMap.delete(data.taskId);
	}
});

socket.on("disconnect", () => {
	console.log("Worker disconnected");
});

ON_DEATH((signal, err) => {
	console.log("ON_DEATH signal detected");
	console.error(err);
	deleteEAE_PID();
	let exitCode = 0;
	switch (signal) {
		case "SIGINT":
			exitCode = 130;
			break;
		case "SIGQUIT":
			exitCode = 131;
			break;
		case "SIGTERM":
			exitCode = 143;
			break;
		default:
			exitCode = 1;
			break;
	}
	process.exit(exitCode);
});

function deleteEAE_PID() {
	if (fs.existsSync(`${EAE_EXECUTABLE}.pid`)) {
		console.log("Removing EAE PID file");
		fs.unlinkSync(`${EAE_EXECUTABLE}.pid`);
	}
}

function createEAE_PID(pid) {
	console.log("EAE Support - Writing PID file");
	fs.writeFileSync(`${EAE_EXECUTABLE}.pid`, pid);
}
