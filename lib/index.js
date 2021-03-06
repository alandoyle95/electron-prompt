const electron = require('electron');
const BrowserWindow = electron.BrowserWindow || electron.remote.BrowserWindow;
const ipcMain = electron.ipcMain || electron.remote.ipcMain;
const url = require('url');
const path = require('path');

function electronPrompt(options, parentWindow) {
    return new Promise((resolve, reject) => {
        const id = `${new Date().getTime()}-${Math.random()}`;

        const opts = Object.assign({
            title: 'Prompt',
            label: 'Please input a value:',
            alwaysOnTop: false,
            value: null,
            type: 'input',
            debug: false,
            selectOptions: null,
            search: false
        }, options || {});

        if(opts.type == 'select' && (opts.selectOptions === null || typeof(opts.selectOptions) !== 'object')) {
            return reject(new Error('"selectOptions" must be an object'));
        }

        let promptWindow = new BrowserWindow({
            height: (opts.type == 'select' ? 380 : 150),
            resizable: false,
            parent: parentWindow ? (parentWindow instanceof BrowserWindow) : null,
            skipTaskbar: true,
            alwaysOnTop: opts.alwaysOnTop,
            useContentSize: true,
            frame: false,
            modal: parentWindow ? true : false,
            title : opts.title
        });
        

        promptWindow.setMenu(null);

        const getOptionsListener = (event) => {
            event.returnValue = JSON.stringify(opts);
        };

        const postDataListener = (event, value) => {
            resolve(value);
            event.returnValue = null;
            cleanup();
        };

        const unresponsiveListener = () => {
            reject(new Error('Window was unresponsive'));
            cleanup();
        };

        const errorListener = (event, message) => {
            reject(new Error(message));
            event.returnValue = null;
            cleanup();
        };

        const Log = (event, message) => {
            console.log(message)
        };

        const cleanup = () => {
            if (promptWindow) {
                promptWindow.close();
                promptWindow = null;
            }
        };

        ipcMain.on('prompt-get-options:' + id, getOptionsListener);
        ipcMain.on('prompt-post-data:' + id, postDataListener);
        ipcMain.on('prompt-error:' + id, errorListener);
        ipcMain.on('prompt-log:' + id, Log);
        promptWindow.on('unresponsive', unresponsiveListener);

        promptWindow.on('closed', () => {
            ipcMain.removeListener('prompt-get-options:' + id, getOptionsListener);
            ipcMain.removeListener('prompt-post-data:' + id, postDataListener);
            ipcMain.removeListener('prompt-error:' + id, postDataListener);
            ipcMain.removeListener('prompt-log:' + id, Log);
            resolve(null);
        });

        const promptUrl = url.format({
            protocol: 'file',
            slashes: true,
            pathname: path.join(__dirname, 'page', 'prompt.html'),
            hash: id
        });
        
        if(opts.debug)
            promptWindow.webContents.openDevTools();
        promptWindow.loadURL(promptUrl);
    });
}

module.exports = electronPrompt;