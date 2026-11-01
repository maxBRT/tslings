// What the watch mode reacts to, and the queue that delivers it one at a time.
/**
 * Events are handled one after the other: while an exercise is being checked,
 * new events wait in the queue (or are dropped, see `InputPause`).
 */
export class EventQueue {
    #items = [];
    #waiting;
    push(item) {
        const waiting = this.#waiting;
        if (waiting === undefined) {
            this.#items.push(item);
        }
        else {
            this.#waiting = undefined;
            waiting(item);
        }
    }
    next() {
        if (this.#items.length > 0) {
            const [item] = this.#items.splice(0, 1);
            if (item !== undefined)
                return Promise.resolve(item);
        }
        return new Promise((resolve) => {
            this.#waiting = resolve;
        });
    }
}
/**
 * Set while an exercise is being checked. Key presses and file changes that
 * happen meanwhile are ignored instead of queuing up reruns.
 */
export class InputPause {
    #paused = false;
    get paused() {
        return this.#paused;
    }
    async during(work) {
        this.#paused = true;
        try {
            return await work();
        }
        finally {
            this.#paused = false;
        }
    }
}
