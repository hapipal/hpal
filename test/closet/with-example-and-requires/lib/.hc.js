'use strict';

const FiveSpot = { mixin: (x) => x };
const TenSpot = class {};

module.exports = {
    x: {
        method: 'x',
        example: {
            $requires: ['five-spot', 'ten-spot'],
            $literal: class extends FiveSpot.mixin(TenSpot) {}
        }
    }
};
