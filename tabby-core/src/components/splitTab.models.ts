import { BaseTabComponent, GetRecoveryTokenOptions } from './baseTab.component'
import { TabRecoveryService } from '../services/tabRecovery.service'
import { RecoveryToken,  } from '../api/tabRecovery'

export type SplitOrientation = 'v' | 'h'
export type SplitDirection = 'r' | 't' | 'b' | 'l'
export type ResizeDirection = 'v' | 'h' | 'dv' | 'dh'

export class SplitContainer {
    orientation: SplitOrientation = 'h'
    children: (BaseTabComponent | SplitContainer)[] = []
    ratios: number[] = []
    x = 0
    y = 0
    w = 0
    h = 0

    getAllTabs(): BaseTabComponent[] {
        let result: BaseTabComponent[] = []
        for (const child of this.children) {
            result = result.concat(
                child instanceof SplitContainer ? child.getAllTabs() : [child]
            )
        }
        return result
    }

    normalize(): void {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i]
            if (child instanceof SplitContainer) {
                child.normalize()
                if (child.children.length === 0) {
                    this.children.splice(i, 1)
                    this.ratios.splice(i, 1)
                    i--
                    continue
                } else if (child.children.length === 1) {
                    this.children[i] = child.children[0]
                } else if (child.orientation === this.orientation) {
                    const ratio = this.ratios[i]
                    this.children.splice(i, 1)
                    this.ratios.splice(i, 1)
                    for (let j = 0; j < child.children.length; j++) {
                        this.children.splice(i, 0, child.children[j])
                        this.ratios.splice(i, 0, child.ratios[j] * ratio)
                        i++
                    }
                }
            }
        }

        const total = this.ratios.reduce((acc, r) => acc + r, 0) || 1
        this.ratios = this.ratios.map(r => r / total)
    }

    equalize(): void {
        this.children.forEach(child => {
            if (child instanceof SplitContainer) {
                child.equalize()
            }
        })
        this.ratios.fill(1 / this.ratios.length)
    }

    async serialize(tabsRecovery: TabRecoveryService, options?: GetRecoveryTokenOptions): Promise<RecoveryToken> {
        const children = await Promise.all(this.children.map(async child => {
            return child instanceof SplitContainer
                ? child.serialize(tabsRecovery, options)
                : tabsRecovery.getFullRecoveryToken(child, options)
        }))

        return {
            type: 'app:split-tab',
            orientation: this.orientation,
            ratios: this.ratios,
            children,
        }
    }
}

export interface SplitSpannerInfo {
    container: SplitContainer
    index: number
}

export type SplitDropZoneInfo = {
    x: number
    y: number
    w: number
    h: number
} & (
    | {
        type: 'absolute'
        container: SplitContainer
        position: number
    }
    | {
        type: 'relative'
        relativeTo?: BaseTabComponent | SplitContainer
        side: SplitDirection
    }
)
