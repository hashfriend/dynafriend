import { atom } from 'nanostores'

export const $isPrivate = atom(false)

export function togglePrivacy(): void {
  $isPrivate.set(!$isPrivate.get())
}
