import { ref } from "vue";

const QWebChannelMessageTypes = {
    signal: 1,
    propertyUpdate: 2,
    init: 3,
    idle: 4,
    debug: 5,
    invokeMethod: 6,
    connectToSignal: 7,
    disconnectFromSignal: 8,
    setProperty: 9,
    response: 10,
};

class QWebChannel {
    transport: any;
    objects: any;
    execId: any;
    execCallbacks: any;
    _transportSend: any;
    constructor(transport: any, initCallback: any) {
        this.transport = transport;
        this._transportSend = transport.send.bind(transport);

        this.transport.onmessage = (message: any) => {
            const rawData = message.data;
            const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            switch (data.type) {
                case QWebChannelMessageTypes.signal:
                    this.handleSignal(data);
                    break;
                case QWebChannelMessageTypes.response:
                    this.handleResponse(data);
                    break;
                case QWebChannelMessageTypes.propertyUpdate:
                    this.handlePropertyUpdate(data);
                    break;
                default:
                    console.error("invalid message received:", message.data);
                    break;
            }
        };

        this.execCallbacks = {};
        this.execId = 0;

        this.objects = {};

        this.exec({ type: QWebChannelMessageTypes.init }, (data: any) => {
            for (let objectName in data) {
                let object = new QObject(objectName, data[objectName], this);
            }
            for (let objectName in this.objects) {
                this.objects[objectName].unwrapProperties();
            }
            if (initCallback) {
                initCallback(this);
            }
            this.exec({ type: QWebChannelMessageTypes.idle });
        });
    }
    exec(data: any, callback: any = null) {
        if (!callback) {
            // if no callback is given, send directly
            this.send(data);
            return;
        }
        if (this.execId >= Number.MAX_SAFE_INTEGER) {
            this.execId = 0;
        }
        if (data.hasOwnProperty("id")) {
            console.error("Cannot exec message with property id: " + JSON.stringify(data));
            return;
        }
        data.id = this.execId++;
        this.execCallbacks[data.id] = callback;
        this.send(data);
    }
    send(data: any) {
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        this._transportSend(data);
    }
    handleSignal(message: any) {
        let object = this.objects[message.object];
        if (object) {
            object.signalEmitted(message.signal, message.args);
        } else {
            console.warn("Unhandled signal: " + message.object + "::" + message.signal);
        }
    }

    handleResponse(message: any) {
        if (!Object.prototype.hasOwnProperty.call(message, "id")) {
            console.error("Invalid response message received: ", JSON.stringify(message));
            return;
        }
        const callback = this.execCallbacks[message.id];
        if (callback) {
            delete this.execCallbacks[message.id];
            callback(message.data);
        }
    }

    handlePropertyUpdate(message: any) {
        for (let i in message.data) {
            let data = message.data[i];
            let object = this.objects[data.object];
            if (object) {
                object.propertyUpdate(data.signals, data.properties);
            } else {
                console.warn("Unhandled property update: " + data.object + "::" + data.signal);
            }
        }
        this.exec({ type: QWebChannelMessageTypes.idle });
    }

    debug(message: any) {
        this.send({ type: QWebChannelMessageTypes.debug, data: message });
    }
}

