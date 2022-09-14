<template>
  <g
    class="quarter-texts" 
  >
    <text
      v-for="quarterText in quarterTexts"
      :key="quarterText.name"
      :style="{
        transform: `translate(${quarterText.x}px, ${quarterText.y}px)`,
        fill: quarterTextColor
      }" 
      class="hour" 
      text-anchor="middle"
    >
      <tspan>{{ quarterText.name }}</tspan>
    </text>
  </g>
</template>

<script src="./QuartersText.js"></script>
<style scoped src="./QuartersText.css"></style>


