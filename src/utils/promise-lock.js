// Maintains a list of locks referenced by keys
export function createKeyedLock() {
    const locks = {};

    return function execute(id, fn) {
        let entry;
        if (locks[id]) {
            entry = locks[id];
        } else {
            entry = locks[id] = {
                pending: 0,
                lock: createSingleLock()
            };
        }

        entry.pending += 1;
        const decrementPending = () => {
            entry.pending -= 1;
            if (entry.pending === 0) {
                locks[id] = undefined;
            }
        };

        return entry.lock(fn)
            .then((r) => {
                decrementPending();
                return r;
            }, (err) => {
                decrementPending();
                throw err;
            })
    };
}

export function createSingleLock() {
    const queue = [];
    let locked = false;

    return function execute(fn) {
        return acquire()
            .then(fn)
            .then((r) => {
                release();
                return r;
            }, (err) => {
                release();
                throw err;
            })
    };

    function acquire() {
        if (locked) {
            return new Promise((resolve) => queue.push(resolve));
        } else {
            locked = true;
            return Promise.resolve();
        }
    }

    function release() {
        const next = queue.shift();
        if (next) {
            next();
        } else {
            locked = false;
        }
    }
}