import FixedTimestep from '../tick/FixedTimestep.js';
import SemiFixedTimestep from '../tick/SemiFixedTimestep.js';

class Engine {
    constructor(loop) {
        this.loop = loop;
        this.isInitialized = false;
        this.fps = 0;
        this.debug = false;
    }

    init() {
        this.canvas = document.getElementById('viewport');
        this.ctx = this.canvas.getContext('webgl', {antialias: true});
        this.tickHandler = new SemiFixedTimestep(this.canvas);

        document.addEventListener('visibilitychange', function (e) {
            if (document.hidden) this.tickHandler.start.bind(this.tickHandler);
            else this.tickHandler.stop.bind(this.tickHandler);
        }.bind(this));

        this.isInitialized = true;
    }

    update(time, dt) {
        let s = performance.now();
        this.loop(time, dt);
        let f = performance.now();
        this.fps = 1000 / (f - s);
    }

    start() {
        if (this.isInitialized) {
            this.tickHandler.add(this.update, this);
            this.tickHandler.start();
        }
    }

    stop() {
        if (this.tickHandler.isPlaying) {
            this.tickHandler.stop();
        }
    }
}

export default Engine;