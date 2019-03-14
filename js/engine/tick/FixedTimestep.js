import Timestep from './Timestep.js';

class FixedTimestep extends Timestep {
    constructor(canvas, tickLength = 1) {
        super(canvas);
        this.tickLength = tickLength;
        this.lastTick = 0;
        this.lastTFrame = 0;
    }

    start() {
        let diff = performance.now() - this.lastTFrame - this.tickLength;
        while (diff > this.tickLength) {
            this.lastTick += this.tickLength;
            diff -= this.tickLength;
        }
        super.start();
    }

    dispatch(tFrame) {
        this.lastTFrame = tFrame;
        let nextTick = this.lastTick + this.tickLength;
        let numTicks = 0;

        if (tFrame > nextTick) {
            let timeSinceTick = tFrame - this.lastTick;
            numTicks = Math.floor(timeSinceTick / this.tickLength);
        }

        super.dispatch(tFrame / 1000, numTicks);
    }

    queueUpdates(numTicks) {
        for (let i = 0; i < numTicks; i++) {
            let prev = this.lastTick;
            this.lastTick += this.tickLength;
            let dt = this.lastTick - prev;
            super.queueUpdates(this.lastTick, dt);
        }
    }
}

export default FixedTimestep;