#!/bin/bash

# Get the PID of the main process
main_script_pid=$1

# Get the PID of the child process
child_process_pid=$2

# Function to check if the main script is running
check_processes() {
    if ! kill -0 $main_script_pid 2>/dev/null; then
        echo "Main process is no longer running"
        if kill -0 $child_process_pid 2>/dev/null; then
            echo "Sending SIGTERM to the child process"
            kill -15 $child_process_pid
        fi
        exit 0
    fi
}

# Loop to periodically check if the main script is running
while true; do
    sleep 2  # Adjust the sleep duration as needed
    check_processes
done