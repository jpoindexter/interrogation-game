type CompletionStorage = Pick<Storage, 'setItem'>;

/** Remembering the introduction is optional; closing it must always work. */
export function finishOnboarding(
  onClose: () => void,
  getStorage: () => CompletionStorage = () => window.localStorage,
) {
  try {
    getStorage().setItem('onboardingComplete', 'true');
  } catch {
    // Restricted storage can make the introduction appear on a later visit.
  }
  onClose();
}
