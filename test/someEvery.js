const ELEMENT_TYPES = [
    'String', 'Match', 'Date', 'Number', 'Integer', 'Static',
];

const matchString = 'String?';
let result = ELEMENT_TYPES.some(e => matchString.startsWith(e));

console.log(result)

result = ELEMENT_TYPES.every(e => matchString.startsWith(e));

console.log(result)