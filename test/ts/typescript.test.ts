class DefaultSettingValue {
    type: string = 'String';
    isRequired: boolean = true;
    isArray: boolean = false;
}

interface Nameable {
    name: string;
}

interface Intelligent {
    speak(): void;
}

interface Animal {
    breathe(): void;
}

class Human implements Intelligent, Animal, Nameable {
    constructor(public name: string) {
        this.name = name;
    }

    breathe(): void {
        console.log('hoohahooha');
    }

    speak(): void {
        console.log(`Hello! My name is ${this.name}`);
    }
}

class Dog implements Animal, Nameable {
    constructor(public name: string) {
        this.name = name;
    }

    breathe(): void {
        console.log('hoohahooha');
    }
}


describe("타입스크립트 문법 테스트", () => {
    test('verify 테스트', () => {
        const val: DefaultSettingValue = new DefaultSettingValue();
        console.log(val);
    });

    test('Interface 테스트', () => {
        const gombi = new Dog('Gombi');
        const rogee = new Human('RogeeOh');

        const animal: Animal = gombi;
        animal.breathe();
        const animal2: Animal = rogee;
        animal2.breathe();
        const namedDog: Nameable = gombi;
        const namedHuman: Nameable = rogee;
        console.log(namedDog.name);
        console.log(namedHuman.name);
    });
});
