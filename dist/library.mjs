import addZero from 'add-zero';
import toTwelve from 'twentyfour-to-twelve';
import toTwentyFour from 'twelve-to-twentyfour';
import { openBlock, createElementBlock, Fragment, createCommentVNode, createElementVNode, renderList, normalizeStyle, toDisplayString, normalizeClass, pushScopeId, popScopeId, resolveComponent, createVNode, createBlock } from 'vue';

const CIRCLE_LENGTH = 360;
const HOURS_AMOUNT = 24;
const ONE_HOUR_DEGREE = CIRCLE_LENGTH / HOURS_AMOUNT;
const CIRCLE_RADIUS = CIRCLE_LENGTH / (2 * Math.PI);
const VIEW_BOX_SIZE = 180;

const DEFAULT_VIEW_OPTIONS = {
  isShowChosenTime: true,
  isShowQuartersText: true,
  isShowHoursMarks: true,
  chosenTimeColor: 'grey',
  pointerColor: 'white',
  activePointerColor: 'rgba(240, 240, 240, 0.9)',
  pointerRadius: 6,
  activePointerRadius: 5.5,
  circleStrokeWidth: 8,
  hoursMarksColor: 'grey',
  quarterTextColor: 'grey',
};

const EXTRA_POINTER_RADIUS = 70;
const STEP_OF_MOVING = 0.5;

const timeTextToNumber = (timeText, isTwelfthMode) => {
  let parsedTime = timeText;
  if (isTwelfthMode) {
    parsedTime = toTwentyFour(timeText);
  }
  const [hours, minutes] = parsedTime.split(':');
  return parseInt(hours, 10) + parseFloat(minutes / 60, 10);
};

const timeNumberToText = (timeNumber, isTwelfthMode) => {
  let hours = Math.floor(timeNumber);
  const remainder = timeNumber - hours;
  let minutes = remainder * 60;
  const twentyFourText = addZero(hours) + ':' + addZero(minutes);
  if (isTwelfthMode) {
    return toTwelve(twentyFourText);
  }
  return twentyFourText;
};

const getTimeByDegree = degree => {
  let time = (degree + 90) / ONE_HOUR_DEGREE;
  if (time >= HOURS_AMOUNT) {
    time = time - HOURS_AMOUNT;
  }
  return time;
};

const getTimeCoordinates = (time, radiusOffset = 0) => {
  // minus 90 because time starts at top of circle
  let degree = time * ONE_HOUR_DEGREE - 90;
  if (degree <= 0) {
    degree = 360 + degree;
  }
  const x =
    VIEW_BOX_SIZE / 2 + (CIRCLE_RADIUS + radiusOffset) * Math.cos((degree * Math.PI) / 180);
  const y =
    VIEW_BOX_SIZE / 2 + (CIRCLE_RADIUS + radiusOffset) * Math.sin((degree * Math.PI) / 180);
  return {
    degree,
    x,
    y,
  };
};

class MovePointer {
  constructor(pointData) {
    const { time, index, controller, coordinates } = pointData;
    this.name = 'point' + index;
    this.controller = controller;
    this.time = time;
    this.coordinates = coordinates;
    this.index = index;
    this.isActive = false;
  }

  startMove() {
    this.isActive = true;
  }

  completeMove() {
    this.isActive = false;
  }

  move(currentX, currentY) {
    if (this.isDisabled) {
      return;
    }

    const {
      centerX,
      centerY,
      zeroAngleX,
      zeroAngleY,
      vectorLength: basicVectorLength,
    } = this.controller.basicVector;

    const currentVector = [currentX - centerX, currentY - centerY];
    const scalarMultiple = zeroAngleX * currentVector[0] + zeroAngleY * currentVector[1];
    const currentVectorLength = Math.sqrt(currentVector[0] ** 2 + currentVector[1] ** 2);
    const angleInRadians = Math.acos(scalarMultiple / (basicVectorLength * currentVectorLength));
    let angleInDegrees = (angleInRadians * 180) / Math.PI;
    if (!angleInDegrees) {
      return;
    }
    if (currentY < centerY) {
      angleInDegrees = 360 - angleInDegrees;
    }
    this.controller.handlePointerMove(this, angleInDegrees);
  }

  setRef(ref) {
    this.ref = ref;
  }
}

