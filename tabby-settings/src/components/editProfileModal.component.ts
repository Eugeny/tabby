/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Observable, OperatorFunction, debounceTime, map, distinctUntilChanged } from 'rxjs'
import { Component, Input, ViewChild, ViewContainerRef, ComponentFactoryResolver, Injector } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, Profile, ProfileProvider, ProfileSettingsComponent } from 'tabby-core'

const iconsData = require('../../../tabby-core/src/icons.json')
const iconsClassList = Object.keys(iconsData).map(
    icon => iconsData[icon].map(
        style => `fa${style[0]} fa-${icon}`
    )
).flat()

/** @hidden */
@Component({
    template: require('./editProfileModal.component.pug'),
})
export class EditProfileModalComponent {
    @Input() profile: Profile
    @Input() profileProvider: ProfileProvider
    @Input() settingsComponent: new () => ProfileSettingsComponent
    groupNames: string[]
    @ViewChild('placeholder', { read: ViewContainerRef }) placeholder: ViewContainerRef

    private settingsComponentInstance: ProfileSettingsComponent

    constructor (
        private injector: Injector,
        private componentFactoryResolver: ComponentFactoryResolver,
        config: ConfigService,
        private modalInstance: NgbActiveModal,
    ) {
        this.groupNames = [...new Set(
            (config.store.profiles as Profile[])
                .map(x => x.group)
                .filter(x => !!x)
        )].sort() as string[]
    }

    ngAfterViewInit () {
        setTimeout(() => {
            const componentFactory = this.componentFactoryResolver.resolveComponentFactory(this.profileProvider.settingsComponent)
            const componentRef = componentFactory.create(this.injector)
            this.settingsComponentInstance = componentRef.instance
            this.settingsComponentInstance.profile = this.profile
            this.placeholder.insert(componentRef.hostView)
        })
    }

    groupTypeahead = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(q => this.groupNames.filter(x => !q || x.toLowerCase().includes(q.toLowerCase())))
        )

    iconSearch: OperatorFunction<string, string[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map(term => iconsClassList.filter(v => v.toLowerCase().includes(term.toLowerCase())).slice(0, 10))
        )

    save () {
        this.profile.group ||= undefined
        this.settingsComponentInstance.save?.()
        this.modalInstance.close(this.profile)
    }

    cancel () {
        this.modalInstance.dismiss()
    }
}
