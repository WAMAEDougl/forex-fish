"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSub = void 0;
const common_1 = require("@nestjs/common");
let PubSub = class PubSub {
    constructor() {
        this.triggers = new Map();
    }
    publish(triggerName, payload) {
        const callbacks = this.triggers.get(triggerName);
        if (!callbacks)
            return false;
        callbacks.forEach(callback => callback(payload));
        return true;
    }
    asyncIterator(triggerName) {
        const callbacks = new Set();
        this.triggers.set(triggerName, callbacks);
        return {
            next: () => {
                return new Promise((resolve) => {
                    const callback = (data) => {
                        callbacks.delete(callback);
                        resolve({ done: false, value: data });
                    };
                    callbacks.add(callback);
                });
            },
        };
    }
};
exports.PubSub = PubSub;
exports.PubSub = PubSub = __decorate([
    (0, common_1.Injectable)()
], PubSub);
//# sourceMappingURL=pubsub.service.js.map