'use strict';

const FiveSpot = { mixin: (x) => x };
const TenSpot = class {};

module.exports = [{
    method: 'x',
    place: 'x',
    example: {
        $requires: ['five-spot', 'ten-spot'],
        $literal: class extends FiveSpot.mixin(TenSpot) {}
    }
}];
