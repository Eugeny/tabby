declare var nodeRequire: any
interface IPromise {}

declare interface Window {
    require: any
    process: any
    __dirname: any
    __platform: any
}

declare var window: Window

declare interface Console {
    timeStamp(...args: any[])
}
