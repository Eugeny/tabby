import { Component } from '@angular/core'

export declare type ComponentType = new (...args: any[]) => Component

export abstract class SettingsProvider {
    title: string

    getComponentType (): ComponentType {
        return null
    }
}
