import { Component } from '@angular/core'

export declare type ComponentType = new (...args: any[]) => Component

export abstract class SettingsTabProvider {
    id: string
    title: string

    getComponentType (): ComponentType {
        return null
    }
}
