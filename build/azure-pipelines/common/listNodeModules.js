"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
if (process.argv.length !== 3) {
    console.error('Usage: node listNodeModules.js OUTPUT_FILE');
    process.exit(-1);
}
const ROOT = path.join(__dirname, '../../../');
function findNodeModulesFiles(location, inNodeModules, result) {
    const entries = fs.readdirSync(path.join(ROOT, location));
    for (const entry of entries) {
        const entryPath = `${location}/${entry}`;
        if (/(^\/out)|(^\/src$)|(^\/.git$)|(^\/.build$)/.test(entryPath)) {
            continue;
        }
        let stat;
        try {
            stat = fs.statSync(path.join(ROOT, entryPath));
        }
        catch (err) {
            continue;
        }
        if (stat.isDirectory()) {
            findNodeModulesFiles(entryPath, inNodeModules || (entry === 'node_modules'), result);
        }
        else {
            if (inNodeModules) {
                result.push(entryPath.substr(1));
            }
        }
    }
}
const result = [];
findNodeModulesFiles('', false, result);
fs.writeFileSync(process.argv[2], result.join('\n') + '\n');
