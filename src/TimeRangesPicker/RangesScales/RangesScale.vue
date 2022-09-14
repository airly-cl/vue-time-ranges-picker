<template>
  <!-- scales -->
  <g>
    <g
      v-for="range in ranges"
      :id="range.name"
      :key="range.name"
    >
      <path
        v-for="arc in range.arcs"
        :id="range.name"
        :key="arc.name"
        :style="{stroke: range.scaleColor}" 
        :d="`
          M${arc.start.x},${arc.start.y} 
          A${circleRadius},${circleRadius} 
          0 0 1 ${arc.end.x}, ${arc.end.y}`"
        :stroke-width="circleStrokeWidth"
        fill="transparent" 
      />
    </g>
  </g>
</template>

<script src="./RangesScale.js"></script>

