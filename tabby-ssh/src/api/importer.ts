import { PartialProfile } from 'tabby-core'
import { SSHProfile } from './interfaces'

export abstract class SSHProfileImporter {
    abstract getProfiles (): Promise<PartialProfile<SSHProfile>[]>
}
