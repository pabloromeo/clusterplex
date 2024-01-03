const ORCHESTRATOR_URL =
	process.env.ORCHESTRATOR_URL || "http://localhost:3500";

const TRANSCODER_PATH =
	process.env.TRANSCODER_PATH || "/usr/lib/plexmediaserver/";
const TRANSCODER_LOCAL_NAME =
	process.env.TRANSCODER_LOCAL_NAME || "originalTranscoder";
const PMS_SERVICE = process.env.PMS_SERVICE || "";
const PMS_IP = process.env.PMS_IP || "";
const PMS_PORT = process.env.PMS_PORT || "32400";

const LOCAL_RELAY_ENABLED = process.env.LOCAL_RELAY_ENABLED || "1";
const LOCAL_RELAY_PORT = process.env.LOCAL_RELAY_PORT || "32499";

const TRANSCODER_VERBOSE = process.env.TRANSCODER_VERBOSE || "0";
// Operating mode:
// local
// remote
// both
const TRANSCODE_OPERATING_MODE = process.env.TRANSCODE_OPERATING_MODE || "both";
const TRANSCODE_EAE_LOCALLY = process.env.TRANSCODE_EAE_LOCALLY || false;
const FORCE_HTTPS = process.env.FORCE_HTTPS || "0";

// validations
if (PMS_SERVICE == "" && PMS_IP == "") {
	console.error(
		"You must set either PMS_SERVICE or PMS_IP (either one), pointing to you Plex instance. PMS_SERVICE is only allowed in conjunction with LOCAL_RELAY_ENABLED='1'"
	);
	process.exit(1);
}
if (PMS_SERVICE != "" && LOCAL_RELAY_ENABLED != "1") {
	console.error(
		"PMS_SERVICE is only allowed in conjunction with LOCAL_RELAY_ENABLED='1'. This is due to a high chance of Plex rejecting the traffic coming from the Worker."
	);
	process.exit(1);
}
if (FORCE_HTTPS == "1" && LOCAL_RELAY_ENABLED == "1") {
	console.warn(
		`When Local Relay is enabled FORCE_HTTPS is ignored as it is not needed for reporting streaming progress back to Plex.`
	);
}

const { spawn } = require("child_process");
var ON_DEATH = require("death")({ debug: true });

var jobPoster = require("./jobPoster");

let child = null;

if (TRANSCODE_OPERATING_MODE == "local") {
	transcodeLocally(process.cwd(), process.argv.slice(2), process.env);
} else if (
	TRANSCODE_EAE_LOCALLY &&
	process.argv.slice(2).filter((s) => s.includes("eae_prefix")).length > 0
) {
	console.log("EasyAudioEncoder used, forcing local transcode");
	transcodeLocally(process.cwd(), process.argv.slice(2), process.env);
} else if (process.cwd().indexOf("PlexCreditsDetection") > 0) {
	console.log("PlexCreditsDetection so forcing local transcode");
	transcodeLocally(process.cwd(), process.argv.slice(2), process.env);
} else {
	function setValueOf(arr, key, newValue) {
		let i = arr.indexOf(key);
		if (i > 0) {
			arr[i + 1] = newValue;
		}
	}

	let networkProtocol = "http";
	let targetLocation = PMS_SERVICE || PMS_IP; //SERVICE takes precedence over IP
	let targetPort = PMS_PORT;
	if (LOCAL_RELAY_ENABLED == "1") {
		console.log(
			`Local Relay enabled, traffic proxied through PMS local port ${LOCAL_RELAY_PORT}`
		);
		targetPort = LOCAL_RELAY_PORT;
	} else {
		if (FORCE_HTTPS == "1") {
			console.log("Forcing HTTPS in progress callback");
			networkProtocol = "https";
		}
	}

	let newArgs = process.argv.slice(2).map((v) => {
		return v
			.replace(
				`http://127.0.0.1:${PMS_PORT}`,
				`${networkProtocol}://${targetLocation}:${targetPort}`
			)
			.replace("aac_lc", "aac"); // workaround for error -> Unknown decoder 'aac_lc'
	});

	if (TRANSCODER_VERBOSE == "1") {
		console.log("Setting VERBOSE to ON");
		setValueOf(newArgs, "-loglevel", "verbose");
		setValueOf(newArgs, "-loglevel_plex", "verbose");
	}

	let environmentVariables = process.env;
	let workDir = process.cwd();

	console.log(`Sending request to orchestrator on: ${ORCHESTRATOR_URL}`);
	if (TRANSCODER_VERBOSE == "1") {
		console.log(`cwd => ${JSON.stringify(workDir)}`);
		console.log(`args => ${JSON.stringify(newArgs)}`);
		console.log(`env => ${JSON.stringify(environmentVariables)}`);
	}

	jobPoster.postJob(
		ORCHESTRATOR_URL,
		{
			type: "transcode",
			payload: {
				cwd: workDir,
				args: newArgs,
				env: environmentVariables,
			},
		},
		(response) => {
			if (!response.result) {
				console.error("Distributed transcoder failed, calling local");
				if (TRANSCODE_OPERATING_MODE == "both") {
					transcodeLocally(
						process.cwd(),
						process.argv.slice(2),
						process.env
					);
				} else {
					// remote only
					console.error(
						`Error transcoding and local transcode is disabled: TRANSCODE_OPERATING_MODE=${TRANSCODE_OPERATING_MODE}`
					);
					process.exit(1);
				}
			} else {
				console.log("Remote Transcoding was successful");
				process.exit(0);
			}
		}
	);
}

function transcodeLocally(cwd, args, env) {
	child = spawn(TRANSCODER_PATH + TRANSCODER_LOCAL_NAME, args, {
		cwd: cwd,
		env: env,
	});
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	let withErrors = 0;
	child.on("error", (err) => {
		console.error(err);
		withErrors = 1;
	});
	child.on("close", (code) => {
		console.log("Completed local transcode");
		process.exit(withErrors);
	});
}

ON_DEATH((signal, err) => {
	console.log("ON_DEATH signal detected");
	console.error(err);
	if (child) {
		console.log("Killing child transcoder");
		child.kill();
	}
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