class Range {
  constructor(args) {
    const { startMovePointer, endMovePointer, scaleColor } = args;
    const arcs = this.createArcs(startMovePointer, endMovePointer);
    this.name = startMovePointer.name + '-' + endMovePointer.name + '-range';
    this.startMovePointer = startMovePointer;
    this.endMovePointer = endMovePointer;
    this.scaleColor = scaleColor;
    this.arcs = arcs;
  }

  createArcs(startPointer, endPointer) {
    const startTime = startPointer.time;
    const endTime = endPointer.time;

    const arcs = [];
    let diff = endTime - startTime;
    if (diff < 0) {
      diff = HOURS_AMOUNT - -diff;
    }

    /**
     * we cant create arc with more than 180 degrees, so,
     * if wen need more than 180, we create two arcs
     */
    if (diff <= HOURS_AMOUNT / 2) {
      const start = startPointer.coordinates;
      const end = endPointer.coordinates;
      arcs.push({
        name: startTime + '-' + endTime + '-arc',
        start,
        end,
      });
    } else {
      let borderTime = startPointer.time + HOURS_AMOUNT / 2;
      if (borderTime > HOURS_AMOUNT) {
        borderTime = borderTime - HOURS_AMOUNT;
      }
      const borderTimeCoordinates = getTimeCoordinates(borderTime);

      const firstStart = startPointer.coordinates;
      const firstEnd = borderTimeCoordinates;
      const secondStart = borderTimeCoordinates;
      const secondEnd = endPointer.coordinates;
      arcs.push({ name: startPointer.name + '-arc', start: firstStart, end: firstEnd });
      arcs.push({ name: endPointer.name + '-arc', start: secondStart, end: secondEnd });
    }
    return arcs;
  }
}

class RangesController {
  constructor(rangesData, stepOfMoving) {
    this.stepOfMoving = stepOfMoving;

    const movePointers = rangesData.map((pointerData, index) => {
      const { startTime } = pointerData;
      return new MovePointer({
        time: startTime,
        index,
        controller: this,
        coordinates: getTimeCoordinates(startTime),
      });
    });
    this.movePointers = movePointers;

    this.ranges = rangesData.map(({ scaleColor }, index) => {
      const startMovePointer = movePointers[index];
      const endMovePointer = movePointers[index + 1] ? movePointers[index + 1] : movePointers[0];
      return new Range({
        startMovePointer,
        endMovePointer,
        scaleColor,
      });
    });
  }

  setStepOfMoving(stepValue) {
    this.stepOfMoving = stepValue;
  }

  setBasicVector(center) {
    const [centerX, centerY] = center;
    const basicVector = [CIRCLE_RADIUS, 0];

    const vectorLength = Math.sqrt(basicVector[0] ** 2 + basicVector[1] ** 2);
    this.basicVector = {
      centerX,
      centerY,
      zeroAngleX: basicVector[0],
      zeroAngleY: basicVector[1],
      vectorLength,
    };
  }

  getPointer(name) {
    const pointer = this.movePointers.find(pointer => {
      return pointer.name === name;
    });
    return pointer;
  }

  getActiveMovePointers() {
    const pointers = this.movePointers.filter(pointer => pointer.isActive === true);
    return pointers;
  }

  handlePointerMove(pointer, degree) {
    const { coordinates, time } = this.getNewPointerData(degree);
    const rangeWithStartPointer = this.ranges.find(r => r.startMovePointer.name === pointer.name);
    const rangeWithEndPointer = this.ranges.find(r => r.endMovePointer.name === pointer.name);

    const isMovingAllowed = this.movePointers > 2 ? this.checkIfMovingAllowed(
      time,
      rangeWithEndPointer.startMovePointer.time,
      rangeWithStartPointer.endMovePointer.time,
    ) : true;
    if (!isMovingAllowed) {
      return;
    }

    pointer.coordinates = coordinates;
    pointer.time = time;

    rangeWithStartPointer.arcs = rangeWithStartPointer.createArcs(
      pointer,
      rangeWithStartPointer.endMovePointer,
    );
    rangeWithEndPointer.arcs = rangeWithEndPointer.createArcs(
      rangeWithEndPointer.startMovePointer,
      pointer,
    );
  }

