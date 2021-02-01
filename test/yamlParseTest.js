const parseYaml = require('../yamlParser');
const util = require('util');
const yaml = parseYaml('../schema.yaml');

console.log(util.inspect(yaml, false, null, true /* enable colors */))