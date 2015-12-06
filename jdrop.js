'use strict';

const fs = require('fs'),
    vm = require('vm'),
    path = require('path'),
    escapeMap = {
        '"': '&quot;',
        '\'': '&apos;'
    };

let dataPath,
    autocatch;

function handle(err, reject) {
    if (autocatch) {
        autocatch(err);
    } else {
        reject(err);
    }
}

function die(err) {
    console.error(err.stack || err);
    process.exit(1);
}

function jsonEscape(str) {
    return str.replace(/['"]/g, c => {
        return escapeMap[c];
    });
}

function escape(data) {
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (typeof data[key] === 'string') {
                data[key] = jsonEscape(data[key]);
            } else if (typeof data[key] === 'object') {
                escape(data[key]);
            }
        }
    }
}

function save(filepath, data) {

    escape(data);

    filepath = dataPath + filepath + '.json';

    let dir = path.dirname(filepath);

    return new Promise((resolve, reject) => {

        fs.exists(dir, exists => {

            if (!exists) {
                fs.mkdirSync(dir);
            }

            fs.writeFile(filepath, JSON.stringify(data), err => {
            
                if (err) {
                    handle(err, reject);
                } else {
                    resolve(data);
                }
            });
        });
    });
}

function get(filepath) {
    
    filepath = dataPath + filepath.replace(/\.json$/, '') + '.json';

    return new Promise((resolve, reject) => {

        fs.exists(filepath, exists => {

            if (exists) {

                fs.readFile(filepath, { encoding: 'utf8' }, (err, data) => {

                    if (data) {
                    
                        if (err) {
                            handle(err, reject);
                        } else {
                            resolve(JSON.parse(data));
                        }

                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

// If a key is provided, the put method first gets the freshest data
// before updating that key. Otherwise it updates the whole collection.
function put(filepath, value, key) {

    filepath = filepath.replace(/\.json$/, '');

    return new Promise((resolve, reject) => {

        if (key) {

            fs.exists(dataPath + filepath + '.json', exists => {

                if (exists) {

                    get(filepath, true).then(data => {

                        if (data) {

                            if (key.indexOf('.') !== -1 || key.indexOf('[') !== -1) {

                                vm.createContext(data);
                                
                                vm.runInNewContext(key + '=' + JSON.stringify(value), data);

                            } else {
                                data[key] = value;
                            }

                        } else {

                            data = {};
                            data[key] = value;
                        }

                        save(filepath, data).then(data => {
                            resolve(data);
                        });
                    });

                } else {

                    save(filepath, value).then(data => {
                        resolve(data);
                    });
                }
            });

        } else {

            save(filepath, value).then(data => {
                resolve(data);
            });
        }
    });
}

// deletes the collection, or, if key is provided,
// deletes that property from the collection
function del(filepath, key) {

    return new Promise((resolve, reject) => {

        filepath = filepath.replace(/\.json$/, '');

        fs.exists(dataPath + filepath + '.json', exists => {

            if (exists) {

                if (key) {

                    get(filepath, true).then(data => {

                        if (key.indexOf('.') !== -1 || key.indexOf('[') !== -1) {

                            vm.createContext(data);

                            vm.runInNewContext('delete ' + key, data);

                        } else {
                            delete data[key];
                        }

                        save(filepath, data).then(data => {
                            resolve(data);
                        });
                    });
                } else {

                    fs.unlink(dataPath + filepath + '.json', err => {
                        if (err) {
                            handle(err, reject);
                        } else {
                            resolve();
                        }
                    });
                }
            } else {
                resolve();
            }
        });
    });
}

module.exports = options => {

    dataPath = options ? options.path || 'data' : 'data';
    dataPath = path.join(path.dirname(require.main.filename), dataPath, '/');

    fs.exists(dataPath, exists => {
        if (!exists) {
            fs.mkdir(dataPath);
        }
    });

    if (options) {
        if (options.autocatch === true) {
            autocatch = die;
        } else if (typeof options.autocatch === 'function') {
            autocatch = options.autocatch;
        }
    }

    return {
        get: get,
        put: put,
        del: del
    };
};
