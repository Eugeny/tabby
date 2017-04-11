import { Component } from '@angular/core'

export declare type ComponentType = new (...args: any[]) => Component

export abstract class SettingsTabProvider {
    title: string

    getComponentType (): ComponentType {
        return null
    }
}