class QObject {
    __id__: any;
    __objectSignals__: any;
    __propertyCache__: any;
    webChannel: any;
    constructor(name: any, data: any, webChannel: any) {
        this.__id__ = name;
        webChannel.objects[name] = this;
        this.webChannel = webChannel;
        // List of callbacks that get invoked upon signal emission
        this.__objectSignals__ = {};

        // Cache of all properties, updated when a notify signal is emitted
        this.__propertyCache__ = {};
        // ----------------------------------------------------------------------

        // ----------------------------------------------------------------------

        data.methods.forEach(this.addMethod.bind(this));

        data.properties.forEach(this.bindGetterSetter.bind(this));

        data.signals.forEach((signal: any) => {
            this.addSignal(signal, false);
        });

        for (let name in data.enums) {
            (this as any)[name] = data.enums[name];
        }
    }
    unwrapQObject(response: any) {
        if (response instanceof Array) {
            // support list of objects
            let ret = new Array(response.length);
            for (let i = 0; i < response.length; ++i) {
                ret[i] = this.unwrapQObject(response[i]);
            }
            return ret;
        }
        if (!response || !response["__QObject*__"] || response.id === undefined) {
            return response;
        }

        let objectId = response.id;
        if (this.webChannel.objects[objectId]) return this.webChannel.objects[objectId];

        if (!response.data) {
            console.error("Cannot unwrap unknown QObject " + objectId + " without data.");
            return;
        }

        let qObject: any = new QObject(objectId, response.data, this.webChannel);
        qObject.destroyed.connect(function () {
            if (qObject.webChannel.objects[objectId] === qObject) {
                delete qObject.webChannel.objects[objectId];
                // reset the now deleted QObject to an empty {} object
                // just assigning {} though would not have the desired effect, but the
                // below also ensures all external references will see the empty map
                // NOTE: this detour is necessary to workaround QTBUG-40021
                let propertyNames = [];
                for (let propertyName in qObject) {
                    propertyNames.push(propertyName);
                }
                for (let idx in propertyNames) {
                    delete qObject[propertyNames[idx]];
                }
            }
        });
        // here we are already initialized, and thus must directly unwrap the properties
        qObject.unwrapProperties();
        return qObject;
    }

    unwrapProperties() {
        for (let propertyIdx in this.__propertyCache__) {
            this.__propertyCache__[propertyIdx] = this.unwrapQObject(this.__propertyCache__[propertyIdx]);
        }
    }

    addSignal(signalData: any, isPropertyNotifySignal: any) {
        let signalName = signalData[0];
        let signalIndex = signalData[1];
        (this as any)[signalName] = {
            connect: (callback: any) => {
                if (typeof callback !== "function") {
                    console.error("Bad callback given to connect to signal " + signalName);
                    return;
                }

                this.__objectSignals__[signalIndex] = this.__objectSignals__[signalIndex] || [];
                this.__objectSignals__[signalIndex].push(callback);

                if (!isPropertyNotifySignal && signalName !== "destroyed") {
                    this.webChannel.exec({
                        type: QWebChannelMessageTypes.connectToSignal,
                        object: this.__id__,
                        signal: signalIndex,
                    });
                }
            },
            disconnect: (callback: any) => {
                if (typeof callback !== "function") {
                    console.error("Bad callback given to disconnect from signal " + signalName);
                    return;
                }
                this.__objectSignals__[signalIndex] = this.__objectSignals__[signalIndex] || [];
                let idx = this.__objectSignals__[signalIndex].indexOf(callback);
                if (idx === -1) {
                    console.error("Cannot find connection of signal " + signalName + " to " + callback.name);
                    return;
                }
                this.__objectSignals__[signalIndex].splice(idx, 1);
                if (!isPropertyNotifySignal && this.__objectSignals__[signalIndex].length === 0) {
                    this.webChannel.exec({
                        type: QWebChannelMessageTypes.disconnectFromSignal,
                        object: this.__id__,
                        signal: signalIndex,
                    });
                }
            },
        };
    }

    /**
     * Invokes all callbacks for the given signalname. Also works for property notify callbacks.
     */
    invokeSignalCallbacks(signalName: any, signalArgs: any) {
        let connections = this.__objectSignals__[signalName];
        if (connections) {
            connections.forEach(function (callback: any) {
                callback.apply(callback, signalArgs);
            });
        }
    }

    propertyUpdate(signals: any, propertyMap: any) {
        // update property cache
        for (let propertyIndex in propertyMap) {
            let propertyValue = propertyMap[propertyIndex];
            this.__propertyCache__[propertyIndex] = propertyValue;
        }

        for (let signalName in signals) {
            // Invoke all callbacks, as signalEmitted() does not. This ensures the
            // property cache is updated before the callbacks are invoked.
            this.invokeSignalCallbacks(signalName, signals[signalName]);
        }
    }

    signalEmitted(signalName: any, signalArgs: any) {
        this.invokeSignalCallbacks(signalName, signalArgs);
    }

