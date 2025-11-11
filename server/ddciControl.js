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
 * Gets a list of available monitor identifiers using the active tool.
 * @returns {Promise<{tool: string, devices: string[]}>}
 */
async function getAvailableMonitors() {
    if (!activeTool) throw new Error('No DDC/CI control tool is available.');

    if (activeTool === 'controlmymonitor') {
        // Use /smonitordeferred to save monitor list to a file
        await execPromise(`"${CONTROL_MY_MONITOR_PATH}" /smonitordeferred "${CMM_OUTPUT_FILE}"`);
        const data = fs.readFileSync(CMM_OUTPUT_FILE, 'utf-8');

        // Split the output by monitor blocks. Each block starts with '[Monitor'.
        const blocks = data.split('[Monitor').slice(1);
        const devices = blocks.map(block => {
            const nameLine = block.split('\r\n').find(line => line.trim().startsWith('Name='));
            if (nameLine) {
                // Extract the value after "Name="
                return nameLine.substring(nameLine.indexOf('=') + 1).trim();
            }
            // Fallback to ID if Name is not found
            const idLine = block.split('\r\n').find(line => line.trim().startsWith('ID='));
            if (idLine) {
                 // Extract the value after "ID="
                return idLine.substring(idLine.indexOf('=') + 1).trim();
            }
            return null;
        }).filter(Boolean); // Filter out any null entries if a block is malformed

        fs.unlinkSync(CMM_OUTPUT_FILE); // Clean up the file
        return { tool: activeTool, devices };
    }
    
    if (activeTool === 'monitorian') {
        // Use '/get all' to get the full, stable device path instead of the numeric alias.
        const { stdout } = await execPromise('Monitorian.exe /get all');
        const devices = stdout.split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('DISPLAY\\'))
            // The device path is everything before the first space followed by a quote.
            .map(line => line.split(' "')[0]);
        return { tool: activeTool, devices };
    }

    return { tool: 'none', devices: [] };
}

/**
 * Sets the brightness for a specific monitor using the active tool.
 * @param {string} deviceId - The identifier for the monitor.
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
    setBrightness,
    isInitialized: () => isInitialized,
    getActiveTool: () => activeTool,
};