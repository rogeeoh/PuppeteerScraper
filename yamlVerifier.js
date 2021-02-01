const yamlParser = require('./yamlParser');
const util = require('util');
/**
 * 코딩시 주의사항
 * YAML과 javascript 모두 camelCase를 지키는 것으로 한다.
 *
 *type의 종류
 # String: 문자열
 # Integer: 정수
 # Number: 숫자
 # Date: 날짜
 # Static: 지정한 값을 넣음
 # []: 입력시 Array로 지정
 # ?: 입력시 nullable. 없을시 Array의 경우 최소 length가 1
 * @type {string[]}
 *
 */

const ELEMENT_TYPES = {
    STRING: 'String',
    MATCH: 'Match',
    DATE: 'Date',
    NUMBER: 'Number',
    INTEGER: 'Integer',
    STATIC: 'Static',
};

const CONTEXT_TYPES = {
    CONTEXT: 'Context',
    PAGE: 'Page',
    FRAME: 'Frame',
    CALLBACK: 'Callback',
};


const verifyYaml = (yaml) => {
    const parseResult = {
        elements: {},
        collect: {},
    };

    const {elements, collect, ...etc} = yamlParser(yaml);

    try {
        // schema 종류들을 다 가져온다
        const elementNames = Object.keys(elements);
        for (const elementName of elementNames) {
            const element = elements[elementName];
            try {
                parseResult.elements[elementName] = verifySchema(element);
            } catch (err){
                console.error(`${elementName} parse error`);
                throw err;
            }
        }

        console.log(util.inspect(parseResult, false, null, true));

        // const schemaKeys = Object.keys(parseResult.schema);

        // for (const collectElement of collect) {
        //     // 만약 collect의 수집하는 elements가 없다면 (빈 배열이라면) null 대신 빈 배열로 초기화해준다.
        //     collectElement.elements = collectElement.elements === null ? [] : collectElement.elements;
        //     collectElement.elements = collectElement.elements === '[]' ? [] : collectElement.elements;
        //     collectElement.elements = collectElement.elements === 'null' ? [] : collectElement.elements;
        //
        //     const collectElementName = collectElement.name;
        //     const collectElements = collectElement.elements;
        //
        //     verifyCollect(collectElement, schemaKeys);
        //
        //     parseResult.collect[collectElementName] = collectElements;
        // }
    } catch (err) {
        console.error(err);
        throw new Error(err.message);
    }

    // 기타 설정을 etc에 넣을 수 있도록 수정
    // return {schema: parseResult.schema, collect: parseResult.collect, ...etc};
};

// elementType에 해당하는지 체크하고, 해당하지 않는다면 null을 리턴
const getElementType = (type) => {
    const elemKeys = Object.keys(ELEMENT_TYPES);
    for (const elemKey of elemKeys) {
        const elemType = ELEMENT_TYPES[elemKey];
        if (type.startsWith(elemType)) return elemType;
    }
    return null;
};

// contextType에 해당하는지 체크하고, 해당하지 않는다면 null을 리턴
const getContextType = (type) => {
    const elemKeys = Object.keys(CONTEXT_TYPES);
    for (const elemKey of elemKeys) {
        const elemType = CONTEXT_TYPES[elemKey];
        if (type.startsWith(elemType)) return elemType;
    }
    return null;
};


/**
 * verifyElemelt시 defaultSetting을 만들어주는 역
 * @type {{createDefaultFrom: (function(): {context: string, evaluate: string}), createDefaultSetting: (function(): {isRequired: boolean, isArray: boolean, type: string})}}
 */
const defaultSetting = {
    createDefaultSetting: () => ({
        type: 'String',
        isRequired: true,
        isArray: false,
        from: {
            context: 'Context',
            evaluate: 'textContent',
        },
        onError: [],
    }),
};

const parseType = (elementType) => {
    const type = getElementType(elementType);
    if (!type)
        throw new Error(`Unknown type error: ${elementType}`);

    // type이 ?로 끝나면 nullable
    const isRequired = !elementType.endsWith('?');
    // type에 []가 포함되어 있으면 배열임
    const isArray = elementType.includes('[]');

    return {type, isRequired, isArray};
};

