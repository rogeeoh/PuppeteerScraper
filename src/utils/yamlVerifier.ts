import yamlParser from './yamlParser';
import ScraperSchema from "../common/elements";
import {ElementDataType} from "../common/types";

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

const ON_ERROR_POLICIES = {
    STATIC_VALUE: 'StaticValue',
    ALTERNATIVE: 'Alternative',
    CALLBACK: 'Callback',
    SKIP: 'Skip'
};

const defaultSetting = {
    createDefaultSetting: () => ({
        type: 'String',
        isRequired: true,
        isArray: false,
    }),
    createDefaultFrom: (): any => ({
        context: 'Context',
        evaluate: 'textContent',
    }),
    createDefaultOnError: () => [],
};


const verifyYaml = (yaml: string): ScraperSchema => {
    const parseResult: ScraperSchema = {
        elements: {},
        collect: {},
        etc: undefined,
    };

    const {elements, collect, ...etc} = yamlParser(yaml);

    const elementsArray = Object.keys(elements);
    while (elementsArray.length !== 0) {
        // 제일 앞을 하나씩 빼온다
        // @ts-ignore
        const elementName: string = elementsArray.shift();
        const element = elements[elementName];
        try {
            // Case1: 상속받는 값이 있고, 이미 파싱이 된 경우 (진행이 가능한 경우)
            if (element.inherit && parseResult.elements[element.inherit]) {
                parseResult.elements[elementName] = verifySchema(element, parseResult.elements[element.inherit]);
            }
            // Case2: 상속받는 값이 있으나, Schema에 정의가 되지 않은 경우 (에러)
            else if (element.inherit && !Object.keys(elements).includes(element.inherit)) {
                throw new Error(`inherit error: ${elementName} inherits undefined schema: ${element.inherit}`);
            }
            // Case3: 상속받는 값이 있으나, 파싱이 아직 안 된 경우 (이따가 진행하면 될 경우)
            else if (element.inherit && !parseResult.elements[element.inherit]) {
                elementsArray.push(elementName);
                continue;
            }
            // Case4: 상속을 받지 않는 경우 (일반적인 경우)
            else {
                parseResult.elements[elementName] = verifySchema(element)
            }
        } catch (err) {
            console.error(`${elementName} parse error`);
            throw err;
        }
    }

    if (!collect)
        throw new Error('collect undefined error: collect is not defined in schema');
    const collectKeys = Object.keys(collect);
    for (const key of collectKeys) {
        parseResult.collect[key] = verifyCollect(collect[key], Object.keys(elements));
    }

    // collect에 안들어간 element가 있다면 warning을 띄워준다
    const everyCollectKeys: any[] = [];
    for (const key of collectKeys) {
        everyCollectKeys.push(...parseResult.collect[key]);
    }
    Object.keys(elements).forEach(key => {
        if(everyCollectKeys.indexOf(key) === -1)
            console.warn(`WARNING: ${key} is defined in elements but never used in collect`);
    });

    // 기타 설정을 etc에 넣을 수 있도록 수정
    return {elements: parseResult.elements, collect: parseResult.collect, ...etc};
};

// elementType에 해당하는지 체크하고, 해당하지 않는다면 null을 리턴
const getElementType = (type: string): ElementDataType | undefined => {
    const elemKeys: string[] = Object.keys(ELEMENT_TYPES);
    for (const elemKey of elemKeys) {
        // @ts-ignore
        const elemType :ElementDataType = ELEMENT_TYPES[elemKey];
        if (type.startsWith(elemType)) return elemType;
    }
    return undefined;
};

// contextType에 해당하는지 체크하고, 해당하지 않는다면 null을 리턴
const getContextType = (type: any) => {
    const elemKeys = Object.keys(CONTEXT_TYPES);
    for (const elemKey of elemKeys) {
        // @ts-ignore
        const elemType = CONTEXT_TYPES[elemKey];
        if (type.startsWith(elemType)) return elemType;
    }
    return null;
};

const parseType = (elementType: string) => {
    const type = getElementType(elementType);
    if (!type)
        throw new Error(`Unknown type error: ${elementType}`);

    // type이 ?로 끝나면 nullable
    const isRequired = !elementType.endsWith('?');
    // type에 []가 포함되어 있으면 배열임
    const isArray = elementType.includes('[]');

    return {type, isRequired, isArray};
};

