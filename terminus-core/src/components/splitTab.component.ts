import { Subscription } from 'rxjs'
import { Component, ViewChild, ViewContainerRef, EmbeddedViewRef } from '@angular/core'
import { BaseTabComponent } from './baseTab.component'
import { TabsService } from '../services/tabs.service'
import { HotkeysService } from '../services/hotkeys.service'

export declare type SplitOrientation = 'v' | 'h'
export declare type SplitDirection = 'r' | 't' | 'b' | 'l'

export class SplitContainer {
    orientation: SplitOrientation = 'h'
    children: (BaseTabComponent | SplitContainer)[] = []
    ratios: number[] = []

    allTabs () {
        let r = []
        for (let child of this.children) {
            if (child instanceof SplitContainer) {
                r = r.concat(child.allTabs())
            } else {
                r.push(child)
            }
        }
        return r
    }

    normalize () {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i]

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
                    let ratio = this.ratios[i]
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

        let s = 0
        for (let x of this.ratios) {
            s += x
        }
        this.ratios = this.ratios.map(x => x / s)
    }
}

@Component({
    selector: 'splitTab',
    template: '<ng-container #vc></ng-container>',
    styles: [
        ':host { position: relative; flex: auto; display: block; }'
    ]
})
export class SplitTabComponent extends BaseTabComponent {
    root: SplitContainer
    viewRefs: Map<BaseTabComponent, EmbeddedViewRef<any>> = new Map()
    @ViewChild('vc', { read: ViewContainerRef }) viewContainer: ViewContainerRef
    hotkeysSubscription: Subscription
    focusedTab: BaseTabComponent

    constructor (
        protected hotkeys: HotkeysService,
        private tabsService: TabsService,
    ) {
        super()
        this.root = new SplitContainer()
        this.setTitle('')

        this.focused$.subscribe(() => {
            this.allTabs().forEach(x => x.emitFocused())
            this.focus(this.focusedTab)
        })
        this.blurred$.subscribe(() => this.allTabs().forEach(x => x.emitBlurred()))

        this.hotkeysSubscription = this.hotkeys.matchedHotkey.subscribe(hotkey => {
            if (!this.hasFocus) {
                return
            }
            switch (hotkey) {
            case 'split-right':
                this.splitTab(this.focusedTab, 'r')
                break
            case 'split-bottom':
                this.splitTab(this.focusedTab, 'b')
                break
            case 'split-top':
                this.splitTab(this.focusedTab, 't')
                break
            case 'split-left':
                this.splitTab(this.focusedTab, 'l')
                break
            case 'split-nav-left':
                this.navigate('l')
                break
            case 'split-nav-right':
                this.navigate('r')
                break
            case 'split-nav-up':
                this.navigate('t')
                break
            case 'split-nav-down':
                this.navigate('b')
                break
            }
        })
    }

    ngOnDestroy () {
        this.hotkeysSubscription.unsubscribe()
    }

    allTabs () {
        return [...this.root.allTabs()]
    }

    focus (tab: BaseTabComponent) {
        this.focusedTab = tab
        for (let x of this.allTabs()) {
            if (x !== tab) {
                x.emitBlurred()
            }
        }
        if (tab) {
            tab.emitFocused()
        }
        this.layout()
    }

    focusAnyIn (parent: BaseTabComponent | SplitContainer) {
        if (!parent) {
            return
        }
        if (parent instanceof SplitContainer) {
            this.focusAnyIn(parent.children[0])
        } else {
            this.focus(parent)
        }
    }