const verifySchema = element => {
    const verified = defaultSetting.createDefaultSetting();

    // element가 string으로 들어오면 selector을 이용하는 경우; onError조차 없는 상황
    if (typeof element === 'string') {
        verified.from.selector = element;
        return verified;
    }

    // 만약 element에 staticValue라면 기본 세팅을 리턴해준다.
    if (element.staticValue) {
        verified.staticValue = element.staticValue;
        // from을 제거
        delete verified.from;
    }
    // 나머지 상황에 대한 처리
    else {
        // element의 type이 정의되어 있다면 확인해준다.
        if (element.type) {
            const {type, isRequired, isArray} = parseType(element.type);
            verified.type = type;
            verified.isRequired = isRequired;
            verified.isArray = isArray;

            // Match일 경우 regex를 더해준다
            if (verified.type === 'Match') {
                // match인데 정규표헌식이 없다면 오류를 뱉는다
                if (!element.regex)
                    throw new Error(`Type error 'Match': must define regex`);
                verified.regex = element.regex;
            }
        } // end if element.type

        // element.from은 현재 루틴에 반드시 있어야 함
        if (!element.from)
            throw new Error(`'from' is not defined: must define from`);

        // element.from에 string값이 들어있다면 기본 selector로 활용
        if (typeof element.from === 'string'){
            verified.from.selector = element.from;
            delete verified.from.xpath;
        }
        // context가 정의되어 있으면 변경
        else if (element.from.context) {
            const context = getContextType(element.from.context);
            if (!context)
                throw new Error(`Unknown from.context error: ${element.from.context}`);
            verified.from.context = context;

            // context가 Frame이라면 반드시 frameSelector가 있어야 하므로 확인
            if (verified.from.context === CONTEXT_TYPES.FRAME){
                if (!element.from.frameSelector)
                    throw new Error(`Frame from.frameSelector undefined error: must define frameSelector`);
                verified.from.frameSelector = element.from.frameSelector;
            }

            // Case 1: context: Callback인 경우
            if (verified.from.context === CONTEXT_TYPES.CALLBACK){
                // Callback인데 name이 없는 경우 에러 발생
                if (!element.from.name)
                    throw new Error(`Callback from.name undefined error: must define name`);
                verified.from.name = element.from.name
                delete verified.from.evaluate;
            }
            // Case 2: selector를 이용하는 경우
            else if (element.from.selector){
                verified.from.selector = element.from.selector;
                // evaluate가 정의되어 있다면 교체해준다
                if (element.from.evaluate)
                    verified.from.evaluate = element.from.evaluate
            }
            // Case 3: xpath를 이용하는 경
            else if (element.from.xpath){
                verified.from.xpath = element.from.xpath;
                // evaluate가 정의되어 있다면 교체해준다
                if (element.from.evaluate)
                    verified.from.evaluate = element.from.evaluate
            }
            // Case 4: (오류)Callback이 아닌데 selector도, xpath도 없는 상황
            else {
                throw new Error(`selector or xpath not exist error: from must have selector or xpath`);
            }
        } // end else if (element.from.context)
    } // end else

    // 정의된 onError가 있다면 처리해준다.
    // TODO: onError 파싱 및 처리
    if (element.onError)
        verified.onError = element.onError;

    return verified;
}; // end verifySchema


// const verifyCollect = (collectElement, schemaKeys) => {
//     let collectElements = collectElement.elements;
//
//     // elements가 정의가 안되었는지 검사
//     if (collectElements === null) {
//         // throw new Error(`collect elements null: ${collectElement.name}`)
//         console.warn(`WARNING: collect elements null: ${collectElement.name}`);
//         collectElements = [];
//     }
//
//     // collect의 element들이 schema에서 정의되었는지 확인
//     collectElements.forEach(elementName => {
//         if (schemaKeys.indexOf(elementName) === -1) {
//             throw new Error(`collect element not defined in schema: ${elementName}`);
//         }
//     });
// };

module.exports = verifyYaml;

verifyYaml('./Schema.yaml');