  completeMove() {
    const pointers = this.getActiveMovePointers();
    pointers.forEach(pointer => {
      pointer.completeMove();
    });
  }

  getNewPointerData(degree) {
    let newDegree;
    const { stepOfMoving } = this;

    const stepDegree = ONE_HOUR_DEGREE * stepOfMoving;
    const halfStepDegree = stepDegree / 2;
    const remainder = degree % stepDegree;
    const floor = degree - remainder;
    if (remainder > halfStepDegree) {
      newDegree = floor + stepDegree;
    } else {
      newDegree = floor;
    }

    const newTime = getTimeByDegree(newDegree);
    const newCoordinates = getTimeCoordinates(newTime);
    return {
      coordinates: newCoordinates,
      time: newTime,
    };
  }

  checkIfMovingAllowed(movingTime, backBorderTime, forwardBorderTime) {
    if (forwardBorderTime >= backBorderTime) {
      if (movingTime <= backBorderTime || movingTime >= forwardBorderTime) {
        return false;
      }
    } else {
      if (movingTime >= forwardBorderTime && movingTime <= backBorderTime) {
        return false;
      }
    }

    return true;
  }
}

var script$4 = {
  name: 'RangesScales',
  props: {
    ranges: {
      type: Array,
      required: true,
    },
    circleStrokeWidth: {
      type: Number,
      required: true,
    },
  },

  data() {
    return {
      circleRadius: CIRCLE_RADIUS,
    };
  },
};

const _hoisted_1$4 = ["id"];
const _hoisted_2$3 = ["id", "d", "stroke-width"];

function render$4(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock(Fragment, null, [
    createCommentVNode(" scales "),
    createElementVNode("g", null, [
      (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.ranges, (range) => {
        return (openBlock(), createElementBlock("g", {
          key: range.name,
          id: range.name
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(range.arcs, (arc) => {
            return (openBlock(), createElementBlock("path", {
              key: arc.name,
              id: range.name,
              style: normalizeStyle({stroke: range.scaleColor}),
              d: `
          M${arc.start.x},${arc.start.y} 
          A${_ctx.circleRadius},${_ctx.circleRadius} 
          0 0 1 ${arc.end.x}, ${arc.end.y}`,
              "stroke-width": _ctx.circleStrokeWidth,
              fill: "transparent"
            }, null, 12 /* STYLE, PROPS */, _hoisted_2$3))
          }), 128 /* KEYED_FRAGMENT */))
        ], 8 /* PROPS */, _hoisted_1$4))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ], 2112 /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */))
}

script$4.render = render$4;
script$4.__file = "src/TimeRangesPicker/RangesScales/index.vue";

var script$3 = {
  name: 'HoursMarks',
  props: {
    hoursMarksColor: {
      type: String,
      required: true,
    },
  },

  data() {
    const marks = [];
    for (let i = 0; i < HOURS_AMOUNT; i++) {
      marks.push({ index: i + 1 });
    }

    return {
      marks,
      circleRadius: CIRCLE_RADIUS,
      viewBoxSize: VIEW_BOX_SIZE,
      oneHourDegree: ONE_HOUR_DEGREE,
    };
  },
};

const _hoisted_1$3 = { class: "marks" };
const _hoisted_2$2 = ["cy"];

function render$3(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("g", _hoisted_1$3, [
    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.marks, (mark) => {
      return (openBlock(), createElementBlock("circle", {
        key: mark.name,
        style: normalizeStyle({
        fill: _ctx.hoursMarksColor,
        transform: `translate(${_ctx.viewBoxSize/2}px, ${_ctx.viewBoxSize/2}px) rotate(${mark.index * _ctx.oneHourDegree}deg)`
      }),
        cy: _ctx.circleRadius + 9,
        cx: "0",
        r: "1.5"
      }, null, 12 /* STYLE, PROPS */, _hoisted_2$2))
    }), 128 /* KEYED_FRAGMENT */))
  ]))
}

script$3.render = render$3;
script$3.__file = "src/TimeRangesPicker/HoursMarks/index.vue";

