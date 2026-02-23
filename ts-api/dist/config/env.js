"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
exports.ENV = {
    SERP_API_KEY: requireEnv("SERP_API_KEY"),
};
//# sourceMappingURL=env.js.map