const verifySchema = (element: any, inheritElement?: any) => {
    // staticValue를 가진 inheritElement는 상속받을 수 없음 (정책상)
    if (inheritElement && inheritElement.staticValue) {
        throw new Error(`Inherit error: cannot inherit staticValue element`);
    }
    // inheritElement로부터 상속여부 결정
    const verified = inheritElement
        ? JSON.parse(JSON.stringify(inheritElement))
        : defaultSetting.createDefaultSetting();

    // element가 string으로 들어오면 selector을 이용하는 경우; onError조차 없는 상황
    if (typeof element === 'string') {
        verified.from = defaultSetting.createDefaultFrom();
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

        // 상속받는게 아니라면 element.from은 현재 루틴에 반드시 있어야 함
        if (!element.from && !inheritElement)
            throw new Error(`'from' is not defined: must define from`);
        // from을 재정의 하지 않고 상속만 받는 경우
        else if (!element.from && inheritElement) {
            verified.from = inheritElement.from;
        }
        // 상속을 받음과 동시에 재정의 하는 경우
        else {
            verified.from = parseFrom(element.from);
        }
    } // end else


    // 정의된 onError가 있다면 처리해준다.
    if (element.onError) {
        verified.onError = [];

        // 에러가 배열로 들어오기 때문에 순회해준다
        for (const onError of element.onError) {
            const error: any = {};
            // error에 policy가 없으면 오류 발생
            if (!onError.policy)
                throw new Error(`onError policy is not defined`);

            // policy에 따라 정책 결정
            switch (onError.policy) {
                case ON_ERROR_POLICIES.STATIC_VALUE:
                    error.policy = ON_ERROR_POLICIES.STATIC_VALUE;
                    if (!error.staticValue)
                        throw new Error(`StaticValue onError.staticValue undefined error: must define staticValue`);
                    error.staticValue = onError.staticValue;
                    break;
                case ON_ERROR_POLICIES.ALTERNATIVE:
                    error.policy = ON_ERROR_POLICIES.ALTERNATIVE;
                    error.from = parseFrom(onError.from);
                    break;
                case ON_ERROR_POLICIES.CALLBACK:
                    error.policy = ON_ERROR_POLICIES.CALLBACK;
                    if (!onError.name)
                        throw new Error(`Callback onError.name undefined error: must define name`);
                    error.name = onError.name;
                    break;
                case ON_ERROR_POLICIES.SKIP:
                    error.policy = ON_ERROR_POLICIES.SKIP;
                    break;
                default:
                    throw new Error(`onError unknown policy error: ${error.policy}`);
            }
            verified.onError.push(error);
        } // end for
    } // end if element.onError
    // 상속받은 onError만 존재할 경우
    else if (inheritElement && inheritElement.onError) {
        verified.onError = inheritElement.onError;
    }

    return verified;
}; // end verifySchema

const parseFrom = (from: any) => {
    const verifiedFrom = defaultSetting.createDefaultFrom();

    // from에 string값이 들어있다면 기본 selector로 활용하고 리턴
    if (typeof from === 'string') {
        verifiedFrom.selector = from;
        return verifiedFrom;
    }

    // context가 default값(Context)이 아니고 정의되어 있으면 변경
    if (from.context) {
        const context = getContextType(from.context);
        if (!context)
            throw new Error(`Unknown from.context error: ${from.context}`);
        verifiedFrom.context = context;
    }

    // context가 Frame이라면 반드시 frameSelector가 있어야 하므로 확인
    if (verifiedFrom.context === CONTEXT_TYPES.FRAME) {
        if (!from.frameSelector)
            throw new Error(`Frame from.frameSelector undefined error: must define frameSelector`);
        verifiedFrom.frameSelector = from.frameSelector;
    }

    // Case 1: context: Callback인 경우
    if (verifiedFrom.context === CONTEXT_TYPES.CALLBACK) {
        // Callback인데 name이 없는 경우 에러 발생
        if (!from.name)
            throw new Error(`Callback from.name undefined error: must define name`);
        verifiedFrom.name = from.name
        // evaluate: 'textContent'를 제거해준다
        delete verifiedFrom.evaluate;
    }
    // Case 2: selector 혹은 xPath를 이용하는 경우
    else if (from.selector || from.xPath) {
        // 둘이 중복으로 적어준 경우에는 오류를 발생시킨다
        if (from.selector && from.xPath)
            throw new Error(`selector and xpath error: selector and xPath cannot exist at the same time`);

        from.selector
            ? verifiedFrom.selector = from.selector
            : verifiedFrom.xPath = from.xPath;

        // waitForSelector가 있는지 확인
        if (from.waitForSelector)
            verifiedFrom.waitForSelector = from.waitForSelector;
        // waitForXPath가 있는지 확인
        if (from.waitForXPath)
            verifiedFrom.waitForXPath = from.waitForXPath;
        // evaluate가 정의되어 있다면 교체해준다
        if (from.evaluate)
            verifiedFrom.evaluate = from.evaluate;
    }
    // Case 3: (오류)Callback이 아닌데 selector도, xpath도 없는 상황
    else {
        throw new Error(`selector or xpath not exist error: from must have selector or xpath`);
    }

    return verifiedFrom;
};


const verifyCollect = (elements: string[], schemaKeys: string[]) => {
    const collectElements: string[] = [];
    for (const element of elements) {
        const splits: string[] = element.split(',');
        splits.forEach((split: string) => {
            collectElements.push(split.trim());
        });
    }

    // collect의 element들이 schema에서 정의되었는지 확인
    collectElements.forEach((elementName: string) => {
        if (schemaKeys.indexOf(elementName) === -1) {
            throw new Error(`collect element not defined in schema: ${elementName}`);
        }
    });

    return collectElements;
};

export default verifyYaml;