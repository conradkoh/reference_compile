var Fs = require('fs');
var Path = require('path');
var TARGET_FOLDER = 'references';
var REFERENCE_FILENAME = 'reference.js';
const INDENTATION = "  ";

function compile(reference_root, outfile = `${process.cwd()}/${REFERENCE_FILENAME}`) {
    var acquired_path = acquirePath(reference_root);
    //Sanity checks
    if (!Fs.existsSync(acquired_path)) {
        console.log(`Provided root folder does not exist: ${acquired_path}`);
        return;
    }
    var target_root = `${acquired_path}/${TARGET_FOLDER}`;
    if (!Fs.existsSync(target_root)) {
        console.log(`Target root folder does not exist: "${target_root}"`)
        return;
    }
    var references = buildReferences(target_root, `./${TARGET_FOLDER}`);
    //Fs.writeFileSync(`${root}/index.json`, JSON.stringify(references));
    var pre = "module.exports = {";
    var post = "\n};";
    // var script = `${pre}${compileReferences(references, 1)}${post}`;
    var inner_script = compileReferences(references, 0);
    var inner_script_formatted = inner_script.split('\n')
        .map(line => {
            return `${INDENTATION}${line}`
        })
        .reduce((last, cur, index) => {
            return `${last}\n${cur}`
        }, "");
    var script = `${pre}${inner_script_formatted}${post}`;
    Fs.writeFileSync(outfile, script);
    console.log(`Compile completed successfully.`);
}

function buildReferences(filepath, root) {
    var diritems = Fs.readdirSync(filepath);
    diritems = diritems ? diritems : [];
    var references = {};
    for (var idx in diritems) {
        var itemname = diritems[idx];
        var itempath = Path.join(filepath, itemname);
        var stat = Fs.lstatSync(itempath);
        if (stat.isDirectory()) {
            var subReferences = buildReferences(itempath, `${root}/${itemname}`);
            references[itemname] = subReferences;
        } else {
            references[itemname] = `${root}/${itemname}`;
        }
    }
    return references;
}
/**
 * 
 * @param {*} references 
 * @param {*} depth 
 * @return {string}
 */
function compileReferences(references, depth) {
    var indent = indentForDepth(depth);
    // var pre = ` {\n${indent}`;
    // var post = `\n${indent}}`;
    var pre = '{';
    var post = '}';
    var content = "";
    return Object.keys(references).map(key => {
        var item = references[key]; //This can be an object or string
        if (typeof item === 'object') { //This was a folderconsole.log(`Found: ${key}`);
            //get sub objects
            var subReferences = compileReferences(item, depth + 1);
            if (subReferences === undefined) {
                console.log(item)
            };
            const subreference_indented = subReferences.split('\n')
                .map(line => {
                    return `${INDENTATION}${line}`
                })
                .reduce((last, cur, idx) => {
                    return last ? last + "\n" + cur : cur;
                }, "")
            const subreference_indented_formatted = subreference_indented.trim() === "" ? `${pre}${post}` : `${pre}\n${subreference_indented}\n${post}`;
            return `"${key}": ${subreference_indented_formatted}`
        } else if (typeof item === 'string') {
            return `"${key}": ${pre} require: () => require('${item}') ${post}`
        }
    }).reduce((last, cur, index) => {
        var op = (index === 0) ? cur : (last + `,\n` + cur);
        return op;
    }, "");
    return Object.keys(references).map(key => {
        var item = references[key];
        var op = "";
        if (typeof item === 'object') { //Map to a namespace
            console.log(`Found: ${key}`);
            //get sub objects
            var subReferences = compileReferences(item, depth + 1);
            op = `${INDENTATION}"${key}":${pre}${subReferences}${post}`;
        } else if (typeof item === 'string') { //Map to a file
            console.log(`Including: ${key}: ${item}`);
            op = `${INDENTATION}"${key}": { require: () => require('${item}') }`;
        }
        return `${op}`;
    }).reduce((last, cur, index) => {
        var op = (index === 0) ? cur : (last + ',' + cur);
        return op;
    }, "");
}

function indentForDepth(depth) {
    var indent = "";
    for (var i = 0; i < depth; i++) {
        indent += INDENTATION;
    }
    return indent;
}

/**
 * 
 * @param {string} reference_root 
 */
function acquirePath(reference_root) {
    //if path is not valid, return current process directory
    if (!reference_root || reference_root.length === 0) {
        return process.cwd();
    }
    switch (reference_root[0]) {
        case '.':
            //replace relative path with process working directory
            var rel = reference_root.substring(1, reference_root.length);
            return Path.join(process.cwd(), rel);
            break;
        default:
            return reference_root;
            break;
    }

}
module.exports = {
    compile: compile
}