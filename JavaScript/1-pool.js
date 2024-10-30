'use strict';

class Pool {
  #instances = [];
  #free = [];
  #queue = [];
  #current = 0;
  #size = 0;
  #available = 0;

  constructor(factory = null, size = 0) {
    this.#size = size;
    this.#available = size;
    this.#instances = new Array(size);
    this.#free = new Array(size).fill(true);
    for (let i = 0; i < size; i++) {
      this.#instances[i] = factory();
    }
  }

  async next() {
    console.log({ available: this.#available });
    if (this.#available === 0) {
      return new Promise((resolve) => {
        this.#queue.push(resolve);
      });
    }
    let instance = null;
    let free = false;
    do {
      instance = this.#instances[this.#current];
      free = this.#free[this.#current];
      this.#current++;
      if (this.#current === this.#size) this.#current = 0;
    } while (!instance || !free);
    return instance;
  }

  add(instance) {
    if (this.#instances.includes(instance)) {
      throw new Error('Pool: add duplicates');
    }
    this.#size++;
    this.#available++;
    this.#instances.push(instance);
    this.#free.push(true);
  }

  async getInstance() {
    const instance = await this.next();
    if (!instance) return null;
    const index = this.#instances.indexOf(instance);
    this.#free[index] = false;
    this.#available--;
    return instance;
  }

  release(instance) {
    const index = this.#instances.indexOf(instance);
    if (index < 0) throw new Error('Pool: release unexpected instance');
    if (this.#free[index]) throw new Error('Pool: release not captured');
    this.#free[index] = true;
    this.#available++;
    if (this.#queue.length > 0) {
      const resolve = this.#queue.shift();
      if (resolve) setTimeout(resolve, 0, instance);
    }
  }
}

class Connection {
  constructor(name) {
    this.name = name;
  }
}

const factory = (() => {
  let index = 0;
  return () => new Connection(`http://10.0.0.1/${index++}`);
})();

// Usage

const main = async () => {
  const pool = new Pool(factory, 10);
  const returning = [];

  setTimeout(() => {
    pool.release(returning[0]);
  }, 2000);

  setTimeout(() => {
    pool.release(returning[1]);
  }, 5000);

  for (let i = 0; i < 12; i++) {
    const instance = await pool.getInstance();
    console.log({ instance });
    if (i < 2) returning.push(instance);
  }
};

console.log('start');

main();