var script$2 = {
  name: 'QuartersTexts',
  props: {
    isTwelfthMode: {
      type: Boolean,
      default: () => false,
    },
    quarterTextColor: {
      type: String,
      required: true,
    },
  },

  data() {
    const offsetRadius = -15;
    return {
      viewBoxSize: VIEW_BOX_SIZE,
      offsetRadius,
    };
  },

  computed: {
    quarterTexts() {
      const { offsetRadius } = this;
      let quarterTexts = [
        {
          name: '06:00',
          ...getTimeCoordinates(6, offsetRadius),
        },
        {
          name: '12:00',
          ...getTimeCoordinates(12, offsetRadius),
        },
        {
          name: '18:00',
          ...getTimeCoordinates(18, offsetRadius),
        },
        {
          name: '00:00',
          ...getTimeCoordinates(0, offsetRadius),
        },
      ];
      if (this.isTwelfthMode) {
        quarterTexts = [
          {
            name: '6 AM',
            ...getTimeCoordinates(6, offsetRadius),
          },
          {
            name: '12 PM',
            ...getTimeCoordinates(12, offsetRadius),
          },
          {
            name: '6PM',
            ...getTimeCoordinates(18, offsetRadius),
          },
          {
            name: '12 AM',
            ...getTimeCoordinates(0, offsetRadius),
          },
        ];
      }
      return quarterTexts;
    },
  },
};

const _hoisted_1$2 = { class: "quarter-texts" };

function render$2(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("g", _hoisted_1$2, [
    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.quarterTexts, (quarterText) => {
      return (openBlock(), createElementBlock("text", {
        key: quarterText.name,
        style: normalizeStyle({
        transform: `translate(${quarterText.x}px, ${quarterText.y}px)`,
        fill: _ctx.quarterTextColor
      }),
        class: "hour",
        "text-anchor": "middle"
      }, [
        createElementVNode("tspan", null, toDisplayString(quarterText.name), 1 /* TEXT */)
      ], 4 /* STYLE */))
    }), 128 /* KEYED_FRAGMENT */))
  ]))
}

script$2.render = render$2;
script$2.__scopeId = "data-v-69d7d35d";
script$2.__file = "src/TimeRangesPicker/QuartersTexts/index.vue";

var script$1 = {
  name: 'ChosenTimePointers',

  props: {
    isTwelfthMode: {
      type: Boolean,
      default: () => false,
    },
    movePointers: {
      type: Array,
      required: true,
    },
    chosenTimeColor: {
      type: String,
      required: true,
    },
    pointerColor: {
      type: String,
      required: true,
    },
    activePointerColor: {
      type: String,
      required: true,
    },
    pointerRadius: {
      type: Number,
      required: true,
    },
    activePointerRadius: {
      type: Number,
      required: true,
    },
    isShowChosenTime: {
      type: Boolean,
      required: true,
    },
  },

  data() {
    return {
      circleRadius: CIRCLE_RADIUS,
      viewBoxSize: VIEW_BOX_SIZE,
      oneHourDegree: ONE_HOUR_DEGREE,
      movePointersLength: 0,
    };
  },

  beforeUpdate() {
    if (this.movePointers.length !== this.movePointersLength) {
      this.updateAbsoluteCoordinates();
    }
  },

  mounted() {
    this.updateAbsoluteCoordinates();
  },

  methods: {
    timeNumberToText,

    handleStartMove(e) {
      this.$emit('startMove', e);
    },

    transformStyle(deg) {
      let style = `rotate(${-deg} 0 0)`;
      return style;
    },

    updateAbsoluteCoordinates() {
      for (let i = 0; i < this.movePointers.length; i++) {
        this.movePointersLength = this.movePointers.length;
        const movePointer = this.movePointers[i];
        const refName = Object.keys(this.$refs).find(refName => {
          if (refName === movePointer.name) {
            return true;
          }
        });
        if (!refName) {
          continue;
        }
        const ref = this.$refs[refName][0];
        movePointer.setRef(ref);
      }
    },
  },
};

