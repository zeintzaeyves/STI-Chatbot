import { EventEmitter } from "events";

const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(50);

export default progressEmitter;
