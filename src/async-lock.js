// Simple async lock to prevent race conditions
export class AsyncLock {
    constructor() {
        this.locked = false;
        this.queue = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            const releaseFn = () => this.release();
            if (!this.locked) {
                this.locked = true;
                resolve(releaseFn);
            } else {
                this.queue.push(() => resolve(releaseFn));
            }
        });
    }

    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        } else {
            this.locked = false;
        }
    }
}