const _withScopeId = n => (pushScopeId("data-v-3ca499ed"),n=n(),popScopeId(),n);
const _hoisted_1$1 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/createElementVNode("filter", {
  id: "dropshadow",
  height: "130%"
}, [
  /*#__PURE__*/createElementVNode("feGaussianBlur", {
    in: "SourceAlpha",
    stdDeviation: "0.49"
  }),
  /*#__PURE__*/createCommentVNode(" stdDeviation is how much to blur "),
  /*#__PURE__*/createElementVNode("feOffset", {
    dx: "0",
    dy: "0",
    result: "offsetblur"
  }),
  /*#__PURE__*/createCommentVNode(" how much to offset "),
  /*#__PURE__*/createElementVNode("feComponentTransfer", null, [
    /*#__PURE__*/createElementVNode("feFuncA", {
      type: "linear",
      slope: "0.35"
    }),
    /*#__PURE__*/createCommentVNode(" slope is the opacity of the shadow ")
  ]),
  /*#__PURE__*/createElementVNode("feMerge", null, [
    /*#__PURE__*/createElementVNode("feMergeNode"),
    /*#__PURE__*/createCommentVNode(" this contains the offset blurred image "),
    /*#__PURE__*/createElementVNode("feMergeNode", { in: "SourceGraphic" }),
    /*#__PURE__*/createCommentVNode(" this contains the element that the filter is applied to ")
  ])
], -1 /* HOISTED */));
const _hoisted_2$1 = { key: 0 };
const _hoisted_3$1 = ["transform"];
const _hoisted_4 = ["id", "cx", "r"];

function render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("g", {
    style: normalizeStyle({
      transform: `translate(${_ctx.viewBoxSize/2}px, ${_ctx.viewBoxSize/2}px)`
    }),
    class: "time-points"
  }, [
    _hoisted_1$1,
    createElementVNode("g", null, [
      (_ctx.isShowChosenTime)
        ? (openBlock(), createElementBlock("g", _hoisted_2$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.movePointers, (pointer) => {
              return (openBlock(), createElementBlock("g", {
                key: pointer.name + '-text',
                style: normalizeStyle({
            transform: `rotate(${pointer.coordinates.degree}deg) translate(${_ctx.circleRadius + 12}px, 0px )`,
            'transform-origin': '-7.8% -0.5%',
          })
              }, [
                createElementVNode("text", {
                  style: normalizeStyle({
              'transform-origin': '0 -0.5%',
              fill: _ctx.chosenTimeColor
            }),
                  transform: _ctx.transformStyle(pointer.coordinates.degree),
                  class: "chosen-time"
                }, toDisplayString(_ctx.timeNumberToText(pointer.time, _ctx.isTwelfthMode)), 13 /* TEXT, STYLE, PROPS */, _hoisted_3$1)
              ], 4 /* STYLE */))
            }), 128 /* KEYED_FRAGMENT */))
          ]))
        : createCommentVNode("v-if", true),
      (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.movePointers, (pointer) => {
        return (openBlock(), createElementBlock("circle", {
          ref_for: true,
          ref: pointer.name,
          key: pointer.name,
          id: pointer.name,
          cx: _ctx.circleRadius,
          class: normalizeClass({
          'time-pointer': true,
          'time-pointer_active': pointer.isActive
        }),
          style: normalizeStyle({
          transform: `rotate(${pointer.coordinates.degree}deg)`,
          fill: pointer.isActive ? _ctx.activePointerColor : _ctx.pointerColor
        }),
          r: pointer.isActive ? _ctx.activePointerRadius : _ctx.pointerRadius,
          cy: "0",
          filter: "url(#dropshadow)",
          onPointerdown: _cache[0] || (_cache[0] = (...args) => (_ctx.handleStartMove && _ctx.handleStartMove(...args)))
        }, null, 46 /* CLASS, STYLE, PROPS, HYDRATE_EVENTS */, _hoisted_4))
      }), 128 /* KEYED_FRAGMENT */))
    ])
  ], 4 /* STYLE */))
}

script$1.render = render$1;
script$1.__scopeId = "data-v-3ca499ed";
script$1.__file = "src/TimeRangesPicker/ChosenTimePointers/index.vue";

