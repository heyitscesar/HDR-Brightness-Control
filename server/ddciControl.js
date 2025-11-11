const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

const CONTROL_MY_MONITOR_PATH = path.join(__dirname, 'ControlMyMonitor.exe');
const CMM_OUTPUT_FILE = path.join(__dirname, 'monitors.txt');

let activeTool = null; // 'controlmymonitor' or 'monitorian'
let isInitialized = false;

/**
 * Checks for the presence of the control executables and determines which one to use.
 */
async function initialize() {
    // Try ControlMyMonitor first (check if it exists locally)
    if (fs.existsSync(CONTROL_MY_MONITOR_PATH)) {
        console.log('DDC/CI Control: Using ControlMyMonitor.exe (Primary)');
        activeTool = 'controlmymonitor';
    } else {
        try {
            // If CMM is not found, check for Monitorian in PATH as a fallback
            await execPromise('where Monitorian.exe');
            console.log('DDC/CI Control: Using Monitorian.exe (Fallback)');
            activeTool = 'monitorian';
        } catch (error) {
            console.error('DDC/CI Control Error: Neither ControlMyMonitor.exe nor Monitorian.exe could be found.');
            activeTool = null;
        }
    }
    isInitialized = true;
}

/**
 * Gets a list of available monitor identifiers (friendly names) using the active tool.
 * @returns {Promise<{tool: string, devices: string[]}>}
 */
async function getAvailableMonitors() {
    if (!activeTool) throw new Error('No DDC/CI control tool is available.');
    
    // This function returns the friendly names for the UI dropdown.
    const details = await getMonitorDetails();
    const devices = details.map(d => d.name);

    return { tool: activeTool || 'none', devices };
}

/**
 * Gets detailed information (ID and Name) for all monitors from the active tool.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function getMonitorDetails() {
    if (!activeTool) return [];

    if (activeTool === 'controlmymonitor') {
        try {
            await execPromise(`"${CONTROL_MY_MONITOR_PATH}" /smonitordeferred "${CMM_OUTPUT_FILE}"`);
            const data = fs.readFileSync(CMM_OUTPUT_FILE, 'utf-8');

            const blocks = data.split('[Monitor').slice(1);
            const details = blocks.map(block => {
                const lines = block.split('\r\n');
                const nameLine = lines.find(line => line.trim().startsWith('Name='));
                const idLine = lines.find(line => line.trim().startsWith('ID='));
                if (nameLine && idLine) {
                    return {
                        name: nameLine.substring(nameLine.indexOf('=') + 1).trim(),
                        id: idLine.substring(idLine.indexOf('=') + 1).trim()
                    };
                }
                return null;
            }).filter(Boolean);

            fs.unlinkSync(CMM_OUTPUT_FILE); // Clean up the file
            return details;
        } catch (error) {
            console.error("Failed to get monitor details from ControlMyMonitor:", error);
            return [];
        }
    }
    
    if (activeTool === 'monitorian') {
        try {
            const { stdout } = await execPromise('Monitorian.exe /get all');
            return stdout.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('DISPLAY\\'))
                .map(line => {
                    const match = line.match(/^(DISPLAY\\.*?)\s+"(.*?)"/);
                    if (match && match[1] && match[2]) {
                        return { id: match[1], name: match[2] };
                    }
                    return null;
                }).filter(Boolean);
        } catch (error) {
            console.error("Failed to get monitor details from Monitorian:", error);
            return [];
        }
    }

    return [];
}


/**
 * Sets the brightness for a specific monitor using the active tool.
 * @param {string} deviceId - The identifier for the monitor (typically the friendly name).
 * @param {number} brightness - The brightness level (0-100).
 * @returns {Promise<void>}
 */
function setBrightness(deviceId, brightness) {
    return new Promise((resolve, reject) => {
        if (!activeTool) {
            return reject(new Error('No DDC/CI control tool is available.'));
        }
        
        if (!deviceId) {
            return reject(new Error('Cannot set brightness: Device ID is empty or invalid.'));
        }

        const roundedBrightness = Math.round(brightness);
        let command;

        if (activeTool === 'controlmymonitor') {
            // VCP code for brightness is 10
            command = `"${CONTROL_MY_MONITOR_PATH}" /SetValue "${deviceId}" 10 ${roundedBrightness}`;
        } else if (activeTool === 'monitorian') {
            // Monitorian can handle both numeric and full path device IDs.
            command = `Monitorian.exe /set "${deviceId}" ${roundedBrightness} B`;
        } else {
            return reject(new Error('Unknown DDC/CI control tool.'));
        }

        exec(command, (error) => {
            if (error) {
                console.error(`[${deviceId}] DDC/CI Error with ${activeTool}: ${error.message}`);
                reject(error);
            } else {
                // Keep console log concise for less noise
                // console.log(`[${deviceId}] DDC/CI Brightness set to ${roundedBrightness}% using ${activeTool}`);
                resolve();
            }
        });
    });
}


module.exports = {
    initialize,
    getAvailableMonitors,
    getMonitorDetails, // Export the new function
    setBrightness,
    isInitialized: () => isInitialized,
    getActiveTool: () => activeTool,
};