    addMethod(methodData: any) {
        let methodName = methodData[0];
        let methodIdx = methodData[1];
        (this as any)[methodName] = function (this: any, ...args: any[]) {
            let callback: any;
            const methodArgs: any[] = [];
            for (let i = 0; i < args.length; ++i) {
                if (typeof args[i] === "function") callback = args[i];
                else methodArgs.push(args[i]);
            }

            this.webChannel.exec(
                {
                    type: QWebChannelMessageTypes.invokeMethod,
                    object: this.__id__,
                    method: methodIdx,
                    args: methodArgs,
                },
                (response: any) => {
                    if (response !== undefined) {
                        let result = this.unwrapQObject(response);
                        if (callback) {
                            callback(result);
                        }
                    }
                },
            );
        };
    }

    bindGetterSetter(propertyInfo: any) {
        let propertyIndex = propertyInfo[0];
        let propertyName = propertyInfo[1];
        let notifySignalData = propertyInfo[2];
        // initialize property cache with current value
        // NOTE: if this is an object, it is not directly unwrapped as it might
        // reference other QObject that we do not know yet
        this.__propertyCache__[propertyIndex] = propertyInfo[3];

        if (notifySignalData) {
            if (notifySignalData[0] === 1) {
                // signal name is optimized away, reconstruct the actual name
                notifySignalData[0] = propertyName + "Changed";
            }
            this.addSignal(notifySignalData, true);
        }

        Object.defineProperty(this, propertyName, {
            configurable: true,
            get: function () {
                let propertyValue = this.__propertyCache__[propertyIndex];
                if (propertyValue === undefined) {
                    // This shouldn't happen
                    console.warn('Undefined value in property cache for property "' + propertyName + '" in object ' + this.__id__);
                }

                return propertyValue;
            },
            set: function (value) {
                if (value === undefined) {
                    console.warn("Property setter for " + propertyName + " called with undefined value!");
                    return;
                }
                this.__propertyCache__[propertyIndex] = value;
                this.webChannel.exec({
                    type: QWebChannelMessageTypes.setProperty,
                    object: this.__id__,
                    property: propertyIndex,
                    value: value,
                });
            },
        });
    }
}
export class QtWebChannelStore {
    qtObject: any;
    x: any;
    y: any;
    flag: any;
    constructor(transport: any) {
        this.qtObject = ref();
        this.x = ref(0);
        this.y = ref(0);
        this.flag = ref(true);
        new QWebChannel(transport, (channel: any) => {
            this.qtObject.value = channel.objects.channelqtObject;
            this.qtObject.value.sigDidReceiveCoordinate.connect((xx: number, yy: number) => {
                this.x.value = Math.round(xx);
                this.y.value = Math.round(yy);
                this.flag.value = true;
            });
        });
    }

    setLocalCoordinate(x: number, y: number) {
        this.x.value = Math.round(x);
        this.y.value = Math.round(y);
    }

    setCoordinate(x: number, y: number): boolean {
        const target = this.qtObject.value;
        if (!target?.uDidReceiveCoordinate) return false;
        this.setLocalCoordinate(x, y);
        this.flag.value = false;
        target.uDidReceiveCoordinate(this.x.value, this.y.value);
        return true;
    }

    handleKeydown = (event: any) => {
        // 判断当前焦点是否是输入框
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");

        // 如果输入框获取了焦点或者没有返回值，直接返回
        if (isInputFocused || !this.flag.value) {
            return;
        }

        this.flag.value = false;
        switch (event.key) {
            case "ArrowUp":
                this.y.value -= 1;
                event.preventDefault();
                break;
            case "ArrowDown":
                this.y.value += 1;
                event.preventDefault();
                break;
            case "ArrowLeft":
                this.x.value -= 1;
                event.preventDefault();
                break;
            case "ArrowRight":
                this.x.value += 1;
                event.preventDefault();
                break;
        }
        if (!this.setCoordinate(this.x.value, this.y.value)) {
            this.flag.value = true;
        }
    };
}

/**
 * 仅在 Craft 嵌入式页面提供 Qt transport 时创建适配器。
 * 普通 StreamDock PI、浏览器调试页和 Node 后端会安全返回 null。
 */
export function createCraftQtChannel(): QtWebChannelStore | null {
    if (typeof window === "undefined") return null;
    const transport = (window as any).qt?.webChannelTransport;
    if (!transport?.send) return null;
    return new QtWebChannelStore(transport);
}