var script = {
  name: 'TimeRangesPicker',

  components: {
    RangesScales: script$4,
    HoursMarks: script$3,
    QuartersTexts: script$2,
    ChosenTimePointers: script$1,
  },

  props: {
    value: {
      type: Array,
      default: () => { },
    },
    isTwelfthMode: {
      type: Boolean,
      default: () => false,
    },
    stepOfMoving: {
      type: Number,
      default: () => STEP_OF_MOVING,
    },
    extraPointerRadius: {
      type: Number,
      default: () => EXTRA_POINTER_RADIUS,
    },
    viewOptions: {
      type: Object,
      default: () => DEFAULT_VIEW_OPTIONS,
    },
  },

  data() {
    const viewBoxSize = VIEW_BOX_SIZE;
    return {
      viewBoxSize,
      innerValue: [],
      rangesController: null,
      ranges: [],
      movePointers: [],
    };
  },

  computed: {
    combinedViewOptions() {
      return {
        ...DEFAULT_VIEW_OPTIONS,
        ...this.viewOptions,
      };
    },
  },

  created() {
    this.getInfoFromValue(this.value);
  },

  watch: {
    value: {
      handler(newValue) {
        this.getInfoFromValue(newValue);
      },
    },
    stepOfMoving(newValue) {
      this.rangesController.setStepOfMoving(newValue);
    },
  },

  methods: {
    timeNumberToText,

    getInfoFromValue(newValue) {
      const { isTwelfthMode, stepOfMoving } = this;
      const innerValue = newValue.map(range => {
        return {
          ...range,
          startTime: timeTextToNumber(range.startTime, isTwelfthMode),
          endTime: timeTextToNumber(range.endTime, isTwelfthMode),
        };
      });
      const rangesController = new RangesController(innerValue, stepOfMoving);

      this.innerValue = innerValue;
      this.rangesController = rangesController;
      this.ranges = rangesController.ranges;

      const newMovePointers = rangesController.movePointers;
      if (this.movePointers && this.movePointers.length == newMovePointers.length) {
        newMovePointers.map(newMovePointer => {
          const oldMovePointer = this.movePointers.find(movePointer => {
            if (movePointer.name === newMovePointer.name) {
              return true;
            }
          });
          newMovePointer.setRef(oldMovePointer.ref);
        });
        return (this.movePointers = newMovePointers);
      }

      this.movePointers = rangesController.movePointers;
    },

    handleStartMove(e) {
      const activePointName = e.target.id;
      let pointer = this.rangesController.getPointer(activePointName);
      if (!pointer) {
        pointer = this.tryToFindPointerNear(e);
      }
      if (!pointer) {
        return;
      }
      const inputCenterElement = this.$refs['input-center'];
      const { x: centerX, y: centerY } = inputCenterElement.getBoundingClientRect();
      this.rangesController.setBasicVector([centerX, centerY]);

      pointer.startMove();
    },

    handleMove(e) {
      const activeMovePointers = this.rangesController.getActiveMovePointers();
      if (!activeMovePointers.length) {
        return;
      }
      const currentX = e.clientX;
      const currentY = e.clientY;
      for (let i = 0; i < activeMovePointers.length; i++) {
        const pointer = activeMovePointers[i];
        pointer.move(currentX, currentY);
      }
    },

    handleEndMove() {
      const activeMovePointers = this.rangesController.getActiveMovePointers();
      if (!activeMovePointers.length) {
        return;
      }
      this.rangesController.completeMove();
      const ranges = this.rangesController.ranges;
      const { isTwelfthMode } = this;
      const rangesData = ranges.map(range => {
        return {
          startTime: timeNumberToText(range.startMovePointer.time, isTwelfthMode),
          endTime: timeNumberToText(range.endMovePointer.time, isTwelfthMode),
        };
      });
      this.$emit('change', rangesData);
    },

    tryToFindPointerNear(e) {
      const { clientX, clientY } = e;
      const { movePointers } = this;
      let nearPointersData = movePointers
        .map(pointer => {
          const { ref } = pointer;

          const rect = ref.getBoundingClientRect();
          const { x: pointerX, y: pointerY } = rect;
          return {
            pointer,
            distance: Math.abs(clientX - pointerX) + Math.abs(clientY - pointerY),
          };
        })
        .filter(({ distance }) => {
          if (distance < this.extraPointerRadius) {
            return true;
          }
        });

      if (!nearPointersData.length) {
        return;
      }

      let nearestPointerData = nearPointersData.sort((a, b) => {
        return a.distance - b.distance;
      })[0];

      return nearestPointerData.pointer;
    },
  },
};

const _hoisted_1 = { class: "range-picker-container" };
const _hoisted_2 = ["viewBox"];
const _hoisted_3 = ["cx", "cy"];

