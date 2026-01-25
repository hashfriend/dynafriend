import { atom } from 'nanostores'

export const HIDDEN_VALUE = '*****'

export const $isPrivate = atom(false)

export function togglePrivacy(): void {
  $isPrivate.set(!$isPrivate.get())
}
