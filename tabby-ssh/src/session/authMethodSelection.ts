export interface AuthenticationFailure {
    partialSuccess?: boolean
    remainingMethods: string[]
}

export interface AuthenticationPlan<T> {
    remainingMethods: T[]
    allowedMethods: string[]
}

export function selectNextAuthMethod<T> (
    remainingMethods: readonly T[],
    allowedMethods: readonly string[],
    getAuthType: (method: T) => string,
): T|undefined {
    return remainingMethods.find(method => allowedMethods.includes(getAuthType(method)))
}

export function updateAuthPlanAfterFailure<T> (
    remainingMethods: readonly T[],
    failure: AuthenticationFailure,
    getAuthType: (method: T) => string,
    createPartialSuccessFallback: (authType: string) => T|null,
): AuthenticationPlan<T> {
    const updatedRemainingMethods = [...remainingMethods]
    const updatedAllowedMethods = [...failure.remainingMethods]

    if (failure.partialSuccess) {
        for (const authType of updatedAllowedMethods) {
            if (!updatedRemainingMethods.some(method => getAuthType(method) === authType)) {
                const fallback = createPartialSuccessFallback(authType)
                if (fallback) {
                    updatedRemainingMethods.push(fallback)
                }
            }
        }
    }

    return {
        remainingMethods: updatedRemainingMethods,
        allowedMethods: updatedAllowedMethods,
    }
}
