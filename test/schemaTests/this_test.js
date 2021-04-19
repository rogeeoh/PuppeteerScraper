class Human {
    constructor(name) {
        this.name = name;
        this.think = this.think.bind(this);
    }

    think() {
        console.log(`${this.name} is thinking`);
    }

    methods() {
        return {think: this.think};
    }
}

const rogee = new Human('rogeeoh');
const {think} = rogee.methods();

think()