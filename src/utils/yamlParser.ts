import YAML from 'yaml';
import fs from 'fs';

const yamlParser = (path: string): any => {
    const file = fs.readFileSync(path, 'utf8');
    return YAML.parse(file);
};

export default yamlParser;
