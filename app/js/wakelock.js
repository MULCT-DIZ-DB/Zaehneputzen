// @ts-check
/**
 * Keeps the screen on while brushing. Uses the Screen Wake Lock API where it
 * works; otherwise a tiny muted inline video stream as a best-effort fallback.
 * For full reliability on iOS 16 set "Automatische Sperre" to at least 5 minutes.
 * @module wakelock
 */

/** Screen-on helper. */
export class ScreenKeeper {
  constructor() {
    /** @type {any} */ this.lock = null;
    /** @type {HTMLVideoElement|null} */ this.video = null;
    this.wanted = false;
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') this.enable();
    });
  }

  /**
   * Requests the screen to stay on. Call from a tap handler for the fallback to work.
   * @returns {Promise<void>}
   */
  async enable() {
    this.wanted = true;
    const nav = /** @type {any} */ (navigator);
    if (nav.wakeLock && typeof nav.wakeLock.request === 'function') {
      try {
        this.lock = await nav.wakeLock.request('screen');
        return;
      } catch {
        /* fall through to video */
      }
    }
    this.playVideo();
  }

  /**
   * Fallback: plays a 1×1 canvas stream in a muted inline video.
   * @returns {void}
   */
  playVideo() {
    try {
      if (!this.video) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const stream = /** @type {any} */ (canvas).captureStream ? /** @type {any} */ (canvas).captureStream(1) : null;
        if (!stream) return;
        const video = document.createElement('video');
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        video.className = 'keep-awake';
        video.srcObject = stream;
        document.body.append(video);
        this.video = video;
      }
      this.video.play().catch(() => {});
    } catch {
      this.video = null;
    }
  }

  /**
   * Lets the screen turn off again.
   * @returns {void}
   */
  disable() {
    this.wanted = false;
    if (this.lock) this.lock.release().catch(() => {});
    this.lock = null;
    if (this.video) this.video.pause();
  }
}