    insert (tab: BaseTabComponent, relative: BaseTabComponent, dir: SplitDirection) {
        let target = this.getParent(relative) || this.root
        let insertIndex = target.children.indexOf(relative)

        if (
            (target.orientation === 'v' && ['l', 'r'].includes(dir)) ||
            (target.orientation === 'h' && ['t', 'b'].includes(dir))
        ) {
            let newContainer = new SplitContainer()
            newContainer.orientation = (target.orientation === 'v') ? 'h' : 'v'
            newContainer.children = [relative]
            newContainer.ratios = [1]
            target.children[insertIndex] = newContainer
            target = newContainer
            insertIndex = 0
        }

        if (insertIndex === -1) {
            insertIndex = 0
        } else {
            insertIndex += (dir === 'l' || dir === 't') ? 0 : 1
        }

        for (let i = 0; i < target.children.length; i++) {
            target.ratios[i] *= target.children.length / (target.children.length + 1)
        }
        target.ratios.splice(insertIndex, 0, 1 / (target.children.length + 1))
        target.children.splice(insertIndex, 0, tab)

        let ref = this.viewContainer.insert(tab.hostView) as EmbeddedViewRef<any>
        this.viewRefs.set(tab, ref)

        ref.rootNodes[0].addEventListener('click', () => this.focus(tab))

        setImmediate(() => {
            this.layout()
            this.focus(tab)
        })

        tab.titleChange$.subscribe(t => this.setTitle(t))
        tab.activity$.subscribe(a => a ? this.displayActivity() : this.clearActivity())
        tab.progress$.subscribe(p => this.setProgress(p))
        if (tab.title) {
            this.setTitle(tab.title)
        }
    }

    navigate (dir: SplitDirection) {
        let rel: BaseTabComponent | SplitContainer = this.focusedTab
        let parent = this.getParent(rel)
        let orientation = ['l', 'r'].includes(dir) ? 'h' : 'v'

        while (parent !== this.root && parent.orientation !== orientation) {
            rel = parent
            parent = this.getParent(rel)
        }

        if (parent.orientation !== orientation) {
            return
        }

        let index = parent.children.indexOf(rel)
        if (['l', 't'].includes(dir)) {
            if (index > 0) {
                this.focusAnyIn(parent.children[index - 1])
            }
        } else {
            if (index < parent.children.length - 1) {
                this.focusAnyIn(parent.children[index + 1])
            }
        }
    }

    async splitTab (tab: BaseTabComponent, dir: SplitDirection) {
        let newTab = await this.tabsService.duplicate(tab)
        this.insert(newTab, tab, dir)
    }

    getParent (tab: BaseTabComponent | SplitContainer, root?: SplitContainer): SplitContainer {
        root = root || this.root
        for (let child of root.children) {
            if (child instanceof SplitContainer) {
                let r = this.getParent(tab, child)
                if (r) {
                    return r
                }
            }
            if (child === tab) {
                return root
            }
        }
        return null
    }

    async canClose (): Promise<boolean> {
        return !(await Promise.all(this.allTabs().map(x => x.canClose()))).some(x => !x)
    }

    private layout () {
        this.root.normalize()
        this.layoutInternal(this.root, 0, 0, 100, 100)
    }

    private layoutInternal (root: SplitContainer, x: number, y: number, w: number, h: number) {
        let size = (root.orientation === 'v') ? h : w
        let sizes = root.ratios.map(x => x * size)

        let offset = 0
        root.children.forEach((child, i) => {
            let childX = (root.orientation === 'v') ? x : (x + offset)
            let childY = (root.orientation === 'v') ? (y + offset) : y
            let childW = (root.orientation === 'v') ? w : sizes[i]
            let childH = (root.orientation === 'v') ? sizes[i] : h
            if (child instanceof SplitContainer) {
                this.layoutInternal(child, childX, childY, childW, childH)
            } else {
                let element = this.viewRefs.get(child).rootNodes[0]
                element.style.position = 'absolute'
                element.style.left = `${childX}%`
                element.style.top = `${childY}%`
                element.style.width = `${childW}%`
                element.style.height = `${childH}%`

                element.style.opacity = (child === this.focusedTab) ? 1 : 0.75
            }
            offset += sizes[i]
        })
    }
}
