const YAML = require('yaml');
const fs = require('fs');

const yamlParser = (path) => {
    const file = fs.readFileSync(path, 'utf8');
    return YAML.parse(file);
};

module.exports = yamlParser;