function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_RangesScales = resolveComponent("RangesScales");
  const _component_HoursMarks = resolveComponent("HoursMarks");
  const _component_QuartersTexts = resolveComponent("QuartersTexts");
  const _component_ChosenTimePointers = resolveComponent("ChosenTimePointers");

  return (openBlock(), createElementBlock("div", _hoisted_1, [
    (openBlock(), createElementBlock("svg", {
      ref: "input-viewbox",
      viewBox: `0 0 ${_ctx.viewBoxSize} ${_ctx.viewBoxSize}`,
      class: "circular-chart",
      "touch-action": "none",
      onPointerdown: _cache[0] || (_cache[0] = (...args) => (_ctx.handleStartMove && _ctx.handleStartMove(...args))),
      onPointermove: _cache[1] || (_cache[1] = (...args) => (_ctx.handleMove && _ctx.handleMove(...args))),
      onPointerup: _cache[2] || (_cache[2] = (...args) => (_ctx.handleEndMove && _ctx.handleEndMove(...args))),
      onMouseleave: _cache[3] || (_cache[3] = (...args) => (_ctx.handleEndMove && _ctx.handleEndMove(...args))),
      onMouseup: _cache[4] || (_cache[4] = (...args) => (_ctx.handleEndMove && _ctx.handleEndMove(...args)))
    }, [
      createCommentVNode(" group with set of svg-paths drawing arcs "),
      createVNode(_component_RangesScales, {
        ranges: _ctx.ranges,
        circleStrokeWidth: _ctx.combinedViewOptions.circleStrokeWidth
      }, null, 8 /* PROPS */, ["ranges", "circleStrokeWidth"]),
      createCommentVNode(" hours marks around circle "),
      (_ctx.combinedViewOptions.isShowHoursMarks)
        ? (openBlock(), createBlock(_component_HoursMarks, {
            key: 0,
            hoursMarksColor: _ctx.combinedViewOptions.hoursMarksColor
          }, null, 8 /* PROPS */, ["hoursMarksColor"]))
        : createCommentVNode("v-if", true),
      createCommentVNode(" quarter hours labels inside circle "),
      (_ctx.combinedViewOptions.isShowQuartersText)
        ? (openBlock(), createBlock(_component_QuartersTexts, {
            key: 1,
            isTwelfthMode: _ctx.isTwelfthMode,
            quarterTextColor: _ctx.combinedViewOptions.quarterTextColor
          }, null, 8 /* PROPS */, ["isTwelfthMode", "quarterTextColor"]))
        : createCommentVNode("v-if", true),
      createCommentVNode(" buttons on circle to change ranges "),
      createVNode(_component_ChosenTimePointers, {
        isTwelfthMode: _ctx.isTwelfthMode,
        movePointers: _ctx.movePointers,
        chosenTimeColor: _ctx.combinedViewOptions.chosenTimeColor,
        pointerColor: _ctx.combinedViewOptions.pointerColor,
        activePointerColor: _ctx.combinedViewOptions.activePointerColor,
        pointerRadius: _ctx.combinedViewOptions.pointerRadius,
        activePointerRadius: _ctx.combinedViewOptions.activePointerRadius,
        isShowChosenTime: _ctx.combinedViewOptions.isShowChosenTime,
        onStartMove: _ctx.handleStartMove
      }, null, 8 /* PROPS */, ["isTwelfthMode", "movePointers", "chosenTimeColor", "pointerColor", "activePointerColor", "pointerRadius", "activePointerRadius", "isShowChosenTime", "onStartMove"]),
      createCommentVNode(" invisible element for moving angle detecting "),
      createElementVNode("circle", {
        ref: "input-center",
        cx: _ctx.viewBoxSize/2,
        cy: _ctx.viewBoxSize/2,
        r: "0"
      }, null, 8 /* PROPS */, _hoisted_3)
    ], 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_2))
  ]))
}

script.render = render;
script.__scopeId = "data-v-3e499e26";
script.__file = "src/TimeRangesPicker/index.vue";

var components = { TimeRangesPicker: script };

const plugin = {
  install (Vue) {
    for (const prop in components) {
      if (components.hasOwnProperty(prop)) {
        const component = components[prop];
        Vue.component(component.name, component);
      }
    }
  }
};

export { plugin as default };
